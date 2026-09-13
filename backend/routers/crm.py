import secrets
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from pydantic import BaseModel, EmailStr

from core import (db, iso, uid, now, hash_password, require_roles, get_current_user, log_activity, notify, send_email,
                  find_list, get_or_404, put_object, next_number, APP_NAME, MANAGEMENT, STAFF, LEAD_STATUSES, DEFAULT_STAGES)

router = APIRouter(tags=["crm"])


class LeadUpdate(BaseModel):
    status: Optional[str] = None
    responsible_id: Optional[str] = None
    notes: Optional[str] = None
    budget: Optional[str] = None
    desired_period: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    project_type: Optional[str] = None


class CustomerBody(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    internal_notes: Optional[str] = None


class NoteBody(BaseModel):
    text: str


ALLOWED_MEDIA = {"image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "application/pdf"}


async def store_upload(f: UploadFile, owner_id: str, folder: str, extra: dict, content_type: str = "") -> dict:
    data = await f.read()
    if len(data) > 60 * 1024 * 1024:
        raise HTTPException(413, "Datei zu groß (max. 60 MB)")
    ctype = content_type or f.content_type or "application/octet-stream"
    ext = (f.filename or "file").rsplit(".", 1)[-1].lower() if "." in (f.filename or "") else "bin"
    fid = uid()
    path = f"{APP_NAME}/uploads/{folder}/{owner_id}/{fid}.{ext}"
    res = await put_object(path, data, ctype)
    doc = {"id": fid, "storage_path": res["path"], "filename": f.filename, "content_type": ctype, "size": len(data),
           "owner_id": owner_id, "folder": folder, "created_at": iso(), "deleted_at": None, **extra}
    await db.files.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@router.post("/public/request", status_code=201)
async def public_request(
    request: Request,
    name: str = Form(...), email: str = Form(...), phone: str = Form(...), address: str = Form(""),
    postal_code: str = Form(""), project_type: str = Form(...), message: str = Form(""), desired_period: str = Form(""),
    budget: str = Form(""), consent: str = Form(...), source: str = Form("app"),
    files: List[UploadFile] = File(default=[]),
):
    if consent not in ("true", "1", "on", "yes"):
        raise HTTPException(422, "Einwilligung erforderlich")
    if "@" not in email:
        raise HTTPException(422, "Ungültige E-Mail")
    lead_id = uid()
    attachments = []
    for f in files:
        if f.content_type not in ALLOWED_MEDIA:
            raise HTTPException(422, f"Dateityp nicht erlaubt: {f.content_type}")
        attachments.append(await store_upload(f, lead_id, "leads", {"kind": "lead_attachment", "lead_id": lead_id}))
    lead = {"id": lead_id, "name": name.strip(), "email": email.lower().strip(), "phone": phone.strip(), "address": address, "postal_code": postal_code,
            "project_type": project_type, "message": message, "budget": budget or None, "desired_period": desired_period, "source": source,
            "attachment_ids": [a["id"] for a in attachments], "responsible_id": None, "notes": [], "status": "NEU",
            "consent": True, "consent_at": iso(), "ip": request.client.host if request.client else None,
            "created_at": iso(), "updated_at": iso(), "deleted_at": None, "converted_project_id": None}
    await db.leads.insert_one(dict(lead))
    await log_activity(None, "LEAD_CREATED", "lead", lead_id, new={"name": name, "project_type": project_type})
    staff_ids = [u["id"] async for u in db.users.find({"role": {"$in": MANAGEMENT}}, {"_id": 0, "id": 1})]
    await notify(staff_ids, "Neue Anfrage", f"{name} · {project_type}", "/admin/crm", "lead")
    return {"ok": True, "id": lead_id, "message": "Vielen Dank. Ihre Anfrage wurde erfolgreich an OKA Bau übermittelt."}


@router.get("/leads")
async def list_leads(status: Optional[str] = None, user=Depends(require_roles(*MANAGEMENT))):
    q = {"deleted_at": None}
    if status:
        q["status"] = status
    return await find_list("leads", q)


@router.get("/leads/{lead_id}")
async def get_lead(lead_id: str, user=Depends(require_roles(*MANAGEMENT))):
    lead = await get_or_404("leads", lead_id)
    lead["attachments"] = await find_list("files", {"id": {"$in": lead.get("attachment_ids", [])}})
    return lead


@router.patch("/leads/{lead_id}")
async def update_lead(lead_id: str, body: LeadUpdate, user=Depends(require_roles(*MANAGEMENT))):
    lead = await get_or_404("leads", lead_id)
    upd = {k: v for k, v in body.model_dump().items() if v is not None and k != "notes"}
    if "status" in upd and upd["status"] not in LEAD_STATUSES:
        raise HTTPException(422, "Ungültiger Status")
    if body.notes:
        await db.leads.update_one({"id": lead_id}, {"$push": {"notes": {"id": uid(), "text": body.notes, "author": user["id"], "created_at": iso()}}})
    if "status" in upd and upd["status"] != lead["status"] and lead["status"] == "NEU":
        upd["first_response_at"] = iso()
    upd["updated_at"] = iso()
    await db.leads.update_one({"id": lead_id}, {"$set": upd})
    if "status" in upd:
        await log_activity(user, "LEAD_STATUS", "lead", lead_id, lead["status"], upd["status"])
    return await get_or_404("leads", lead_id)


@router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, user=Depends(require_roles(*MANAGEMENT))):
    await db.leads.update_one({"id": lead_id}, {"$set": {"deleted_at": iso()}})
    await log_activity(user, "LEAD_DELETED", "lead", lead_id)
    return {"ok": True}


@router.post("/leads/{lead_id}/convert", status_code=201)
async def convert_lead(lead_id: str, user=Depends(require_roles(*MANAGEMENT))):
    lead = await get_or_404("leads", lead_id)
    if lead.get("converted_project_id"):
        raise HTTPException(409, "Lead wurde bereits umgewandelt")
    # customer
    customer = await db.customers.find_one({"email": lead["email"], "deleted_at": None}, {"_id": 0})
    if not customer:
        customer = {"id": uid(), "name": lead["name"], "email": lead["email"], "phone": lead["phone"], "address": lead["address"],
                    "postal_code": lead["postal_code"], "city": "", "internal_notes": [], "created_at": iso(), "updated_at": iso(), "deleted_at": None}
        await db.customers.insert_one(dict(customer))
    # account
    account = await db.users.find_one({"email": lead["email"]}, {"_id": 0})
    temp_password = None
    if not account:
        temp_password = secrets.token_urlsafe(8)
        parts = lead["name"].split(" ", 1)
        account = {"id": uid(), "email": lead["email"], "first_name": parts[0], "last_name": parts[1] if len(parts) > 1 else "", "phone": lead["phone"],
                   "role": "CLIENT", "customer_id": customer["id"], "password_hash": hash_password(temp_password), "disabled": False,
                   "email_verified": False, "must_change_password": True, "created_at": iso()}
        await db.users.insert_one(dict(account))
        await send_email(lead["email"], "Ihr OKA Bau Kundenportal", f"Willkommen! Zugang: {lead['email']} / temporäres Passwort: {temp_password}", "account_invitation")
    elif not account.get("customer_id"):
        await db.users.update_one({"id": account["id"]}, {"$set": {"customer_id": customer["id"]}})
    # project
    number = await next_number("project", "project_number_format", "OKA-{year}-{seq:04d}")
    settings = await db.settings.find_one({"id": "global"}, {"_id": 0}) or {}
    stages = settings.get("workflow_stages", DEFAULT_STAGES)
    project = {"id": uid(), "number": number, "name": f"{lead['project_type']} – {lead['name']}", "customer_id": customer["id"], "customer_name": customer["name"],
               "address": f"{lead['address']}, {lead['postal_code']}".strip(", "), "description": lead["message"], "category": lead["project_type"],
               "project_manager_id": user["id"], "employee_ids": [], "start_date": None, "planned_finish": None, "actual_finish": None,
               "budget": lead.get("budget"), "progress": 0, "stage": stages[6] if len(stages) > 6 else stages[0], "status": "ACTIVE",
               "internal_notes": "", "client_notes": "", "lead_id": lead_id, "stage_history": [{"stage": stages[6] if len(stages) > 6 else stages[0], "at": iso(), "by": user["id"]}],
               "created_at": iso(), "updated_at": iso(), "deleted_at": None}
    await db.projects.insert_one(dict(project))
    await db.messages.insert_one({"id": uid(), "project_id": project["id"], "sender_id": None, "sender_name": "OKA Bau", "type": "system",
                                  "text": f"Projekt {number} wurde angelegt. Willkommen im Projektchat.", "read_by": [], "created_at": iso()})
    await db.project_updates.insert_one({"id": uid(), "project_id": project["id"], "title": "Projekt angelegt", "description": f"Projekt {number} wurde aus Ihrer Anfrage erstellt.",
                                         "date": iso(), "progress": 0, "stage": project["stage"], "photo_ids": [], "video_ids": [], "client_visible": True,
                                         "author_id": user["id"], "author_name": f"{user.get('first_name','')} {user.get('last_name','')}".strip(), "created_at": iso()})
    await db.leads.update_one({"id": lead_id}, {"$set": {"status": "GEWONNEN", "converted_project_id": project["id"], "customer_id": customer["id"], "updated_at": iso()}})
    await log_activity(user, "LEAD_CONVERTED", "lead", lead_id, new={"project_id": project["id"], "number": number})
    await notify([account["id"]], "Ihr Projekt wurde angelegt", f"Projekt {number} ist jetzt in Ihrem Kundenportal verfügbar.", f"/client/project/{project['id']}", "project", email=True)
    return {"project": project, "customer": customer, "account": {"id": account["id"], "email": account["email"]}, "temp_password": temp_password}


@router.get("/customers")
async def list_customers(user=Depends(require_roles(*STAFF))):
    return await find_list("customers", {"deleted_at": None})


@router.post("/customers", status_code=201)
async def create_customer(body: CustomerBody, user=Depends(require_roles(*MANAGEMENT))):
    doc = {"id": uid(), **body.model_dump(), "email": body.email.lower(), "internal_notes": [], "created_at": iso(), "updated_at": iso(), "deleted_at": None}
    await db.customers.insert_one(dict(doc))
    await log_activity(user, "CUSTOMER_CREATED", "customer", doc["id"])
    doc.pop("_id", None)
    return doc


@router.get("/customers/{cid}")
async def get_customer(cid: str, user=Depends(require_roles(*STAFF))):
    c = await get_or_404("customers", cid)
    c["projects"] = await find_list("projects", {"customer_id": cid, "deleted_at": None})
    c["offers"] = await find_list("offers", {"customer_id": cid, "deleted_at": None})
    c["invoices"] = await find_list("invoices", {"customer_id": cid, "deleted_at": None})
    c["appointments"] = await find_list("appointments", {"customer_id": cid, "deleted_at": None}, sort=("start", 1))
    c["documents"] = await find_list("files", {"customer_id": cid, "deleted_at": None, "kind": "document"})
    c["activity"] = await find_list("activity_logs", {"entity_id": {"$in": [cid] + [p["id"] for p in c["projects"]]}}, limit=50)
    c["users"] = [{"id": u["id"], "email": u["email"], "role": u["role"]} async for u in db.users.find({"customer_id": cid}, {"_id": 0})]
    return c


@router.patch("/customers/{cid}")
async def update_customer(cid: str, body: dict, user=Depends(require_roles(*MANAGEMENT))):
    await get_or_404("customers", cid)
    body.pop("id", None)
    body["updated_at"] = iso()
    await db.customers.update_one({"id": cid}, {"$set": body})
    return await get_or_404("customers", cid)


@router.post("/customers/{cid}/notes")
async def add_customer_note(cid: str, body: NoteBody, user=Depends(require_roles(*STAFF))):
    await db.customers.update_one({"id": cid}, {"$push": {"internal_notes": {"id": uid(), "text": body.text, "author": user["id"], "created_at": iso()}}})
    return {"ok": True}
