import logging
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from core import client, init_storage, logger
from seed import seed
from routers import auth, crm, projects, commerce, comms, files, admin

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

app = FastAPI(title="OKA Bau API", version="1.0.0")
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"service": "OKA Bau API", "status": "ok"}


@api.get("/health")
async def health():
    return {"status": "ok"}


for r in (auth.router, crm.router, projects.router, commerce.router, comms.router, files.router, admin.router):
    api.include_router(r)
app.include_router(api)

app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def on_startup():
    await seed()
    try:
        init_storage()
    except Exception as e:
        logger.warning("Storage init failed (will retry lazily): %s", e)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
