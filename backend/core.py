"""Shared infrastructure: db, auth, activity log, notifications, storage."""
import os, uuid, logging, secrets, hashlib
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, Any

import jwt, bcrypt, httpx, requests
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.concurrency import run_in_threadpool

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logger = logging.getLogger("oka")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ISSUER = os.environ.get("JWT_ISSUER", "oka-bau-api")
ACCESS_HOURS = 24 * 7
APP_NAME = os.environ.get("APP_NAME", "oka-bau")

ROLES = ["CLIENT", "EMPLOYEE", "PROJECT_MANAGER", "MANAGER", "ADMIN", "SUPER_ADMIN"]
STAFF = ["EMPLOYEE", "PROJECT_MANAGER", "MANAGER", "ADMIN", "SUPER_ADMIN"]
MANAGEMENT = ["PROJECT_MANAGER", "MANAGER", "ADMIN", "SUPER_ADMIN"]
ADMINS = ["ADMIN", "SUPER_ADMIN"]

DEFAULT_STAGES = [
    "ANFRAGE", "KONTAKTAUFNAHME", "BESICHTIGUNG", "ANGEBOT", "VERHANDLUNG",
    "ANGEBOT ANGENOMMEN", "AUFTRAG", "PROJEKTPLANUNG", "BAUSTELLENVORBEREITUNG",
    "AUSFÜHRUNG", "QUALITÄTSKONTROLLE", "ABNAHME", "RECHNUNG", "ZAHLUNG",
    "PROJEKT ABGESCHLOSSEN", "ARCHIV",
]
LEAD_STATUSES = ["NEU", "KONTAKTIERT", "BESICHTIGUNG", "ANGEBOT", "VERHANDLUNG", "GEWONNEN", "VERLOREN"]
ZONE_STATUSES = ["PLANNED", "IN_PROGRESS", "WAITING", "COMPLETED", "PROBLEM"]
TASK_STATUSES = ["OFFEN", "IN ARBEIT", "BLOCKIERT", "ERLEDIGT"]
DOC_CATEGORIES = ["Angebot", "Auftragsbestätigung", "Rechnung", "Plan", "Grundriss", "Protokoll", "Abnahme", "Foto", "Vertrag", "Sonstiges"]
APPOINTMENT_TYPES = ["Beratung", "Besichtigung", "Baustellentermin", "Abnahme", "Sonstiges"]
SERVICES = [
    {"key": "innenausbau", "title": "Innenausbau & Trockenbau", "short": "Wände, Decken, Verkleidungen und Ausbauarbeiten sauber koordiniert.", "zones": ["walls", "ceiling"]},
    {"key": "renovierung", "title": "Renovierung & Badsanierung", "short": "Von der Vorbereitung bis zum fertigen Raum – strukturiert und zuverlässig.", "zones": ["bathroom", "interior"]},
    {"key": "boden", "title": "Boden & Leisten", "short": "Saubere Untergründe, präzise Verlegung und stimmige Abschlüsse.", "zones": ["floor"]},
    {"key": "tueren", "title": "Türen & Fenstermontage", "short": "Montage, Anpassung und saubere Anschlüsse für Bestand und Neubau.", "zones": ["doors", "windows"]},
    {"key": "hausmeister", "title": "Hausmeisterservice", "short": "Laufende Objektbetreuung und kleine Instandhaltungen.", "zones": ["exterior"]},
    {"key": "reinigung", "title": "Reinigung", "short": "Reinigung für private und gewerbliche Objekte.", "zones": ["exterior", "interior"]},
]


def now() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: Optional[datetime] = None) -> str:
    return (dt or now()).isoformat()


def uid() -> str:
    return str(uuid.uuid4())


def clean(doc: Optional[dict]) -> Optional[dict]:
    if doc is None:
        return None
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


async def find_list(coll, query: dict, sort=("created_at", -1), limit=500) -> list:
    cur = db[coll].find(query, {"_id": 0}).sort(*sort).limit(limit)
    return [d async for d in cur]


async def get_or_404(coll: str, id: str, msg="Nicht gefunden") -> dict:
    doc = await db[coll].find_one({"id": id, "deleted_at": None}, {"_id": 0})
    if not doc:
        raise HTTPException(404, msg)
    return doc


# ---------------- auth ----------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_access_token(user: dict) -> str:
    return jwt.encode({
        "sub": user["id"], "role": user["role"], "iss": JWT_ISSUER,
        "iat": now(), "exp": now() + timedelta(hours=ACCESS_HOURS), "jti": secrets.token_hex(8),
    }, JWT_SECRET, algorithm="HS256")


def public_user(u: dict) -> dict:
    return {k: u.get(k) for k in ["id", "email", "first_name", "last_name", "role", "phone", "customer_id", "picture", "email_verified", "created_at"]}


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else request.query_params.get("token")
    if not token:
        raise HTTPException(401, "Nicht angemeldet")
    user = None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], issuer=JWT_ISSUER)
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    except jwt.InvalidTokenError:
        sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if sess:
            exp = sess["expires_at"]
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp > now():
                user = await db.users.find_one({"id": sess["user_id"]}, {"_id": 0})
    if not user or user.get("disabled"):
        raise HTTPException(401, "Sitzung ungültig")
    return user


