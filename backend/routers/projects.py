from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from core import (db, iso, uid, require_roles, get_current_user, log_activity, notify, find_list, get_or_404, project_for_user,
                  next_number, is_staff, signed_url, MANAGEMENT, STAFF, ZONE_STATUSES, TASK_STATUSES, DEFAULT_STAGES)
from routers.crm import store_upload, ALLOWED_MEDIA

router = APIRouter(prefix="/projects", tags=["projects"])

ZONE_COLORS = {"PLANNED": "#8A8A8A", "IN_PROGRESS": "#D96C40", "WAITING": "#F59E0B", "COMPLETED": "#4E8563", "PROBLEM": "#B94A48"}


class ProjectBody(BaseModel):
    name: str
    customer_id: str
    address: str = ""
    description: str = ""
    category: str = ""
    project_manager_id: Optional[str] = None
    employee_ids: List[str] = []
    start_date: Optional[str] = None
    planned_finish: Optional[str] = None
    budget: Optional[str] = None


class ZoneBody(BaseModel):
    object_name: str
    display_name: str
    description: str = ""
    progress: int = 0
    status: str = "PLANNED"
    project_stage: Optional[str] = None
    assigned_employee_id: Optional[str] = None
    start_date: Optional[str] = None
    expected_finish: Optional[str] = None
    actual_finish: Optional[str] = None
    color_state: Optional[str] = None
    client_visible: bool = True
    photo_ids: List[str] = []
    document_ids: List[str] = []
    position: Optional[dict] = None  # {x,y,z,w,h,d} for fallback block rendering


class UpdateBody(BaseModel):
    title: str
    description: str = ""
    progress: Optional[int] = None
    stage: Optional[str] = None
    photo_ids: List[str] = []
    video_ids: List[str] = []
    client_visible: bool = True
    zone_id: Optional[str] = None


class TaskBody(BaseModel):
    title: str
    description: str = ""
    employee_id: Optional[str] = None
    priority: str = "NORMAL"
    status: str = "OFFEN"
    due_date: Optional[str] = None
    attachment_ids: List[str] = []


class DiaryBody(BaseModel):
    date: str
    employees_present: List[str] = []
    work_completed: str
    materials: str = ""
    problems: str = ""
    notes: str = ""
    weather: Optional[str] = None
    photo_ids: List[str] = []
    client_visible: bool = False


class BeforeAfterBody(BaseModel):
    before_id: str
    after_id: str
    title: str = ""
    description: str = ""
    zone_id: Optional[str] = None
    date: Optional[str] = None
    client_visible: bool = True
    published: bool = False


class ModelConfig(BaseModel):
    camera_config: Optional[dict] = None
    environment_config: Optional[dict] = None
    thumbnail_id: Optional[str] = None


def with_urls(doc: dict, keys=("photo_ids", "video_ids", "attachment_ids")):
    for k in keys:
        if k in doc:
            doc[k.replace("_ids", "_urls")] = [signed_url(i) for i in doc[k]]
    return doc


def visible_filter(user: dict) -> dict:
    return {} if is_staff(user) else {"client_visible": True}


async def enrich_project(p: dict) -> dict:
    pm = await db.users.find_one({"id": p.get("project_manager_id")}, {"_id": 0, "first_name": 1, "last_name": 1, "phone": 1, "email": 1, "id": 1}) if p.get("project_manager_id") else None
    p["project_manager"] = pm
    p["team"] = [u async for u in db.users.find({"id": {"$in": p.get("employee_ids", [])}}, {"_id": 0, "first_name": 1, "last_name": 1, "id": 1, "role": 1})]
    p["has_3d_model"] = bool(await db.project_3d_models.find_one({"project_id": p["id"], "deleted_at": None}))
    cover = await db.files.find_one({"project_id": p["id"], "kind": "media", "content_type": {"$regex": "^image"}, "deleted_at": None}, {"_id": 0, "id": 1}, sort=[("created_at", -1)])
    p["cover_url"] = signed_url(cover["id"]) if cover else None
    return p


@router.get("")
async def list_projects(user=Depends(get_current_user)):
    q = {"deleted_at": None}
    if user["role"] == "CLIENT":
        q["customer_id"] = user.get("customer_id") or "-"
    elif user["role"] == "EMPLOYEE":
        q["$or"] = [{"employee_ids": user["id"]}, {"project_manager_id": user["id"]}]
    return [await enrich_project(p) for p in await find_list("projects", q)]


