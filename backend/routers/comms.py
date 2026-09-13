from datetime import timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core import (db, iso, uid, now, require_roles, get_current_user, log_activity, notify, find_list, get_or_404, project_for_user,
                  signed_url, is_staff, STAFF, MANAGEMENT, APPOINTMENT_TYPES)

router = APIRouter(tags=["comms"])


class MessageBody(BaseModel):
    text: str = ""
    attachment_ids: List[str] = []


class AppointmentBody(BaseModel):
    type: str
    title: str
    start: str
    end: Optional[str] = None
    location: str = ""
    description: str = ""
    project_id: Optional[str] = None
    employee_id: Optional[str] = None
    customer_id: Optional[str] = None


async def _attachments(ids: list) -> list:
    files = {f["id"]: f async for f in db.files.find({"id": {"$in": ids}}, {"_id": 0, "id": 1, "content_type": 1, "filename": 1})}
    return [{"id": a, "url": signed_url(a), "content_type": files.get(a, {}).get("content_type"), "filename": files.get(a, {}).get("filename")} for a in ids]


# ---------------- messages ----------------
@router.get("/projects/{pid}/messages")
async def list_messages(pid: str, after: Optional[str] = None, user=Depends(get_current_user)):
    await project_for_user(pid, user)
    q = {"project_id": pid}
    if after:
        q["created_at"] = {"$gt": after}
    msgs = await find_list("messages", q, sort=("created_at", 1), limit=300)
    for m in msgs:
        m["attachments"] = await _attachments(m.get("attachment_ids", []))
        m["mine"] = m.get("sender_id") == user["id"]
    await db.messages.update_many({"project_id": pid, "read_by": {"$ne": user["id"]}}, {"$addToSet": {"read_by": user["id"]}})
    from routers.realtime import emit, hub
    await emit(pid, "read", {"user_id": user["id"], "at": iso()})
    cutoff = (now() - timedelta(seconds=6)).isoformat()
    typing = [t["user_name"] async for t in db.typing.find({"project_id": pid, "user_id": {"$ne": user["id"]}, "at": {"$gt": cutoff}}, {"_id": 0})]
    return {"messages": msgs, "typing": typing, "online": hub.online(pid)}


@router.post("/projects/{pid}/messages", status_code=201)
async def send_message(pid: str, body: MessageBody, user=Depends(get_current_user)):
    p = await project_for_user(pid, user)
    if not body.text.strip() and not body.attachment_ids:
        raise HTTPException(422, "Nachricht leer")
    name = f"{user.get('first_name','')} {user.get('last_name','')}".strip() or user["email"]
    m = {"id": uid(), "project_id": pid, "sender_id": user["id"], "sender_name": name, "sender_role": user["role"], "type": "text",
         "text": body.text.strip(), "attachment_ids": body.attachment_ids, "read_by": [user["id"]], "created_at": iso()}
    await db.messages.insert_one(dict(m))
    await db.typing.delete_many({"project_id": pid, "user_id": user["id"]})
    m.pop("_id", None)
    m["attachments"] = await _attachments(body.attachment_ids)
    from routers.realtime import emit
    await emit(pid, "message", {"message": {**m, "mine": False}})
    recipients = set(p.get("employee_ids", []) + [p.get("project_manager_id")])
    recipients |= {u["id"] async for u in db.users.find({"customer_id": p["customer_id"]}, {"_id": 0, "id": 1})}
    recipients.discard(user["id"])
    await notify(list(recipients), "Neue Nachricht", f"{name}: {body.text[:80]}", f"/client/chat/{pid}" , "message")
    m["mine"] = True
    return m


@router.post("/projects/{pid}/typing")
async def typing(pid: str, user=Depends(get_current_user)):
    await project_for_user(pid, user)
    name = f"{user.get('first_name','')} {user.get('last_name','')}".strip() or user["email"]
    await db.typing.update_one({"project_id": pid, "user_id": user["id"]}, {"$set": {"user_name": name, "at": iso()}}, upsert=True)
    from routers.realtime import emit
    await emit(pid, "typing", {"user_id": user["id"], "user_name": name, "at": iso()})
    return {"ok": True}