def require_roles(*roles):
    async def dep(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, "Keine Berechtigung")
        return user
    return dep


def is_staff(user: dict) -> bool:
    return user["role"] in STAFF


async def can_access_project(user: dict, project: dict) -> bool:
    if user["role"] in MANAGEMENT:
        return True
    if user["role"] == "EMPLOYEE":
        return user["id"] in project.get("employee_ids", []) or user["id"] == project.get("project_manager_id")
    return user.get("customer_id") == project.get("customer_id")


async def project_for_user(project_id: str, user: dict) -> dict:
    project = await get_or_404("projects", project_id, "Projekt nicht gefunden")
    if not await can_access_project(user, project):
        raise HTTPException(403, "Kein Zugriff auf dieses Projekt")
    return project


# ---------------- activity ----------------
async def log_activity(user: Optional[dict], action: str, entity: str, entity_id: str, old: Any = None, new: Any = None, note: str = ""):
    await db.activity_logs.insert_one({
        "id": uid(), "user_id": user["id"] if user else None,
        "user_name": f"{user.get('first_name','')} {user.get('last_name','')}".strip() if user else "System",
        "action": action, "entity": entity, "entity_id": entity_id,
        "old_value": old, "new_value": new, "note": note, "created_at": iso(),
    })


# ---------------- notifications ----------------
PUSH_BASE_URL = "https://integrations.emergentagent.com"
_push_client = httpx.AsyncClient(base_url=PUSH_BASE_URL, headers={"X-Push-Key": os.environ.get("EMERGENT_PUSH_KEY", "placeholder")}, timeout=10.0)


async def register_push_upstream(body: dict):
    resp = await _push_client.post("/api/v1/push/users/register", json=body)
    if resp.status_code == 401:
        raise HTTPException(500, "EMERGENT_PUSH_KEY missing or invalid")
    if resp.status_code >= 500:
        raise HTTPException(502, "Push provider unavailable")
    resp.raise_for_status()


async def send_push(recipients: list, data: dict, idempotency_key: Optional[str] = None):
    if not recipients:
        return
    payload = {"recipients": recipients[:100], "data": data}
    if idempotency_key:
        payload["$idempotency_key"] = idempotency_key
    resp = await _push_client.post("/api/v1/push/trigger", json=payload)
    resp.raise_for_status()


async def send_email(to: str, subject: str, body: str, template: str = "generic"):
    """Transactional email abstraction. Provider can be wired via env later; logs + stores outbox."""
    await db.email_outbox.insert_one({"id": uid(), "to": to, "subject": subject, "body": body, "template": template, "status": "queued", "created_at": iso()})
    logger.info("EMAIL [%s] to=%s subject=%s", template, to, subject)


async def notify(user_ids: list, title: str, message: str, action_url: str = "", kind: str = "info", email: bool = False):
    user_ids = [u for u in set(user_ids) if u]
    if not user_ids:
        return
    docs = [{"id": uid(), "user_id": u, "title": title, "message": message, "action_url": action_url, "kind": kind, "read": False, "created_at": iso()} for u in user_ids]
    await db.notifications.insert_many(docs)
    try:
        await send_push(user_ids, {"title": title, "message": message, "action_url": action_url})
    except Exception as e:  # never block primary op
        logger.warning("Push failed (non-blocking): %s", e)
    if email:
        async for u in db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "email": 1}):
            await send_email(u["email"], title, message, "notification")


# ---------------- storage ----------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
_storage_key = None


def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def _put(path: str, data: bytes, content_type: str) -> dict:
    global _storage_key
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    if resp.status_code == 503:
        _storage_key = None
        key = init_storage()
        resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    if resp.status_code == 402:
        raise HTTPException(402, "Speicherkontingent erschöpft")
    resp.raise_for_status()
    return resp.json()


def _get(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


async def put_object(path: str, data: bytes, content_type: str) -> dict:
    return await run_in_threadpool(_put, path, data, content_type)


async def get_object(path: str):
    return await run_in_threadpool(_get, path)


def make_file_token(file_id: str, minutes: int = 30) -> str:
    return jwt.encode({"fid": file_id, "exp": now() + timedelta(minutes=minutes), "iss": JWT_ISSUER}, JWT_SECRET, algorithm="HS256")


def verify_file_token(token: str) -> Optional[str]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"], issuer=JWT_ISSUER).get("fid")
    except jwt.InvalidTokenError:
        return None


def signed_url(file_id: Optional[str]) -> Optional[str]:
    if not file_id:
        return None
    return f"/api/files/{file_id}?ft={make_file_token(file_id)}"


def sha(v: str) -> str:
    return hashlib.sha256(v.encode()).hexdigest()


async def next_number(kind: str, fmt_key: str, default_fmt: str) -> str:
    settings = await db.settings.find_one({"id": "global"}, {"_id": 0}) or {}
    fmt = settings.get(fmt_key, default_fmt)
    year = now().year
    counter = await db.counters.find_one_and_update({"id": f"{kind}-{year}"}, {"$inc": {"seq": 1}}, upsert=True, return_document=True)
    return fmt.format(year=year, seq=counter["seq"])