@router.post("", status_code=201)
async def create_project(body: ProjectBody, user=Depends(require_roles(*MANAGEMENT))):
    customer = await get_or_404("customers", body.customer_id, "Kunde nicht gefunden")
    settings = await db.settings.find_one({"id": "global"}, {"_id": 0}) or {}
    stages = settings.get("workflow_stages", DEFAULT_STAGES)
    number = await next_number("project", "project_number_format", "OKA-{year}-{seq:04d}")
    p = {"id": uid(), "number": number, **body.model_dump(), "customer_name": customer["name"], "actual_finish": None, "progress": 0,
         "stage": stages[0], "status": "ACTIVE", "internal_notes": "", "client_notes": "", "stage_history": [{"stage": stages[0], "at": iso(), "by": user["id"]}],
         "created_at": iso(), "updated_at": iso(), "deleted_at": None}
    p["project_manager_id"] = p["project_manager_id"] or user["id"]
    await db.projects.insert_one(dict(p))
    await db.messages.insert_one({"id": uid(), "project_id": p["id"], "sender_id": None, "sender_name": "OKA Bau", "type": "system", "text": f"Projekt {number} wurde angelegt.", "read_by": [], "created_at": iso()})
    await log_activity(user, "PROJECT_CREATED", "project", p["id"], new={"number": number})
    p.pop("_id", None)
    return p


@router.get("/{pid}")
async def get_project(pid: str, user=Depends(get_current_user)):
    p = await project_for_user(pid, user)
    p = await enrich_project(p)
    if not is_staff(user):
        p.pop("internal_notes", None)
        p.pop("budget", None)
    p["customer"] = await db.customers.find_one({"id": p["customer_id"]}, {"_id": 0}) if is_staff(user) else None
    p["counts"] = {
        "photos": await db.files.count_documents({"project_id": pid, "kind": "media", "deleted_at": None, **visible_filter(user)}),
        "documents": await db.files.count_documents({"project_id": pid, "kind": "document", "deleted_at": None, **visible_filter(user)}),
        "unread_messages": await db.messages.count_documents({"project_id": pid, "read_by": {"$ne": user["id"]}, "sender_id": {"$ne": user["id"]}}),
        "open_offers": await db.offers.count_documents({"project_id": pid, "status": {"$in": ["SENT", "VIEWED"]}, "deleted_at": None}),
        "open_invoices": await db.invoices.count_documents({"project_id": pid, "status": {"$in": ["OPEN", "OVERDUE"]}, "deleted_at": None}),
    }
    nxt = await db.appointments.find_one({"project_id": pid, "start": {"$gte": iso()}, "deleted_at": None}, {"_id": 0}, sort=[("start", 1)])
    p["next_appointment"] = nxt
    latest = await db.project_updates.find_one({"project_id": pid, **visible_filter(user)}, {"_id": 0}, sort=[("created_at", -1)])
    p["latest_update"] = latest
    return p


@router.patch("/{pid}")
async def update_project(pid: str, body: dict, user=Depends(require_roles(*STAFF))):
    p = await project_for_user(pid, user)
    allowed_emp = {"progress", "client_notes"}
    if user["role"] == "EMPLOYEE":
        body = {k: v for k, v in body.items() if k in allowed_emp}
    body.pop("id", None); body.pop("number", None)
    body["updated_at"] = iso()
    if "stage" in body and body["stage"] != p["stage"]:
        await db.projects.update_one({"id": pid}, {"$push": {"stage_history": {"stage": body["stage"], "at": iso(), "by": user["id"]}}})
        await log_activity(user, "PROJECT_STAGE", "project", pid, p["stage"], body["stage"])
        client_ids = [u["id"] async for u in db.users.find({"customer_id": p["customer_id"]}, {"_id": 0, "id": 1})]
        await notify(client_ids, "Projektstatus geändert", f"{p['number']}: {body['stage']}", f"/client/project/{pid}", "project")
    if "progress" in body and body["progress"] != p.get("progress"):
        client_ids = [u["id"] async for u in db.users.find({"customer_id": p["customer_id"]}, {"_id": 0, "id": 1})]
        await notify(client_ids, "Projektfortschritt", f"Ihr Projekt ist jetzt zu {body['progress']}% abgeschlossen", f"/client/project/{pid}", "project")
    await db.projects.update_one({"id": pid}, {"$set": body})
    if body.get("status") == "COMPLETED" and p.get("status") != "COMPLETED":
        client_ids = [u["id"] async for u in db.users.find({"customer_id": p["customer_id"]}, {"_id": 0, "id": 1})]
        await notify(client_ids, "Projekt abgeschlossen", f"{p['number']} wurde abgeschlossen. Vielen Dank für Ihr Vertrauen.", f"/client/project/{pid}", "project", email=True)
    await log_activity(user, "PROJECT_UPDATED", "project", pid, new={k: v for k, v in body.items() if k != "updated_at"})
    return await enrich_project(await get_or_404("projects", pid))