@router.get("/messages/inbox")
async def inbox(user=Depends(get_current_user)):
    q = {"deleted_at": None}
    if user["role"] == "CLIENT":
        q["customer_id"] = user.get("customer_id") or "-"
    elif user["role"] == "EMPLOYEE":
        q["$or"] = [{"employee_ids": user["id"]}, {"project_manager_id": user["id"]}]
    out = []
    for p in await find_list("projects", q):
        last = await db.messages.find_one({"project_id": p["id"]}, {"_id": 0}, sort=[("created_at", -1)])
        unread = await db.messages.count_documents({"project_id": p["id"], "read_by": {"$ne": user["id"]}, "sender_id": {"$ne": user["id"]}})
        out.append({"project_id": p["id"], "project_number": p["number"], "project_name": p["name"], "customer_name": p.get("customer_name"), "last_message": last, "unread": unread})
    out.sort(key=lambda x: (x["last_message"] or {}).get("created_at", ""), reverse=True)
    return out


# ---------------- appointments ----------------
@router.get("/appointments")
async def list_appointments(start: Optional[str] = None, end: Optional[str] = None, project_id: Optional[str] = None, employee_id: Optional[str] = None,
                            type: Optional[str] = None, user=Depends(get_current_user)):
    q = {"deleted_at": None}
    if user["role"] == "CLIENT":
        q["customer_id"] = user.get("customer_id") or "-"
    elif user["role"] == "EMPLOYEE":
        q["employee_id"] = user["id"]
    if start:
        q["start"] = {"$gte": start}
    if end:
        q.setdefault("start", {})["$lte"] = end
    if project_id:
        q["project_id"] = project_id
    if employee_id:
        q["employee_id"] = employee_id
    if type:
        q["type"] = type
    return await find_list("appointments", q, sort=("start", 1))


@router.post("/appointments", status_code=201)
async def create_appointment(body: AppointmentBody, user=Depends(require_roles(*STAFF))):
    if body.type not in APPOINTMENT_TYPES:
        raise HTTPException(422, "Ungültiger Terminart")
    customer_id = body.customer_id
    project = None
    if body.project_id:
        project = await get_or_404("projects", body.project_id)
        customer_id = customer_id or project["customer_id"]
    a = {"id": uid(), **body.model_dump(), "customer_id": customer_id, "project_number": project["number"] if project else None,
         "employee_id": body.employee_id or user["id"], "confirmation_status": "PENDING", "created_by": user["id"], "created_at": iso(), "updated_at": iso(), "deleted_at": None}
    await db.appointments.insert_one(dict(a))
    if customer_id:
        cids = [u["id"] async for u in db.users.find({"customer_id": customer_id}, {"_id": 0, "id": 1})]
        await notify(cids, "Neuer Termin", f"{body.type}: {body.start[:16].replace('T', ' ')}", f"/client/project/{body.project_id}" if body.project_id else "/", "appointment", email=True)
    await log_activity(user, "APPOINTMENT_CREATED", "appointment", a["id"], new={"type": body.type, "start": body.start})
    a.pop("_id", None)
    return a


@router.patch("/appointments/{aid}")
async def update_appointment(aid: str, body: dict, user=Depends(get_current_user)):
    a = await get_or_404("appointments", aid)
    if user["role"] == "CLIENT":
        if a.get("customer_id") != user.get("customer_id"):
            raise HTTPException(403, "Kein Zugriff")
        body = {"confirmation_status": body.get("confirmation_status", a["confirmation_status"])}
    body.pop("id", None); body["updated_at"] = iso()
    await db.appointments.update_one({"id": aid}, {"$set": body})
    return await get_or_404("appointments", aid)


@router.delete("/appointments/{aid}")
async def delete_appointment(aid: str, user=Depends(require_roles(*STAFF))):
    await db.appointments.update_one({"id": aid}, {"$set": {"deleted_at": iso()}})
    return {"ok": True}


# ---------------- notifications ----------------
@router.get("/notifications")
async def list_notifications(user=Depends(get_current_user)):
    return await find_list("notifications", {"user_id": user["id"]}, limit=100)


@router.post("/notifications/read")
async def mark_read(body: dict, user=Depends(get_current_user)):
    q = {"user_id": user["id"]}
    if body.get("ids"):
        q["id"] = {"$in": body["ids"]}
    await db.notifications.update_many(q, {"$set": {"read": True}})
    return {"ok": True}
