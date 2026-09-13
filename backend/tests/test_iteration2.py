"""OKA Bau iteration 2 tests: setup bootstrap, media library public visibility,
before/after editor, realtime WebSocket, chat attachments, push notifications."""
import asyncio
import io
import json
import os
import struct
import subprocess
import uuid
import zlib

import pytest
import requests
import websockets

from oka_shared import API, BASE, ADMIN_EMAIL, ADMIN_PASSWORD, EMP_EMAIL, EMP_PASSWORD


WS_BASE = BASE.replace("https://", "wss://").replace("http://", "ws://")


def _mini_png() -> bytes:
    """Return the raw bytes of a valid 1x1 PNG (no external deps)."""
    sig = b"\x89PNG\r\n\x1a\n"
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    raw = b"\x00\xff\x00\x00"  # filter + RGB pixel
    idat = chunk(b"IDAT", zlib.compress(raw))
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


# ---------- SECURITY: setup bootstrap + old password rejected ----------
class TestSecuritySetup:
    def test_setup_status_admin_exists(self, s):
        r = s.get(f"{API}/auth/setup/status", timeout=15)
        assert r.status_code == 200
        assert r.json().get("needs_setup") is False

    def test_setup_post_conflict(self, s):
        r = s.post(f"{API}/auth/setup", json={
            "email": f"another_{uuid.uuid4().hex[:6]}@example.com",
            "password": "SomeLongPassword2026!!",
            "first_name": "X", "last_name": "Y"
        }, timeout=15)
        assert r.status_code == 409

    def test_old_hardcoded_password_fails(self, s):
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "OkaBau!Admin2026"}, timeout=15)
        assert r.status_code == 401

    def test_demo_password_works_for_all_three(self, s):
        for em in [ADMIN_EMAIL, EMP_EMAIL, "kunde@example.com"]:
            r = s.post(f"{API}/auth/login", json={"email": em, "password": ADMIN_PASSWORD}, timeout=15)
            assert r.status_code == 200, f"{em}: {r.status_code}"

    def test_no_hardcoded_old_password_in_repo(self):
        r = subprocess.run(
            ["grep", "-r", "-l", "--include=*.py", "--include=*.ts", "--include=*.tsx",
             "--include=*.js", "--include=*.jsx", "--include=*.md",
             "--exclude-dir=tests", "--exclude-dir=__pycache__", "--exclude-dir=node_modules",
             "OkaBau!Admin2026",
             "/app/backend", "/app/frontend/src", "/app/frontend/app", "/app/README.md"],
            capture_output=True, text=True
        )
        # exit 1 = no matches (good); exit 0 = matches found (fail)
        assert r.returncode != 0, f"Hardcoded old password found in: {r.stdout}"


# ---------- MEDIA LIBRARY (public) vs PROJECT MEDIA (private) ----------
class TestMediaVisibility:
    def test_library_public_readable(self, s, admin):
        png = _mini_png()
        r = s.post(f"{API}/media", headers=admin["h"],
                   files=[("files", ("test.png", io.BytesIO(png), "image/png"))],
                   data={"category": "Allgemein", "public": "true"}, timeout=30)
        if r.status_code in (401, 402, 500, 502, 503):
            pytest.skip(f"object storage env issue: {r.status_code} {r.text[:120]}")
        assert r.status_code == 201, r.text
        items = r.json()
        assert isinstance(items, list) and items[0]["kind"] == "library"
        fid = items[0]["id"]
        # NO auth: should still be 200 (library=public)
        r2 = requests.get(f"{API}/files/{fid}", timeout=15)
        assert r2.status_code == 200, f"library file must be publicly readable, got {r2.status_code}"
        assert r2.headers.get("content-type", "").startswith("image/")
        # Appears in /api/media
        lst = s.get(f"{API}/media", headers=admin["h"], timeout=15)
        assert lst.status_code == 200 and any(x["id"] == fid for x in lst.json())

    def test_project_media_private(self, s, admin, converted, client_solo):
        png = _mini_png()
        pid = converted["project_id"]
        r = s.post(f"{API}/projects/{pid}/media", headers=admin["h"],
                   files=[("files", ("proj.png", io.BytesIO(png), "image/png"))],
                   data={"client_visible": "true"}, timeout=30)
        if r.status_code in (401, 402, 500, 502, 503):
            pytest.skip(f"object storage env issue: {r.status_code}")
        assert r.status_code == 201, r.text
        fid = r.json()[0]["id"]
        # No auth: project files are private -> 403
        r2 = requests.get(f"{API}/files/{fid}", timeout=15)
        assert r2.status_code in (401, 403), f"expected 401/403, got {r2.status_code}"
        # OTHER client (not on this project) also blocked
        r3 = s.get(f"{API}/files/{fid}", headers=client_solo["h"], timeout=15)
        assert r3.status_code in (401, 403)
        # Assigned client CAN access
        r4 = s.get(f"{API}/files/{fid}", headers=converted["client_h"], timeout=15)
        assert r4.status_code == 200