@router.delete("/{pid}")
async def archive_project(pid: str, user=Depends(require_roles(*MANAGEMENT))):
    await db.projects.update_one({"id": pid}, {"$set": {"deleted_at": iso(), "status": "ARCHIVED"}})
    await log_activity(user, "PROJECT_ARCHIVED", "project", pid)
    return {"ok": True}


# ---------- zones ----------
@router.get("/{pid}/zones")
async def list_zones(pid: str, user=Depends(get_current_user)):
    await project_for_user(pid, user)
    zones = await find_list("project_zones", {"project_id": pid, "deleted_at": None, **visible_filter(user)}, sort=("created_at", 1))
    for z in zones:
        z["color"] = z.get("color_state") or ZONE_COLORS.get(z["status"], "#8A8A8A")
        z["photo_count"] = len(z.get("photo_ids", []))
        z["document_count"] = len(z.get("document_ids", []))
        with_urls(z, ("photo_ids",))
    return zones


@router.post("/{pid}/zones", status_code=201)
async def create_zone(pid: str, body: ZoneBody, user=Depends(require_roles(*STAFF))):
    await project_for_user(pid, user)
    if body.status not in ZONE_STATUSES:
        raise HTTPException(422, "Ungültiger Status")
    z = {"id": uid(), "project_id": pid, **body.model_dump(), "history": [{"status": body.status, "progress": body.progress, "at": iso()}], "created_at": iso(), "updated_at": iso(), "deleted_at": None}
    await db.project_zones.insert_one(dict(z))
    await log_activity(user, "ZONE_CREATED", "project_zone", z["id"], new={"project_id": pid, "name": body.display_name})
    z.pop("_id", None)
    return z


@router.patch("/{pid}/zones/{zid}")
async def update_zone(pid: str, zid: str, body: dict, user=Depends(require_roles(*STAFF))):
    p = await project_for_user(pid, user)
    z = await get_or_404("project_zones", zid)
    body.pop("id", None); body["updated_at"] = iso()
    if body.get("status") and body["status"] not in ZONE_STATUSES:
        raise HTTPException(422, "Ungültiger Status")
    push = {}
    if body.get("status") != z["status"] or body.get("progress", z["progress"]) != z["progress"]:
        push = {"$push": {"history": {"status": body.get("status", z["status"]), "progress": body.get("progress", z["progress"]), "at": iso()}}}
    if body.get("status") == "COMPLETED" and z["status"] != "COMPLETED":
        body["actual_finish"] = body.get("actual_finish") or iso()
    await db.project_zones.update_one({"id": zid}, {"$set": body, **push})
    await log_activity(user, "ZONE_UPDATED", "project_zone", zid, {"status": z["status"], "progress": z["progress"]}, {k: body.get(k) for k in ("status", "progress")})
    if body.get("status") and body["status"] != z["status"] and z.get("client_visible", True):
        client_ids = [u["id"] async for u in db.users.find({"customer_id": p["customer_id"]}, {"_id": 0, "id": 1})]
        await notify(client_ids, "Projektaktualisierung", f"{z['display_name']}: {body['status']}", f"/client/project/{pid}", "project")
    return await get_or_404("project_zones", zid)


@router.delete("/{pid}/zones/{zid}")
async def delete_zone(pid: str, zid: str, user=Depends(require_roles(*MANAGEMENT))):
    await db.project_zones.update_one({"id": zid}, {"$set": {"deleted_at": iso()}})
    return {"ok": True}


