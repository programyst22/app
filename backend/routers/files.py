from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, Response
from fastapi.responses import RedirectResponse

from core import (db, iso, uid, require_roles, get_current_user, log_activity, notify, find_list, get_or_404, project_for_user,
                  get_object, signed_url, verify_file_token, is_staff, STAFF, MANAGEMENT, DOC_CATEGORIES)
from routers.crm import store_upload, ALLOWED_MEDIA

router = APIRouter(tags=["files"])
MEDIA_LIBRARY_TYPES = ALLOWED_MEDIA | {"model/gltf-binary", "model/gltf+json", "application/octet-stream"}


async def _file_allowed(f: dict, user: Optional[dict]) -> bool:
    if user and is_staff(user):
        return True
    if not user:
        return f.get("public") is True
    if f.get("owner_id") == user["id"]:
        return True
    if f.get("project_id"):
        p = await db.projects.find_one({"id": f["project_id"]}, {"_id": 0})
        return bool(p and p.get("customer_id") == user.get("customer_id") and f.get("client_visible", True))
    return f.get("customer_id") == user.get("customer_id")


@router.get("/files/{fid}")
async def download(fid: str, request: Request, ft: Optional[str] = None):
    f = await db.files.find_one({"id": fid, "deleted_at": None}, {"_id": 0})
    if not f:
        raise HTTPException(404, "Datei nicht gefunden")
    if ft and verify_file_token(ft) == fid:
        pass
    else:
        try:
            user = await get_current_user(request)
        except HTTPException:
            user = None
        if not await _file_allowed(f, user):
            raise HTTPException(403, "Kein Zugriff")
    if f.get("external_url"):
        return RedirectResponse(f["external_url"])
    content, ctype = await get_object(f["storage_path"])
    return Response(content=content, media_type=f.get("content_type") or ctype, headers={"Cache-Control": "private, max-age=3600", "Content-Disposition": f"inline; filename=\"{f.get('filename','file')}\""})


@router.get("/files/{fid}/signed")
async def signed(fid: str, user=Depends(get_current_user)):
    f = await db.files.find_one({"id": fid, "deleted_at": None}, {"_id": 0})
    if not f or not await _file_allowed(f, user):
        raise HTTPException(403, "Kein Zugriff")
    return {"url": signed_url(fid), "expires_in": 1800}


# ---------------- documents ----------------
@router.get("/projects/{pid}/documents")
async def list_documents(pid: str, category: Optional[str] = None, user=Depends(get_current_user)):
    await project_for_user(pid, user)
    q = {"project_id": pid, "kind": "document", "deleted_at": None}
    if not is_staff(user):
        q["client_visible"] = True
    if category:
        q["category"] = category
    docs = await find_list("files", q)
    for d in docs:
        d["url"] = signed_url(d["id"])
    return docs


@router.post("/projects/{pid}/documents", status_code=201)
async def upload_document(pid: str, file: UploadFile = File(...), category: str = Form("Sonstiges"), title: str = Form(""), client_visible: str = Form("true"),
                          zone_id: str = Form(""), user=Depends(get_current_user)):
    p = await project_for_user(pid, user)
    if category not in DOC_CATEGORIES:
        raise HTTPException(422, "Ungültige Kategorie")
    if file.content_type not in MEDIA_LIBRARY_TYPES:
        raise HTTPException(422, "Dateityp nicht erlaubt")
    doc = await store_upload(file, user["id"], f"projects/{pid}/documents", {"kind": "document", "project_id": pid, "customer_id": p["customer_id"], "category": category,
                                                                                "title": title or file.filename, "client_visible": client_visible == "true" or not is_staff(user), "zone_id": zone_id or None})
    doc["url"] = signed_url(doc["id"])
    await log_activity(user, "DOCUMENT_UPLOADED", "document", doc["id"], new={"project_id": pid, "category": category})
    if is_staff(user) and doc["client_visible"]:
        cids = [u["id"] async for u in db.users.find({"customer_id": p["customer_id"]}, {"_id": 0, "id": 1})]
        await notify(cids, "Neues Dokument verfügbar", f"{category}: {doc['title']}", f"/client/project/{pid}", "document", email=True)
    return doc


@router.delete("/files/{fid}")
async def delete_file(fid: str, user=Depends(require_roles(*MANAGEMENT))):
    f = await get_or_404("files", fid)
    if f.get("kind") == "library":
        used = await db.cms.count_documents({"$or": [{"cover_id": fid}, {"photo_ids": fid}]})
        if used:
            raise HTTPException(409, "Datei wird noch verwendet")
    await db.files.update_one({"id": fid}, {"$set": {"deleted_at": iso(), "deleted_by": user["id"]}})
    await log_activity(user, "FILE_DELETED", "file", fid, old={"filename": f.get("filename"), "kind": f.get("kind")})
    return {"ok": True}


# ---------------- media library ----------------
@router.get("/media")
async def list_library(q: Optional[str] = None, type: Optional[str] = None, user=Depends(require_roles(*STAFF))):
    query = {"deleted_at": None, "kind": {"$in": ["library", "media", "document", "model", "lead_attachment"]}}
    if type:
        query["content_type"] = {"$regex": f"^{type}"}
    if q:
        query["$or"] = [{"filename": {"$regex": q, "$options": "i"}}, {"title": {"$regex": q, "$options": "i"}}, {"category": {"$regex": q, "$options": "i"}}]
    items = await find_list("files", query, limit=300)
    for i in items:
        i["url"] = signed_url(i["id"])
    return items


@router.post("/media", status_code=201)
async def upload_library(files: List[UploadFile] = File(...), category: str = Form("Allgemein"), public: str = Form("false"), user=Depends(require_roles(*STAFF))):
    out = []
    for f in files:
        name = (f.filename or "").lower()
        ctype = f.content_type
        if name.endswith(".glb"):
            ctype = "model/gltf-binary"
        elif name.endswith(".gltf"):
            ctype = "model/gltf+json"
        if ctype not in MEDIA_LIBRARY_TYPES:
            raise HTTPException(422, f"Dateityp nicht erlaubt: {ctype}")
        f.content_type = ctype  # type: ignore
        d = await store_upload(f, user["id"], "library", {"kind": "library", "category": category, "title": f.filename, "public": public == "true"})
        d["url"] = signed_url(d["id"])
        out.append(d)
    await log_activity(user, "MEDIA_UPLOADED", "file", ",".join(x["id"] for x in out), new={"count": len(out)})
    return out


@router.patch("/media/{fid}")
async def update_library(fid: str, body: dict, user=Depends(require_roles(*STAFF))):
    await get_or_404("files", fid)
    upd = {k: body[k] for k in ("title", "filename", "category", "public", "client_visible") if k in body}
    await db.files.update_one({"id": fid}, {"$set": upd})
    return await get_or_404("files", fid)
