from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from core import (db, iso, uid, now, hash_password, require_roles, get_current_user, log_activity, notify, find_list, get_or_404, signed_url,
                  public_user, STAFF, MANAGEMENT, ADMINS, ROLES, DEFAULT_STAGES, SERVICES, LEAD_STATUSES, ZONE_STATUSES, TASK_STATUSES,
                  DOC_CATEGORIES, APPOINTMENT_TYPES)

router = APIRouter(tags=["admin"])


class EmployeeBody(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    password: str
    role: str = "EMPLOYEE"
    phone: Optional[str] = None
    can_publish_client_updates: bool = False


class PortfolioBody(BaseModel):
    title: str
    category: str
    description: str = ""
    location: Optional[str] = None
    cover_id: Optional[str] = None
    cover_url: Optional[str] = None
    photo_ids: list = []
    photo_urls: list = []
    video_ids: list = []
    before_after: list = []
    featured: bool = False
    published: bool = False
    project_id: Optional[str] = None


@router.get("/meta")
async def meta():
    settings = await db.settings.find_one({"id": "global"}, {"_id": 0}) or {}
    return {"services": SERVICES, "workflow_stages": settings.get("workflow_stages", DEFAULT_STAGES), "lead_statuses": LEAD_STATUSES, "zone_statuses": ZONE_STATUSES,
            "task_statuses": TASK_STATUSES, "doc_categories": DOC_CATEGORIES, "appointment_types": APPOINTMENT_TYPES, "roles": ROLES,
            "company": {"name": "OKA Bau GmbH & Co. KG", "address": "Alfred-Nobel-Straße 9", "city": "86156 Augsburg", "phone": "+49 821 65085943", "email": "info@okabau.de", "website": "https://oka-bau.eu"}}


# ---------------- CMS (public read, admin write) ----------------
@router.get("/cms")
async def cms_all():
    return {c["key"]: c["content"] for c in await find_list("cms", {})}


@router.get("/cms/{key}")
async def cms_get(key: str):
    c = await db.cms.find_one({"key": key}, {"_id": 0})
    return c["content"] if c else None


@router.put("/cms/{key}")
async def cms_put(key: str, body: dict, user=Depends(require_roles(*ADMINS))):
    old = await db.cms.find_one({"key": key}, {"_id": 0})
    await db.cms.update_one({"key": key}, {"$set": {"key": key, "content": body, "updated_at": iso(), "updated_by": user["id"]}}, upsert=True)
    await log_activity(user, "CMS_UPDATED", "cms", key, old=(old or {}).get("content"), new=body)
    return {"ok": True}


# ---------------- portfolio ----------------
@router.get("/portfolio/before-after")
async def portfolio_before_after():
    items = await find_list("before_after", {"published": True, "deleted_at": None})
    return [{"id": i["id"], "title": i.get("title"), "description": i.get("description"), "category": i.get("category"), "date": i.get("date"),
             "before_url": signed_url(i["before_id"]), "after_url": signed_url(i["after_id"])} for i in items]


@router.get("/portfolio")
async def portfolio_public(all: bool = False, category: Optional[str] = None):
    q = {"deleted_at": None} if all else {"published": True, "deleted_at": None}
    if category:
        q["category"] = category
    items = await find_list("portfolio", q, sort=("featured", -1))
    for i in items:
        i["cover"] = i.get("cover_url") or signed_url(i.get("cover_id"))
        i["photos"] = (i.get("photo_urls") or []) + [signed_url(p) for p in i.get("photo_ids", [])]
    return items


@router.post("/portfolio", status_code=201)
async def portfolio_create(body: PortfolioBody, user=Depends(require_roles(*MANAGEMENT))):
    d = {"id": uid(), **body.model_dump(), "created_at": iso(), "updated_at": iso(), "deleted_at": None}
    await db.portfolio.insert_one(dict(d))
    await log_activity(user, "PORTFOLIO_CREATED", "portfolio", d["id"], new={"title": body.title, "published": body.published})
    d.pop("_id", None)
    return d


@router.patch("/portfolio/{pid}")
async def portfolio_update(pid: str, body: dict, user=Depends(require_roles(*MANAGEMENT))):
    old = await get_or_404("portfolio", pid)
    body.pop("id", None); body["updated_at"] = iso()
    await db.portfolio.update_one({"id": pid}, {"$set": body})
    await log_activity(user, "PORTFOLIO_UPDATED", "portfolio", pid, {"published": old.get("published")}, {"published": body.get("published", old.get("published"))})
    return await get_or_404("portfolio", pid)


@router.delete("/portfolio/{pid}")
async def portfolio_delete(pid: str, user=Depends(require_roles(*MANAGEMENT))):
    await db.portfolio.update_one({"id": pid}, {"$set": {"deleted_at": iso()}})
    return {"ok": True}


# ---------------- employees ----------------
@router.get("/employees")
async def list_employees(user=Depends(require_roles(*STAFF))):
    return [public_user(u) | {"can_publish_client_updates": u.get("can_publish_client_updates", False), "disabled": u.get("disabled", False)}
            async for u in db.users.find({"role": {"$in": STAFF}}, {"_id": 0})]


@router.post("/employees", status_code=201)
async def create_employee(body: EmployeeBody, user=Depends(require_roles(*ADMINS))):
    if body.role not in STAFF:
        raise HTTPException(422, "Ungültige Rolle")
    if body.role == "SUPER_ADMIN" and user["role"] != "SUPER_ADMIN":
        raise HTTPException(403, "Nur Super-Admin")
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(409, "E-Mail bereits vergeben")
    u = {"id": uid(), "email": body.email.lower(), "first_name": body.first_name, "last_name": body.last_name, "phone": body.phone, "role": body.role,
         "password_hash": hash_password(body.password), "can_publish_client_updates": body.can_publish_client_updates, "disabled": False, "email_verified": True, "created_at": iso()}
    await db.users.insert_one(dict(u))
    await log_activity(user, "EMPLOYEE_CREATED", "user", u["id"], new={"email": u["email"], "role": u["role"]})
    return public_user(u)


@router.patch("/employees/{eid}")
async def update_employee(eid: str, body: dict, user=Depends(require_roles(*ADMINS))):
    upd = {k: body[k] for k in ("first_name", "last_name", "phone", "role", "disabled", "can_publish_client_updates") if k in body}
    if upd.get("role") and upd["role"] not in ROLES:
        raise HTTPException(422, "Ungültige Rolle")
    await db.users.update_one({"id": eid}, {"$set": upd})
    await log_activity(user, "EMPLOYEE_UPDATED", "user", eid, new=upd)
    return {"ok": True}


@router.get("/users")
async def list_users(user=Depends(require_roles(*ADMINS))):
    return [public_user(u) async for u in db.users.find({}, {"_id": 0})]


# ---------------- tasks (global) ----------------
@router.get("/tasks")
async def all_tasks(status: Optional[str] = None, mine: bool = False, user=Depends(require_roles(*STAFF))):
    q = {"deleted_at": None}
    if user["role"] == "EMPLOYEE" or mine:
        q["employee_id"] = user["id"]
    if status:
        q["status"] = status
    tasks = await find_list("tasks", q)
    today = iso()[:10]
    for t in tasks:
        t["overdue"] = bool(t.get("due_date") and t["due_date"][:10] < today and t["status"] != "ERLEDIGT")
    return tasks


# ---------------- dashboards ----------------
@router.get("/admin/dashboard")
async def admin_dashboard(user=Depends(require_roles(*MANAGEMENT))):
    today = iso()[:10]
    week = (now() + timedelta(days=7)).isoformat()
    stale = (now() - timedelta(days=7)).isoformat()
    active_q = {"deleted_at": None, "status": "ACTIVE"}
    return {
        "new_leads": await db.leads.count_documents({"status": "NEU", "deleted_at": None}),
        "active_projects": await db.projects.count_documents(active_q),
        "overdue_tasks": await db.tasks.count_documents({"deleted_at": None, "status": {"$ne": "ERLEDIGT"}, "due_date": {"$lt": today, "$ne": None}}),
        "upcoming_appointments": await db.appointments.count_documents({"deleted_at": None, "start": {"$gte": iso(), "$lte": week}}),
        "open_offers": await db.offers.count_documents({"deleted_at": None, "status": {"$in": ["SENT", "VIEWED"]}}),
        "open_invoices": await db.invoices.count_documents({"deleted_at": None, "status": {"$in": ["OPEN", "OVERDUE"]}}),
        "unread_messages": await db.messages.count_documents({"read_by": {"$ne": user["id"]}, "sender_id": {"$ne": user["id"], "$ne": None}}),
        "projects_without_update": await db.projects.count_documents({**active_q, "$or": [{"last_update_at": {"$lt": stale}}, {"last_update_at": None}]}),
        "recent_activity": await find_list("activity_logs", {}, limit=15),
        "next_appointments": await find_list("appointments", {"deleted_at": None, "start": {"$gte": iso()}}, sort=("start", 1), limit=5),
        "recent_leads": await find_list("leads", {"deleted_at": None}, limit=5),
    }


@router.get("/client/dashboard")
async def client_dashboard(user=Depends(get_current_user)):
    cid = user.get("customer_id") or "-"
    projects = await find_list("projects", {"customer_id": cid, "deleted_at": None})
    active = next((p for p in projects if p["status"] == "ACTIVE"), projects[0] if projects else None)
    out = {"greeting_name": user.get("first_name") or "", "projects": projects, "active_project": None,
           "unread_notifications": await db.notifications.count_documents({"user_id": user["id"], "read": False})}
    if active:
        pid = active["id"]
        pm = await db.users.find_one({"id": active.get("project_manager_id")}, {"_id": 0, "first_name": 1, "last_name": 1, "phone": 1, "email": 1})
        out["active_project"] = {
            **active, "project_manager": pm,
            "next_appointment": await db.appointments.find_one({"project_id": pid, "start": {"$gte": iso()}, "deleted_at": None}, {"_id": 0}, sort=[("start", 1)]),
            "latest_update": await db.project_updates.find_one({"project_id": pid, "client_visible": True}, {"_id": 0}, sort=[("created_at", -1)]),
            "unread_messages": await db.messages.count_documents({"project_id": pid, "read_by": {"$ne": user["id"]}, "sender_id": {"$ne": user["id"]}}),
            "new_documents": await db.files.count_documents({"project_id": pid, "kind": "document", "client_visible": True, "deleted_at": None, "created_at": {"$gt": (now() - timedelta(days=14)).isoformat()}}),
            "open_offer": await db.offers.find_one({"project_id": pid, "status": {"$in": ["SENT", "VIEWED"]}, "deleted_at": None}, {"_id": 0}),
            "open_invoice": await db.invoices.find_one({"project_id": pid, "status": {"$in": ["OPEN", "OVERDUE"]}, "deleted_at": None}, {"_id": 0}),
            "has_3d_model": bool(await db.project_3d_models.find_one({"project_id": pid, "deleted_at": None})),
        }
    return out


@router.get("/employee/dashboard")
async def employee_dashboard(user=Depends(require_roles(*STAFF))):
    today = iso()[:10]
    q = {"deleted_at": None, "status": "ACTIVE", "$or": [{"employee_ids": user["id"]}, {"project_manager_id": user["id"]}]}
    return {"projects": await find_list("projects", q),
            "tasks": await find_list("tasks", {"employee_id": user["id"], "status": {"$ne": "ERLEDIGT"}, "deleted_at": None}, sort=("due_date", 1)),
            "today_appointments": await find_list("appointments", {"employee_id": user["id"], "start": {"$gte": today, "$lt": today + "T23:59:59"}, "deleted_at": None}, sort=("start", 1)),
            "unread_messages": await db.messages.count_documents({"read_by": {"$ne": user["id"]}, "sender_id": {"$ne": user["id"], "$ne": None}}),
            "recent_updates": await find_list("project_updates", {"author_id": user["id"]}, limit=10)}


# ---------------- analytics / activity / search ----------------
@router.get("/analytics")
async def analytics(user=Depends(require_roles(*MANAGEMENT))):
    leads = await find_list("leads", {"deleted_at": None}, limit=5000)
    by_status = {s: 0 for s in LEAD_STATUSES}
    by_source, response_times = {}, []
    for l in leads:
        by_status[l["status"]] = by_status.get(l["status"], 0) + 1
        by_source[l.get("source") or "unbekannt"] = by_source.get(l.get("source") or "unbekannt", 0) + 1
        if l.get("first_response_at"):
            from datetime import datetime
            response_times.append((datetime.fromisoformat(l["first_response_at"]) - datetime.fromisoformat(l["created_at"])).total_seconds() / 3600)
    projects = await find_list("projects", {"deleted_at": None}, limit=5000)
    by_stage = {}
    for p in projects:
        by_stage[p["stage"]] = by_stage.get(p["stage"], 0) + 1
    offers = await find_list("offers", {"deleted_at": None, "status": {"$in": ["ACCEPTED", "REJECTED", "EXPIRED"]}}, limit=5000)
    accepted = len([o for o in offers if o["status"] == "ACCEPTED"])
    today = iso()[:10]
    return {"leads_total": len(leads), "leads_by_status": by_status, "lead_conversion_rate": round(by_status.get("GEWONNEN", 0) / len(leads) * 100, 1) if leads else 0,
            "lead_sources": by_source, "avg_response_hours": round(sum(response_times) / len(response_times), 1) if response_times else None,
            "active_projects": len([p for p in projects if p["status"] == "ACTIVE"]), "projects_by_stage": by_stage,
            "overdue_tasks": await db.tasks.count_documents({"deleted_at": None, "status": {"$ne": "ERLEDIGT"}, "due_date": {"$lt": today, "$ne": None}}),
            "offer_acceptance_rate": round(accepted / len(offers) * 100, 1) if offers else None, "offers_decided": len(offers)}


@router.get("/activity")
async def activity(entity: Optional[str] = None, limit: int = 200, user=Depends(require_roles(*MANAGEMENT))):
    q = {"entity": entity} if entity else {}
    return await find_list("activity_logs", q, limit=min(limit, 1000))


@router.get("/search")
async def search(q: str, user=Depends(require_roles(*STAFF))):
    rx = {"$regex": q, "$options": "i"}
    return {
        "customers": await find_list("customers", {"deleted_at": None, "$or": [{"name": rx}, {"email": rx}, {"phone": rx}, {"address": rx}]}, limit=10),
        "projects": await find_list("projects", {"deleted_at": None, "$or": [{"name": rx}, {"number": rx}, {"address": rx}, {"customer_name": rx}]}, limit=10),
        "leads": await find_list("leads", {"deleted_at": None, "$or": [{"name": rx}, {"email": rx}, {"phone": rx}, {"address": rx}]}, limit=10),
        "offers": await find_list("offers", {"deleted_at": None, "number": rx}, limit=10),
        "invoices": await find_list("invoices", {"deleted_at": None, "number": rx}, limit=10),
        "documents": await find_list("files", {"deleted_at": None, "kind": "document", "$or": [{"title": rx}, {"filename": rx}]}, limit=10),
    }


# ---------------- settings ----------------
@router.get("/settings")
async def get_settings(user=Depends(require_roles(*MANAGEMENT))):
    s = await db.settings.find_one({"id": "global"}, {"_id": 0}) or {"id": "global"}
    s.setdefault("workflow_stages", DEFAULT_STAGES)
    s.setdefault("project_number_format", "OKA-{year}-{seq:04d}")
    s.setdefault("offer_number_format", "AN-{year}-{seq:04d}")
    s.setdefault("invoice_number_format", "RE-{year}-{seq:04d}")
    return s


@router.put("/settings")
async def put_settings(body: dict, user=Depends(require_roles(*ADMINS))):
    body.pop("id", None)
    old = await db.settings.find_one({"id": "global"}, {"_id": 0})
    await db.settings.update_one({"id": "global"}, {"$set": body}, upsert=True)
    await log_activity(user, "SETTINGS_UPDATED", "settings", "global", old=old, new=body)
    return await get_settings(user)


@router.get("/email-outbox")
async def email_outbox(user=Depends(require_roles(*ADMINS))):
    return await find_list("email_outbox", {}, limit=100)