# ---------- 3D models ----------
@router.get("/{pid}/model")
async def get_model(pid: str, user=Depends(get_current_user)):
    await project_for_user(pid, user)
    m = await db.project_3d_models.find_one({"project_id": pid, "deleted_at": None}, {"_id": 0}, sort=[("version", -1)])
    if not m:
        return None
    m["model_url"] = signed_url(m["file_id"])
    m["thumbnail_url"] = signed_url(m.get("thumbnail_id"))
    return m


@router.post("/{pid}/model", status_code=201)
async def upload_model(pid: str, file: UploadFile = File(...), user=Depends(require_roles(*MANAGEMENT))):
    await project_for_user(pid, user)
    name = (file.filename or "").lower()
    if not (name.endswith(".glb") or name.endswith(".gltf")):
        raise HTTPException(422, "Nur .glb oder .gltf erlaubt")
    ctype = "model/gltf-binary" if name.endswith(".glb") else "model/gltf+json"
    stored = await store_upload(file, user["id"], "models", {"kind": "model", "project_id": pid}, content_type=ctype)
    prev = await db.project_3d_models.find_one({"project_id": pid, "deleted_at": None}, {"_id": 0}, sort=[("version", -1)])
    m = {"id": uid(), "project_id": pid, "file_id": stored["id"], "thumbnail_id": None, "version": (prev["version"] + 1) if prev else 1,
         "uploaded_by": user["id"], "camera_config": (prev or {}).get("camera_config") or {"position": [6, 4, 8], "target": [0, 1, 0], "fov": 45, "auto_rotate": True},
         "environment_config": (prev or {}).get("environment_config") or {"preset": "studio", "intensity": 1.0, "background": "#F0EFE9"},
         "created_at": iso(), "updated_at": iso(), "deleted_at": None}
    await db.project_3d_models.insert_one(dict(m))
    await log_activity(user, "MODEL_UPLOADED", "project_3d_model", m["id"], new={"project_id": pid, "version": m["version"]})
    m.pop("_id", None)
    m["model_url"] = signed_url(stored["id"])
    return m


@router.patch("/{pid}/model")
async def update_model(pid: str, body: ModelConfig, user=Depends(require_roles(*MANAGEMENT))):
    m = await db.project_3d_models.find_one({"project_id": pid, "deleted_at": None}, {"_id": 0}, sort=[("version", -1)])
    if not m:
        raise HTTPException(404, "Kein Modell")
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    upd["updated_at"] = iso()
    await db.project_3d_models.update_one({"id": m["id"]}, {"$set": upd})
    await log_activity(user, "MODEL_CONFIG", "project_3d_model", m["id"], new=upd)
    return {"ok": True}


# ---------- updates / timeline ----------
@router.get("/{pid}/updates")
async def list_updates(pid: str, user=Depends(get_current_user)):
    await project_for_user(pid, user)
    return [with_urls(u) for u in await find_list("project_updates", {"project_id": pid, **visible_filter(user)})]


@router.post("/{pid}/updates", status_code=201)
async def create_update(pid: str, body: UpdateBody, user=Depends(require_roles(*STAFF))):
    p = await project_for_user(pid, user)
    if user["role"] == "EMPLOYEE" and body.client_visible and not user.get("can_publish_client_updates"):
        raise HTTPException(403, "Keine Berechtigung für kundensichtbare Updates")
    u = {"id": uid(), "project_id": pid, **body.model_dump(), "date": iso(), "author_id": user["id"],
         "author_name": f"{user.get('first_name','')} {user.get('last_name','')}".strip(), "created_at": iso()}
    await db.project_updates.insert_one(dict(u))
    upd = {"updated_at": iso(), "last_update_at": iso()}
    if body.progress is not None:
        upd["progress"] = body.progress
    if body.stage:
        upd["stage"] = body.stage
    await db.projects.update_one({"id": pid}, {"$set": upd})
    if body.client_visible:
        client_ids = [c["id"] async for c in db.users.find({"customer_id": p["customer_id"]}, {"_id": 0, "id": 1})]
        await notify(client_ids, "Neue Projektaktualisierung", body.title, f"/client/project/{pid}", "update", email=True)
    await log_activity(user, "UPDATE_CREATED", "project_update", u["id"], new={"project_id": pid})
    u.pop("_id", None)
    return with_urls(u)


