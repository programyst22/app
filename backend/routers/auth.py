import os, secrets
from datetime import timedelta
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr

from core import (db, now, iso, uid, hash_password, verify_password, make_access_token, public_user,
                  get_current_user, require_roles, log_activity, send_email, sha, register_push_upstream, ADMINS, ROLES)

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterBody(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class ResetRequest(BaseModel):
    email: EmailStr


class ResetConfirm(BaseModel):
    token: str
    password: str


class SessionBody(BaseModel):
    session_id: str


class ChangeRole(BaseModel):
    role: str


class PushBody(BaseModel):
    user_id: str
    platform: str
    device_token: str


class UpdateProfile(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None


def _token_response(user: dict):
    return {"access_token": make_access_token(user), "token_type": "bearer", "user": public_user(user)}


class SetupBody(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    setup_token: Optional[str] = None


@router.get("/setup/status")
async def setup_status():
    has_admin = await db.users.find_one({"role": "SUPER_ADMIN", "disabled": False}) is not None
    return {"needs_setup": not has_admin, "token_required": bool(os.environ.get("SETUP_TOKEN"))}


@router.post("/setup", status_code=201)
async def setup_first_admin(body: SetupBody):
    """One-time secure bootstrap: creates the first SUPER_ADMIN. Disabled as soon as one exists.
    Optionally protected by SETUP_TOKEN env var (recommended in production)."""
    if await db.users.find_one({"role": "SUPER_ADMIN", "disabled": False}):
        raise HTTPException(409, "Einrichtung bereits abgeschlossen")
    required = os.environ.get("SETUP_TOKEN")
    if required and body.setup_token != required:
        raise HTTPException(403, "Setup-Token ungültig")
    if len(body.password) < 12:
        raise HTTPException(422, "Passwort muss mindestens 12 Zeichen haben")
    email = body.email.lower()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        await db.users.update_one({"id": existing["id"]}, {"$set": {"role": "SUPER_ADMIN", "password_hash": hash_password(body.password), "disabled": False, "email_verified": True}})
        user = await db.users.find_one({"id": existing["id"]}, {"_id": 0})
    else:
        user = {"id": uid(), "email": email, "password_hash": hash_password(body.password), "first_name": body.first_name.strip(), "last_name": body.last_name.strip(),
                "role": "SUPER_ADMIN", "disabled": False, "email_verified": True, "created_at": iso()}
        await db.users.insert_one(dict(user))
    await log_activity(user, "SETUP_SUPER_ADMIN", "user", user["id"])
    return _token_response(user)


@router.post("/register", status_code=201)
async def register(body: RegisterBody):
    if len(body.password) < 8:
        raise HTTPException(422, "Passwort muss mindestens 8 Zeichen haben")
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "E-Mail bereits registriert")
    user = {"id": uid(), "email": email, "password_hash": hash_password(body.password), "first_name": body.first_name.strip(),
            "last_name": body.last_name.strip(), "phone": body.phone, "role": "CLIENT", "disabled": False,
            "email_verified": False, "verify_token": secrets.token_urlsafe(24), "created_at": iso()}
    await db.users.insert_one(user)
    await send_email(email, "Willkommen bei OKA Bau – E-Mail bestätigen", f"Bitte bestätigen Sie Ihre E-Mail: /auth/verify?token={user['verify_token']}", "verify")
    await log_activity(user, "REGISTER", "user", user["id"])
    return _token_response(user)


@router.post("/login")
async def login(body: LoginBody, request: Request):
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not user or not verify_password(body.password, user.get("password_hash", "")) or user.get("disabled"):
        raise HTTPException(401, "E-Mail oder Passwort falsch")
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_login_at": iso()}})
    await log_activity(user, "LOGIN", "user", user["id"], note=request.client.host if request.client else "")
    return _token_response(user)


@router.post("/magic-link/request")
async def magic_request(body: ResetRequest):
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if user:
        raw = secrets.token_urlsafe(32)
        await db.magic_tokens.insert_one({"token_hash": sha(raw), "user_id": user["id"], "expires_at": now() + timedelta(minutes=15), "used": False})
        await send_email(user["email"], "Ihr Anmeldelink – OKA Bau", f"Anmelden: /auth/magic?token={raw}", "magic_link")
    return {"message": "Falls das Konto existiert, wurde ein Anmeldelink gesendet."}


@router.post("/magic-link/confirm")
async def magic_confirm(token: str):
    t = await db.magic_tokens.find_one_and_update({"token_hash": sha(token), "used": False, "expires_at": {"$gt": now()}}, {"$set": {"used": True}})
    if not t:
        raise HTTPException(400, "Link ungültig oder abgelaufen")
    user = await db.users.find_one({"id": t["user_id"]}, {"_id": 0})
    await db.users.update_one({"id": user["id"]}, {"$set": {"email_verified": True}})
    return _token_response(user)


@router.get("/verify")
async def verify_email(token: str):
    r = await db.users.update_one({"verify_token": token}, {"$set": {"email_verified": True}, "$unset": {"verify_token": ""}})
    if not r.modified_count:
        raise HTTPException(400, "Token ungültig")
    return {"message": "E-Mail bestätigt"}


@router.post("/password-reset/request")
async def reset_request(body: ResetRequest):
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if user:
        raw = secrets.token_urlsafe(32)
        await db.reset_tokens.insert_one({"token_hash": sha(raw), "user_id": user["id"], "expires_at": now() + timedelta(minutes=30), "used": False})
        await send_email(user["email"], "Passwort zurücksetzen – OKA Bau", f"Token: {raw}", "password_reset")
    return {"message": "Falls das Konto existiert, wurde eine E-Mail gesendet."}


@router.post("/password-reset/confirm")
async def reset_confirm(body: ResetConfirm):
    if len(body.password) < 8:
        raise HTTPException(422, "Passwort muss mindestens 8 Zeichen haben")
    t = await db.reset_tokens.find_one_and_update({"token_hash": sha(body.token), "used": False, "expires_at": {"$gt": now()}}, {"$set": {"used": True}})
    if not t:
        raise HTTPException(400, "Token ungültig oder abgelaufen")
    await db.users.update_one({"id": t["user_id"]}, {"$set": {"password_hash": hash_password(body.password)}})
    await log_activity(None, "PASSWORD_RESET", "user", t["user_id"])
    return {"message": "Passwort geändert"}


@router.post("/session")
async def google_session(body: SessionBody):
    async with httpx.AsyncClient(timeout=15) as c:
        resp = await c.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data", headers={"X-Session-ID": body.session_id})
    if resp.status_code != 200:
        raise HTTPException(401, "Google-Anmeldung fehlgeschlagen")
    data = resp.json()
    email = data["email"].lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        name = (data.get("name") or "").split(" ", 1)
        user = {"id": uid(), "email": email, "first_name": name[0], "last_name": name[1] if len(name) > 1 else "",
                "picture": data.get("picture"), "role": "CLIENT", "disabled": False, "email_verified": True, "created_at": iso(), "auth_provider": "google"}
        await db.users.insert_one(dict(user))
    else:
        await db.users.update_one({"id": user["id"]}, {"$set": {"picture": data.get("picture"), "email_verified": True}})
    await db.user_sessions.insert_one({"id": uid(), "user_id": user["id"], "session_token": data["session_token"], "expires_at": now() + timedelta(days=7), "created_at": now()})
    await log_activity(user, "LOGIN_GOOGLE", "user", user["id"])
    return {"session_token": data["session_token"], "user": public_user(user)}


@router.get("/me")
async def me(user=Depends(get_current_user)):
    return public_user(user)


@router.patch("/me")
async def update_me(body: UpdateProfile, user=Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {k: v for k, v in body.model_dump().items() if v is not None}})
    return public_user(await db.users.find_one({"id": user["id"]}, {"_id": 0}))


@router.post("/logout")
async def logout(request: Request, user=Depends(get_current_user)):
    token = request.headers.get("Authorization", "")[7:]
    await db.user_sessions.delete_many({"session_token": token})
    return {"ok": True}


@router.post("/register-push", status_code=201)
async def register_push(body: PushBody, user=Depends(get_current_user)):
    if body.user_id != user["id"]:
        raise HTTPException(403, "Ungültige Nutzer-ID")
    await register_push_upstream(body.model_dump())
    return {"status": "registered"}


@router.patch("/users/{user_id}/role")
async def change_role(user_id: str, body: ChangeRole, admin=Depends(require_roles(*ADMINS))):
    if body.role not in ROLES:
        raise HTTPException(422, "Ungültige Rolle")
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(404)
    await db.users.update_one({"id": user_id}, {"$set": {"role": body.role}})
    await log_activity(admin, "ROLE_CHANGE", "user", user_id, target["role"], body.role)
    return {"ok": True}
