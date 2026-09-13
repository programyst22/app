import io
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from core import (db, iso, uid, now, require_roles, get_current_user, log_activity, notify, find_list, get_or_404,
                  next_number, is_staff, MANAGEMENT, STAFF)

router = APIRouter(tags=["commerce"])

OFFER_STATUSES = ["DRAFT", "SENT", "VIEWED", "ACCEPTED", "REJECTED", "EXPIRED"]
INVOICE_STATUSES = ["OPEN", "PAID", "OVERDUE", "CANCELLED"]
COMPANY = ["OKA Bau GmbH & Co. KG", "Alfred-Nobel-Straße 9", "86156 Augsburg", "+49 821 65085943 · info@okabau.de"]


class Item(BaseModel):
    description: str
    quantity: float = 1
    unit: str = "Stk."
    unit_price: float = 0


class OfferBody(BaseModel):
    customer_id: str
    project_id: Optional[str] = None
    date: Optional[str] = None
    expiration_date: Optional[str] = None
    items: List[Item] = []
    vat_rate: float = 19.0
    notes: str = ""


class InvoiceBody(BaseModel):
    customer_id: str
    project_id: Optional[str] = None
    offer_id: Optional[str] = None
    issue_date: Optional[str] = None
    due_date: Optional[str] = None
    items: List[Item] = []
    vat_rate: float = 19.0
    notes: str = ""


def totals(items: List[dict], vat_rate: float) -> dict:
    subtotal = round(sum(i["quantity"] * i["unit_price"] for i in items), 2)
    vat = round(subtotal * vat_rate / 100, 2)
    return {"subtotal": subtotal, "vat": vat, "total": round(subtotal + vat, 2)}


def render_pdf(kind: str, doc: dict, customer: dict) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    c.setFont("Helvetica-Bold", 22); c.drawString(20 * mm, h - 25 * mm, "OKA Bau")
    c.setFont("Helvetica", 9)
    for i, line in enumerate(COMPANY):
        c.drawRightString(w - 20 * mm, h - (20 + i * 4.5) * mm, line)
    c.setFont("Helvetica", 10)
    y = h - 55 * mm
    for line in [customer.get("name", ""), customer.get("address", ""), f"{customer.get('postal_code','')} {customer.get('city','')}".strip()]:
        c.drawString(20 * mm, y, line); y -= 5 * mm
    c.setFont("Helvetica-Bold", 16)
    title = "Angebot" if kind == "offer" else "Rechnung"
    c.drawString(20 * mm, h - 85 * mm, f"{title} {doc['number']}")
    c.setFont("Helvetica", 10)
    c.drawString(20 * mm, h - 92 * mm, f"Datum: {doc.get('date') or doc.get('issue_date','')[:10]}")
    sec = f"Gültig bis: {doc.get('expiration_date','')}" if kind == "offer" else f"Fällig am: {doc.get('due_date','')}"
    c.drawString(90 * mm, h - 92 * mm, sec)
    if doc.get("project_number"):
        c.drawString(20 * mm, h - 98 * mm, f"Projekt: {doc['project_number']}")
    y = h - 112 * mm
    c.setFont("Helvetica-Bold", 9)
    for x, t in [(20, "Pos."), (32, "Beschreibung"), (120, "Menge"), (140, "Einheit"), (160, "Einzelpreis"), (185, "Gesamt")]:
        c.drawString(x * mm, y, t)
    c.line(20 * mm, y - 2 * mm, w - 20 * mm, y - 2 * mm)
    y -= 8 * mm
    c.setFont("Helvetica", 9)
    for i, it in enumerate(doc["items"], 1):
        c.drawString(20 * mm, y, str(i)); c.drawString(32 * mm, y, it["description"][:60])
        c.drawString(120 * mm, y, f"{it['quantity']:g}"); c.drawString(140 * mm, y, it["unit"])
        c.drawRightString(180 * mm, y, f"{it['unit_price']:.2f} €"); c.drawRightString(w - 20 * mm, y, f"{it['quantity'] * it['unit_price']:.2f} €")
        y -= 6 * mm
        if y < 50 * mm:
            c.showPage(); y = h - 30 * mm; c.setFont("Helvetica", 9)
    y -= 4 * mm
    c.line(120 * mm, y, w - 20 * mm, y); y -= 7 * mm
    for label, val in [("Nettobetrag", doc["subtotal"]), (f"MwSt. {doc['vat_rate']:g}%", doc["vat"]), ("Gesamtbetrag", doc["total"])]:
        c.setFont("Helvetica-Bold" if label == "Gesamtbetrag" else "Helvetica", 10)
        c.drawString(120 * mm, y, label); c.drawRightString(w - 20 * mm, y, f"{val:.2f} €"); y -= 6 * mm
    if doc.get("notes"):
        y -= 6 * mm; c.setFont("Helvetica", 9)
        for line in doc["notes"].split("\n")[:8]:
            c.drawString(20 * mm, y, line[:110]); y -= 5 * mm
    if kind == "offer" and doc.get("acceptance"):
        a = doc["acceptance"]; y -= 8 * mm
        c.setFont("Helvetica-Oblique", 8)
        c.drawString(20 * mm, y, f"Digital angenommen am {a['timestamp'][:19]} durch {a['user_email']} (Version {a['offer_version']}). Ersetzt keine gesetzlich vorgeschriebene Unterschrift.")
    c.showPage(); c.save()
    return buf.getvalue()