@router.get("/{pid}/timeline")
async def timeline(pid: str, user=Depends(get_current_user)):
    p = await project_for_user(pid, user)
    zones = await find_list("project_zones", {"project_id": pid, "deleted_at": None, **visible_filter(user)}, sort=("created_at", 1))
    events = []
    for s in p.get("stage_history", []):
        events.append({"type": "stage", "at": s["at"], "label": s["stage"]})
    for z in zones:
        for h in z.get("history", []):
            events.append({"type": "zone", "at": h["at"], "label": z["display_name"], "status": h["status"], "progress": h["progress"], "zone_id": z["id"]})
    for u in await find_list("project_updates", {"project_id": pid, **visible_filter(user)}):
        events.append({"type": "update", "at": u["created_at"], "label": u["title"], "progress": u.get("progress")})
    events.sort(key=lambda e: e["at"])
    return {"start": p.get("start_date") or p["created_at"], "planned_finish": p.get("planned_finish"), "events": events}


# ---------- tasks ----------
@router.get("/{pid}/tasks")
async def list_tasks(pid: str, user=Depends(require_roles(*STAFF))):
    await project_for_user(pid, user)
    return await find_list("tasks", {"project_id": pid, "deleted_at": None})


@router.post("/{pid}/tasks", status_code=201)
async def create_task(pid: str, body: TaskBody, user=Depends(require_roles(*STAFF))):
    p = await project_for_user(pid, user)
    t = {"id": uid(), "project_id": pid, "project_number": p["number"], **body.model_dump(), "comments": [], "created_by": user["id"], "created_at": iso(), "updated_at": iso(), "deleted_at": None}
    await db.tasks.insert_one(dict(t))
    if body.employee_id:
        await notify([body.employee_id], "Neue Aufgabe", body.title, f"/employee/project/{pid}", "task")
    t.pop("_id", None)
    return t


@router.patch("/{pid}/tasks/{tid}")
async def update_task(pid: str, tid: str, body: dict, user=Depends(require_roles(*STAFF))):
    await project_for_user(pid, user)
    t = await get_or_404("tasks", tid)
    body.pop("id", None)
    if body.get("status") and body["status"] not in TASK_STATUSES:
        raise HTTPException(422, "Ungültiger Status")
    if "comment" in body:
        await db.tasks.update_one({"id": tid}, {"$push": {"comments": {"id": uid(), "text": body.pop("comment"), "author": user["id"], "created_at": iso()}}})
    body["updated_at"] = iso()
    await db.tasks.update_one({"id": tid}, {"$set": body})
    if body.get("status") and body["status"] != t["status"]:
        await log_activity(user, "TASK_STATUS", "task", tid, t["status"], body["status"])
    return await get_or_404("tasks", tid)


# ---------- diary ----------
@router.get("/{pid}/diary")
async def list_diary(pid: str, user=Depends(get_current_user)):
    await project_for_user(pid, user)
    return [with_urls(d) for d in await find_list("diary_entries", {"project_id": pid, "deleted_at": None, **visible_filter(user)}, sort=("date", -1))]


@router.post("/{pid}/diary", status_code=201)
async def create_diary(pid: str, body: DiaryBody, user=Depends(require_roles(*STAFF))):
    await project_for_user(pid, user)
    d = {"id": uid(), "project_id": pid, **body.model_dump(), "author_id": user["id"], "author_name": f"{user.get('first_name','')} {user.get('last_name','')}".strip(), "created_at": iso(), "deleted_at": None}
    await db.diary_entries.insert_one(dict(d))
    await log_activity(user, "DIARY_CREATED", "diary_entry", d["id"], new={"project_id": pid})
    d.pop("_id", None)
    return with_urls(d)


# ---------- media / before-after ----------
@router.get("/{pid}/media")
async def list_media(pid: str, user=Depends(get_current_user)):
    await project_for_user(pid, user)
    items = await find_list("files", {"project_id": pid, "kind": "media", "deleted_at": None, "media_kind": {"$ne": "chat"}, **visible_filter(user)})
    for i in items:
        i["url"] = signed_url(i["id"])
    return items