# ---------- BEFORE / AFTER editor ----------
class TestBeforeAfter:
    def test_employee_flow_and_publish(self, s, admin, emp, converted):
        pid = converted["project_id"]
        # Assign employee to project
        r = s.patch(f"{API}/projects/{pid}/team", headers=admin["h"],
                    json={"employee_ids": [emp["user"]["id"]]}, timeout=15)
        assert r.status_code == 200, r.text
        # Employee uploads 2 photos
        ids = []
        for i in range(2):
            r = s.post(f"{API}/projects/{pid}/media", headers=emp["h"],
                       files=[("files", (f"ba_{i}.png", io.BytesIO(_mini_png()), "image/png"))],
                       data={"client_visible": "true", "media_kind": "photo"}, timeout=30)
            if r.status_code in (401, 402, 500, 502, 503):
                pytest.skip(f"storage env: {r.status_code}")
            assert r.status_code == 201, r.text
            ids.append(r.json()[0]["id"])
        # Employee tries to publish -> forced false
        r = s.post(f"{API}/projects/{pid}/before-after", headers=emp["h"], json={
            "before_id": ids[0], "after_id": ids[1], "title": "TEST BA",
            "description": "auto", "client_visible": True, "published": True,
            "date": "2026-01-20"
        }, timeout=15)
        assert r.status_code == 201, r.text
        ba = r.json()
        assert ba["published"] is False, "employee must not be allowed to publish"
        bid = ba["id"]
        # Public portfolio should NOT contain it yet
        r = requests.get(f"{API}/portfolio/before-after", timeout=15)
        assert r.status_code == 200 and bid not in [x["id"] for x in r.json()]
        # Admin publishes
        r = s.patch(f"{API}/projects/{pid}/before-after/{bid}", headers=admin["h"],
                    json={"published": True}, timeout=15)
        assert r.status_code == 200 and r.json()["published"] is True
        # Public listing includes with URLs
        r = requests.get(f"{API}/portfolio/before-after", timeout=15)
        items = r.json()
        pub = next((x for x in items if x["id"] == bid), None)
        assert pub is not None, "should be in public portfolio after publish"
        assert pub.get("before_url") and pub.get("after_url")

    def test_before_id_from_another_project_422(self, s, admin, converted, converted_b):
        pid_a = converted["project_id"]
        pid_b = converted_b["project_id"]
        # upload one file to project A
        r = s.post(f"{API}/projects/{pid_a}/media", headers=admin["h"],
                   files=[("files", ("a.png", io.BytesIO(_mini_png()), "image/png"))],
                   data={"client_visible": "true"}, timeout=30)
        if r.status_code in (401, 402, 500, 502, 503):
            pytest.skip("storage env")
        aid = r.json()[0]["id"]
        # upload another to project B
        r = s.post(f"{API}/projects/{pid_b}/media", headers=admin["h"],
                   files=[("files", ("b.png", io.BytesIO(_mini_png()), "image/png"))],
                   data={"client_visible": "true"}, timeout=30)
        if r.status_code in (401, 402, 500, 502, 503):
            pytest.skip("storage env")
        bid = r.json()[0]["id"]
        # Try to use B's photo in A's before/after -> 422
        r = s.post(f"{API}/projects/{pid_a}/before-after", headers=admin["h"], json={
            "before_id": aid, "after_id": bid, "title": "cross"
        }, timeout=15)
        assert r.status_code == 422


