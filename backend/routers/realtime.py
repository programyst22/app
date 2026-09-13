"""Realtime chat over WebSockets: per-project rooms, typing, read receipts, reconnect-safe."""
import asyncio, json
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from starlette.requests import Request

from core import db, iso, get_current_user, project_for_user, logger

router = APIRouter(tags=["realtime"])


class Hub:
    def __init__(self):
        self.rooms: Dict[str, Set[WebSocket]] = {}
        self.users: Dict[WebSocket, dict] = {}

    async def join(self, pid: str, ws: WebSocket, user: dict):
        self.rooms.setdefault(pid, set()).add(ws)
        self.users[ws] = user

    def leave(self, pid: str, ws: WebSocket):
        self.rooms.get(pid, set()).discard(ws)
        self.users.pop(ws, None)

    async def broadcast(self, pid: str, event: dict, exclude: WebSocket = None):
        dead = []
        for ws in list(self.rooms.get(pid, set())):
            if ws is exclude:
                continue
            try:
                await ws.send_text(json.dumps(event, default=str))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.leave(pid, ws)

    def online(self, pid: str) -> list:
        return [{"id": u["id"], "name": f"{u.get('first_name','')} {u.get('last_name','')}".strip()} for ws, u in self.users.items() if ws in self.rooms.get(pid, set())]


hub = Hub()


async def emit(pid: str, event_type: str, payload: dict):
    """Called from REST handlers (messages, typing, uploads) so REST + WS stay consistent."""
    try:
        await hub.broadcast(pid, {"type": event_type, **payload})
    except Exception as e:
        logger.warning("ws emit failed: %s", e)


@router.websocket("/ws/projects/{pid}")
async def project_socket(ws: WebSocket, pid: str, token: str = ""):
    # authenticate via token query param (same JWT / session token as REST)
    scope = dict(ws.scope)
    scope["type"] = "http"
    scope["headers"] = list(scope.get("headers", [])) + [(b"authorization", f"Bearer {token}".encode())]
    try:
        user = await get_current_user(Request(scope))
        await project_for_user(pid, user)
    except HTTPException:
        await ws.close(code=4401)
        return
    await ws.accept()
    await hub.join(pid, ws, user)
    await hub.broadcast(pid, {"type": "presence", "online": hub.online(pid)})
    try:
        while True:
            raw = await ws.receive_text()
            try:
                data = json.loads(raw)
            except Exception:
                continue
            t = data.get("type")
            name = f"{user.get('first_name','')} {user.get('last_name','')}".strip() or user["email"]
            if t == "typing":
                await hub.broadcast(pid, {"type": "typing", "user_id": user["id"], "user_name": name, "at": iso()}, exclude=ws)
            elif t == "read":
                await db.messages.update_many({"project_id": pid, "read_by": {"$ne": user["id"]}}, {"$addToSet": {"read_by": user["id"]}})
                await hub.broadcast(pid, {"type": "read", "user_id": user["id"], "at": iso()}, exclude=ws)
            elif t == "ping":
                await ws.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.info("ws closed: %s", e)
    finally:
        hub.leave(pid, ws)
        await hub.broadcast(pid, {"type": "presence", "online": hub.online(pid)})