async def _client_ids(customer_id: str) -> list:
    return [u["id"] async for u in db.users.find({"customer_id": customer_id}, {"_id": 0, "id": 1})]


def _scope(user: dict) -> dict:
    return {} if is_staff(user) else {"customer_id": user.get("customer_id") or "-", "status": {"$ne": "DRAFT"}}


# ---------------- offers ----------------
@router.get("/offers")
async def list_offers(project_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {"deleted_at": None, **_scope(user)}
    if project_id:
        q["project_id"] = project_id
    return await find_list("offers", q)


@router.post("/offers", status_code=201)
async def create_offer(body: OfferBody, user=Depends(require_roles(*MANAGEMENT))):
    customer = await get_or_404("customers", body.customer_id, "Kunde nicht gefunden")
    project = await db.projects.find_one({"id": body.project_id}, {"_id": 0}) if body.project_id else None
    items = [i.model_dump() for i in body.items]
    o = {"id": uid(), "number": await next_number("offer", "offer_number_format", "AN-{year}-{seq:04d}"), "customer_id": customer["id"], "customer_name": customer["name"],
         "project_id": body.project_id, "project_number": project["number"] if project else None, "date": body.date or iso()[:10], "expiration_date": body.expiration_date,
         "items": items, "vat_rate": body.vat_rate, **totals(items, body.vat_rate), "notes": body.notes, "status": "DRAFT", "version": 1, "acceptance": None,
         "created_by": user["id"], "created_at": iso(), "updated_at": iso(), "deleted_at": None}
    await db.offers.insert_one(dict(o))
    await log_activity(user, "OFFER_CREATED", "offer", o["id"], new={"number": o["number"], "total": o["total"]})
    o.pop("_id", None)
    return o


@router.get("/offers/{oid}")
async def get_offer(oid: str, user=Depends(get_current_user)):
    o = await get_or_404("offers", oid)
    if not is_staff(user):
        if o["customer_id"] != user.get("customer_id") or o["status"] == "DRAFT":
            raise HTTPException(403, "Kein Zugriff")
        if o["status"] == "SENT":
            await db.offers.update_one({"id": oid}, {"$set": {"status": "VIEWED", "viewed_at": iso()}})
            o["status"] = "VIEWED"
    return o


@router.patch("/offers/{oid}")
async def update_offer(oid: str, body: dict, user=Depends(require_roles(*MANAGEMENT))):
    o = await get_or_404("offers", oid)
    if o["status"] in ("ACCEPTED", "REJECTED"):
        raise HTTPException(409, "Angebot ist abgeschlossen")
    body.pop("id", None); body.pop("number", None)
    if "items" in body:
        body.update(totals(body["items"], body.get("vat_rate", o["vat_rate"])))
        body["version"] = o["version"] + 1
    if body.get("status") and body["status"] not in OFFER_STATUSES:
        raise HTTPException(422, "Ungültiger Status")
    body["updated_at"] = iso()
    await db.offers.update_one({"id": oid}, {"$set": body})
    if body.get("status") == "SENT" and o["status"] != "SENT":
        await notify(await _client_ids(o["customer_id"]), "Angebot verfügbar", f"Angebot {o['number']} liegt für Sie bereit.", f"/client/offer/{oid}", "offer", email=True)
    await log_activity(user, "OFFER_UPDATED", "offer", oid, {"status": o["status"]}, {k: body.get(k) for k in ("status", "total") if k in body})
    return await get_or_404("offers", oid)


@router.post("/offers/{oid}/respond")
async def respond_offer(oid: str, body: dict, request: Request, user=Depends(get_current_user)):
    o = await get_or_404("offers", oid)
    if o["customer_id"] != user.get("customer_id") and not is_staff(user):
        raise HTTPException(403, "Kein Zugriff")
    if o["status"] not in ("SENT", "VIEWED"):
        raise HTTPException(409, "Angebot kann nicht mehr beantwortet werden")
    if o.get("expiration_date") and o["expiration_date"] < iso()[:10]:
        await db.offers.update_one({"id": oid}, {"$set": {"status": "EXPIRED"}})
        raise HTTPException(409, "Angebot ist abgelaufen")
    accept = bool(body.get("accept"))
    acceptance = {"user_id": user["id"], "user_email": user["email"], "timestamp": iso(), "ip": request.client.host if request.client else None,
                  "offer_version": o["version"], "status": "ACCEPTED" if accept else "REJECTED", "reason": body.get("reason", "")}
    await db.offers.update_one({"id": oid}, {"$set": {"status": acceptance["status"], "acceptance": acceptance, "updated_at": iso()}})
    await log_activity(user, "OFFER_" + acceptance["status"], "offer", oid, o["status"], acceptance["status"])
    staff = [u["id"] async for u in db.users.find({"role": {"$in": MANAGEMENT}}, {"_id": 0, "id": 1})]
    await notify(staff, "Angebot angenommen" if accept else "Angebot abgelehnt", f"{o['number']} · {o['customer_name']}", f"/admin/offers", "offer")
    if accept and o.get("project_id"):
        await db.projects.update_one({"id": o["project_id"]}, {"$set": {"stage": "ANGEBOT ANGENOMMEN", "updated_at": iso()}, "$push": {"stage_history": {"stage": "ANGEBOT ANGENOMMEN", "at": iso(), "by": user["id"]}}})
    return {"ok": True, "status": acceptance["status"], "message": "Vielen Dank. Ihre Entscheidung wurde gespeichert." + (" Die digitale Annahme ersetzt keine gesetzlich vorgeschriebene Unterschrift." if accept else "")}


@router.get("/offers/{oid}/pdf")
async def offer_pdf(oid: str, user=Depends(get_current_user)):
    o = await get_or_404("offers", oid)
    if not is_staff(user) and (o["customer_id"] != user.get("customer_id") or o["status"] == "DRAFT"):
        raise HTTPException(403, "Kein Zugriff")
    customer = await db.customers.find_one({"id": o["customer_id"]}, {"_id": 0}) or {}
    return StreamingResponse(io.BytesIO(render_pdf("offer", o, customer)), media_type="application/pdf", headers={"Content-Disposition": f"inline; filename={o['number']}.pdf"})


# ---------------- invoices ----------------
@router.get("/invoices")
async def list_invoices(project_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {"deleted_at": None}
    if not is_staff(user):
        q["customer_id"] = user.get("customer_id") or "-"
    if project_id:
        q["project_id"] = project_id
    items = await find_list("invoices", q)
    today = iso()[:10]
    for i in items:
        if i["status"] == "OPEN" and i.get("due_date") and i["due_date"] < today:
            i["status"] = "OVERDUE"
            await db.invoices.update_one({"id": i["id"]}, {"$set": {"status": "OVERDUE"}})
    return items


@router.post("/invoices", status_code=201)
async def create_invoice(body: InvoiceBody, user=Depends(require_roles(*MANAGEMENT))):
    customer = await get_or_404("customers", body.customer_id, "Kunde nicht gefunden")
    project = await db.projects.find_one({"id": body.project_id}, {"_id": 0}) if body.project_id else None
    items = [i.model_dump() for i in body.items]
    if body.offer_id and not items:
        offer = await get_or_404("offers", body.offer_id)
        items = offer["items"]
    inv = {"id": uid(), "number": await next_number("invoice", "invoice_number_format", "RE-{year}-{seq:04d}"), "customer_id": customer["id"], "customer_name": customer["name"],
           "project_id": body.project_id, "project_number": project["number"] if project else None, "offer_id": body.offer_id, "issue_date": body.issue_date or iso()[:10],
           "due_date": body.due_date, "items": items, "vat_rate": body.vat_rate, **totals(items, body.vat_rate), "notes": body.notes, "status": "OPEN",
           "created_by": user["id"], "created_at": iso(), "updated_at": iso(), "deleted_at": None}
    inv["amount"] = inv["total"]
    await db.invoices.insert_one(dict(inv))
    await log_activity(user, "INVOICE_CREATED", "invoice", inv["id"], new={"number": inv["number"], "total": inv["total"]})
    await notify(await _client_ids(customer["id"]), "Rechnung verfügbar", f"Rechnung {inv['number']} liegt für Sie bereit.", f"/client/project/{body.project_id}" if body.project_id else "/", "invoice", email=True)
    inv.pop("_id", None)
    return inv


@router.patch("/invoices/{iid}")
async def update_invoice(iid: str, body: dict, user=Depends(require_roles(*MANAGEMENT))):
    inv = await get_or_404("invoices", iid)
    body.pop("id", None); body.pop("number", None)
    if body.get("status") and body["status"] not in INVOICE_STATUSES:
        raise HTTPException(422, "Ungültiger Status")
    if body.get("status") == "PAID":
        body["paid_at"] = iso()
    body["updated_at"] = iso()
    await db.invoices.update_one({"id": iid}, {"$set": body})
    await log_activity(user, "INVOICE_UPDATED", "invoice", iid, {"status": inv["status"]}, {"status": body.get("status")})
    return await get_or_404("invoices", iid)


@router.get("/invoices/{iid}/pdf")
async def invoice_pdf(iid: str, user=Depends(get_current_user)):
    inv = await get_or_404("invoices", iid)
    if not is_staff(user) and inv["customer_id"] != user.get("customer_id"):
        raise HTTPException(403, "Kein Zugriff")
    customer = await db.customers.find_one({"id": inv["customer_id"]}, {"_id": 0}) or {}
    return StreamingResponse(io.BytesIO(render_pdf("invoice", inv, customer)), media_type="application/pdf", headers={"Content-Disposition": f"inline; filename={inv['number']}.pdf"})