# ---------- REALTIME WebSocket ----------
class TestRealtime:
    def test_ws_presence_message_typing_read_pong(self, s, admin, converted):
        pid = converted["project_id"]
        url_client = f"{WS_BASE}/api/ws/projects/{pid}?token={converted['client_token']}"
        url_admin = f"{WS_BASE}/api/ws/projects/{pid}?token={admin['token']}"

        async def run():
            async with websockets.connect(url_client, open_timeout=15, close_timeout=5) as c, \
                       websockets.connect(url_admin, open_timeout=15, close_timeout=5) as a:
                # Both should receive presence frames upon join
                async def read_until(ws, pred, timeout=3):
                    end = asyncio.get_event_loop().time() + timeout
                    while asyncio.get_event_loop().time() < end:
                        try:
                            raw = await asyncio.wait_for(ws.recv(), timeout=end - asyncio.get_event_loop().time())
                        except (asyncio.TimeoutError, TimeoutError):
                            return None
                        evt = json.loads(raw)
                        if pred(evt):
                            return evt
                    return None

                pres = await read_until(c, lambda e: e.get("type") == "presence", 3)
                assert pres, "client must receive presence event"

                # Admin posts a message via REST -> client should receive within 2s
                r = s.post(f"{API}/projects/{pid}/messages", headers=admin["h"], json={"text": "WS-live"}, timeout=10)
                assert r.status_code in (200, 201)
                msg = await read_until(c, lambda e: e.get("type") == "message" and e.get("message", {}).get("text") == "WS-live", 3)
                assert msg, "client must receive message event via WS"

                # Client sends typing -> admin receives typing
                await c.send(json.dumps({"type": "typing"}))
                ty = await read_until(a, lambda e: e.get("type") == "typing", 3)
                assert ty, "admin must receive typing event"

                # Client sends read -> admin receives read
                await c.send(json.dumps({"type": "read"}))
                rd = await read_until(a, lambda e: e.get("type") == "read", 3)
                assert rd, "admin must receive read event"

                # Ping/pong
                await c.send(json.dumps({"type": "ping"}))
                pong = await read_until(c, lambda e: e.get("type") == "pong", 3)
                assert pong, "must receive pong"

        asyncio.run(run())

    def test_ws_invalid_token_closes_4401(self, converted):
        pid = converted["project_id"]
        url = f"{WS_BASE}/api/ws/projects/{pid}?token=not-a-valid-token"
        async def run():
            try:
                async with websockets.connect(url, open_timeout=10, close_timeout=5) as ws:
                    # some servers accept then close; either way expect closure quickly
                    try:
                        await asyncio.wait_for(ws.recv(), timeout=3)
                    except Exception:
                        pass
                    # closed - inspect code
                assert False, "expected connection to be rejected/closed"
            except websockets.exceptions.InvalidStatus as e:
                # HTTP-level rejection (401/403)
                assert e.response.status_code in (401, 403)
            except websockets.exceptions.ConnectionClosed as e:
                assert e.code in (4401, 1008, 1006)
        asyncio.run(run())

    def test_ws_other_project_forbidden(self, admin, converted, converted_b):
        # admin's token joining another project's socket should be ok; but a client token
        # from converted A joining project B should be closed 4401.
        url = f"{WS_BASE}/api/ws/projects/{converted_b['project_id']}?token={converted['client_token']}"
        async def run():
            try:
                async with websockets.connect(url, open_timeout=10, close_timeout=5) as ws:
                    try:
                        await asyncio.wait_for(ws.recv(), timeout=3)
                    except Exception:
                        pass
                assert False, "cross-project client should be rejected"
            except (websockets.exceptions.InvalidStatus, websockets.exceptions.ConnectionClosed):
                pass
        asyncio.run(run())


