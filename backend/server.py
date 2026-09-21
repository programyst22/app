import asyncio, logging, inspect
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from core import client, init_storage, logger
from seed import seed
from routers import auth, crm, projects, commerce, comms, files, admin, realtime

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

app = FastAPI(title="OKA Bau API", version="1.0.0")
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"service": "OKA Bau API", "status": "ok"}


@api.get("/health")
async def health():
    return {"status": "ok"}


for r in (auth.router, crm.router, projects.router, commerce.router, comms.router, files.router, admin.router, realtime.router):
    api.include_router(r)
app.include_router(api)

app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


async def reminder_loop():
    """Appointment reminders (24h before) – runs hourly, idempotent via reminder_sent flag."""
    from datetime import timedelta
    from core import db, now, iso, notify
    while True:
        try:
            soon = (now() + timedelta(hours=24)).isoformat()
            async for a in db.appointments.find({"deleted_at": None, "reminder_sent": {"$ne": True}, "start": {"$gte": iso(), "$lte": soon}}, {"_id": 0}):
                ids = [a.get("employee_id")] + ([u["id"] async for u in db.users.find({"customer_id": a.get("customer_id")}, {"_id": 0, "id": 1})] if a.get("customer_id") else [])
                await notify(ids, "Termin morgen", f"{a['type']} · {a['start'][:16].replace('T', ' ')}{' · ' + a['location'] if a.get('location') else ''}", f"/client/project/{a.get('project_id')}" if a.get("project_id") else "/", "appointment", email=True)
                await db.appointments.update_one({"id": a["id"]}, {"$set": {"reminder_sent": True}})
        except Exception as e:
            logger.warning("reminder loop: %s", e)
        await asyncio.sleep(3600)


@app.on_event("startup")
async def on_startup():
    await seed()
    asyncio.create_task(reminder_loop())
    try:
        init_storage()
    except Exception as e:
        logger.warning("Storage init failed (will retry lazily): %s", e)


@app.on_event("shutdown")
async def shutdown_db_client():
    result = client.close()
    if inspect.isawaitable(result):
        await result