@router.post("/{pid}/media", status_code=201)
async def upload_media(pid: str, files: List[UploadFile] = File(...), zone_id: str = Form(""), phase: str = Form(""), client_visible: str = Form("true"),
                       media_kind: str = Form("photo"), user=Depends(get_current_user)):
    p = await project_for_user(pid, user)
    if not is_staff(user):
        client_visible, media_kind = "true", "chat"  # clients may only attach to the chat, never curate the gallery
    out = []
    for f in files:
        if f.content_type not in ALLOWED_MEDIA:
            raise HTTPException(422, f"Dateityp nicht erlaubt: {f.content_type}")
        doc = await store_upload(f, user["id"], f"projects/{pid}", {"kind": "media", "project_id": pid, "zone_id": zone_id or None, "phase": phase or p["stage"],
                                                                      "media_kind": media_kind, "client_visible": client_visible == "true", "uploaded_by": user["id"]})
        doc["url"] = signed_url(doc["id"])
        out.append(doc)
    if client_visible == "true" and is_staff(user):
        client_ids = [c["id"] async for c in db.users.find({"customer_id": p["customer_id"]}, {"_id": 0, "id": 1})]
        await notify(client_ids, "Neue Fotos verfügbar", f"{len(out)} neue Aufnahmen in {p['number']}", f"/client/project/{pid}", "media")
    return out


@router.get("/{pid}/before-after")
async def list_before_after(pid: str, user=Depends(get_current_user)):
    await project_for_user(pid, user)
    items = await find_list("before_after", {"project_id": pid, "deleted_at": None, **visible_filter(user)})
    for i in items:
        i["before_url"] = signed_url(i["before_id"]); i["after_url"] = signed_url(i["after_id"])
    return items


@router.post("/{pid}/before-after", status_code=201)
async def create_before_after(pid: str, body: BeforeAfterBody, user=Depends(require_roles(*STAFF))):
    p = await project_for_user(pid, user)
    if user["role"] == "EMPLOYEE":
        body.published = False  # publishing to the public portfolio is a management decision
    for fid in (body.before_id, body.after_id):
        f = await db.files.find_one({"id": fid, "project_id": pid, "deleted_at": None})
        if not f:
            raise HTTPException(422, "Bild gehört nicht zu diesem Projekt")
    d = {"id": uid(), "project_id": pid, "project_number": p["number"], "category": p.get("category"), **body.model_dump(), "date": body.date or iso(), "created_by": user["id"], "created_at": iso(), "updated_at": iso(), "deleted_at": None}
    await db.before_after.insert_one(dict(d))
    await log_activity(user, "BEFORE_AFTER_CREATED", "before_after", d["id"], new={"project_id": pid, "published": body.published})
    if body.client_visible:
        client_ids = [c["id"] async for c in db.users.find({"customer_id": p["customer_id"]}, {"_id": 0, "id": 1})]
        await notify(client_ids, "Neue Fotos verfügbar", f"Vorher / Nachher: {body.title or 'neuer Vergleich'}", f"/client/project/{pid}", "media")
    d.pop("_id", None)
    d["before_url"] = signed_url(d["before_id"]); d["after_url"] = signed_url(d["after_id"])
    return d


@router.patch("/{pid}/before-after/{bid}")
async def update_before_after(pid: str, bid: str, body: dict, user=Depends(require_roles(*STAFF))):
    await project_for_user(pid, user)
    upd = {k: body[k] for k in ("title", "description", "zone_id", "date", "client_visible", "published") if k in body}
    if user["role"] == "EMPLOYEE":
        upd.pop("published", None)
    upd["updated_at"] = iso()
    await db.before_after.update_one({"id": bid}, {"$set": upd})
    await log_activity(user, "BEFORE_AFTER_UPDATED", "before_after", bid, new=upd)
    return await get_or_404("before_after", bid)


@router.delete("/{pid}/before-after/{bid}")
async def delete_before_after(pid: str, bid: str, user=Depends(require_roles(*STAFF))):
    await project_for_user(pid, user)
    await db.before_after.update_one({"id": bid}, {"$set": {"deleted_at": iso()}})
    return {"ok": True}


@router.patch("/{pid}/team")
async def update_team(pid: str, body: dict, user=Depends(require_roles(*MANAGEMENT))):
    await project_for_user(pid, user)
    upd = {k: body[k] for k in ("employee_ids", "project_manager_id") if k in body}
    await db.projects.update_one({"id": pid}, {"$set": upd})
    for eid in body.get("employee_ids", []):
        await notify([eid], "Projektzuweisung", "Sie wurden einem Projekt zugewiesen.", f"/employee/project/{pid}", "team")
    await log_activity(user, "TEAM_UPDATED", "project", pid, new=upd)
    return await enrich_project(await get_or_404("projects", pid))