# ---------- CHAT ATTACHMENTS (client media_kind forced chat) ----------
class TestChatAttachments:
    def test_client_upload_and_attach(self, s, admin, converted):
        pid = converted["project_id"]
        # Client uploads a photo -> should be forced kind=chat, not visible in gallery
        r = s.post(f"{API}/projects/{pid}/media", headers=converted["client_h"],
                   files=[("files", ("chat.png", io.BytesIO(_mini_png()), "image/png"))],
                   data={"client_visible": "false", "media_kind": "photo"}, timeout=30)
        if r.status_code in (401, 402, 500, 502, 503):
            pytest.skip(f"storage env: {r.status_code}")
        assert r.status_code == 201, r.text
        item = r.json()[0]
        assert item.get("media_kind") == "chat", f"client uploads must be forced media_kind=chat; got {item.get('media_kind')}"
        fid = item["id"]
        # Does NOT show in the gallery
        r = s.get(f"{API}/projects/{pid}/media", headers=admin["h"], timeout=15)
        assert r.status_code == 200
        assert fid not in [x["id"] for x in r.json()], "chat uploads must be hidden from gallery"
        # Attach in a message
        r = s.post(f"{API}/projects/{pid}/messages", headers=converted["client_h"],
                   json={"text": "Foto anbei", "attachment_ids": [fid]}, timeout=15)
        assert r.status_code in (200, 201), r.text
        # Fetch and verify attachments[] has url + content_type
        r = s.get(f"{API}/projects/{pid}/messages", headers=admin["h"], timeout=15)
        assert r.status_code == 200
        msgs = r.json().get("messages", r.json()) if isinstance(r.json(), dict) else r.json()
        mine = [m for m in msgs if (m.get("attachment_ids") or []) and fid in m["attachment_ids"]]
        assert mine, "message with attachment must be listed"
        atts = mine[0].get("attachments") or []
        assert atts and atts[0].get("url") and atts[0].get("content_type")


# ---------- PUSH-STYLE NOTIFICATIONS emitted from key events ----------
class TestNotificationEvents:
    def test_message_creates_notification_for_client(self, s, admin, converted):
        pid = converted["project_id"]
        r = s.post(f"{API}/projects/{pid}/messages", headers=admin["h"], json={"text": "Push test"}, timeout=10)
        assert r.status_code in (200, 201)
        r = s.get(f"{API}/notifications", headers=converted["client_h"], timeout=10)
        assert r.status_code == 200
        titles = [n.get("title", "") + " " + n.get("body", "") for n in r.json()]
        assert any("Push test" in t or "Nachricht" in t or "Neue" in t for t in titles), titles[:3]

    def test_appointment_and_progress_notifications(self, s, admin, converted):
        pid = converted["project_id"]
        r = s.post(f"{API}/appointments", headers=admin["h"], json={
            "project_id": pid, "customer_id": converted["customer_id"], "type": "Baustellentermin",
            "title": "Vor-Ort", "start": "2026-03-01T09:00:00Z", "end": "2026-03-01T10:00:00Z"
        }, timeout=15)
        assert r.status_code in (200, 201), r.text
        r = s.patch(f"{API}/projects/{pid}", headers=admin["h"], json={"progress": 55}, timeout=15)
        assert r.status_code == 200
        r = s.get(f"{API}/notifications", headers=converted["client_h"], timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 1


# ------- extra fixture (second converted client/project) -------
@pytest.fixture(scope="module")
def converted_b(s, admin):
    from conftest import _login, _headers
    email = f"test_conv_b_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/public/request", data={
        "name": "TEST Conv B", "email": email, "phone": "+491701",
        "project_type": "Badsanierung", "consent": "true", "message": "auto b"
    }, timeout=20)
    assert r.status_code == 201, r.text
    lid = r.json()["id"]
    r = s.post(f"{API}/leads/{lid}/convert", headers=admin["h"], timeout=30)
    assert r.status_code == 201, r.text
    j = r.json()
    tok, cuser = _login(s, j["account"]["email"], j["temp_password"])
    return {
        "project_id": j["project"]["id"], "customer_id": j["customer"]["id"],
        "client_email": j["account"]["email"], "client_token": tok, "client_h": _headers(tok),
    }
