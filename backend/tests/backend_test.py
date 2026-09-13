"""
OKA Bau backend integration tests.
NOTE: All state-dependent tests use the `converted` session-scoped fixture from conftest.py.
This fixture creates a fresh lead, converts it to a project, and logs in as the client.
Under xdist loadscope, each test class gets its own fixture instance on its worker.
"""
import io
import uuid
import pytest


# ------------ Health / meta / cms / portfolio ------------
class TestPublic:
    def test_health(self, s):
        from oka_shared import API
        r = s.get(f"{API}/health", timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_meta(self, s):
        from oka_shared import API
        r = s.get(f"{API}/meta", timeout=15)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), dict)

    def test_cms(self, s):
        from oka_shared import API
        r = s.get(f"{API}/cms", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), (dict, list))

    def test_portfolio_seeded(self, s):
        from oka_shared import API
        r = s.get(f"{API}/portfolio", timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) >= 6


# ------------ Auth ------------
class TestAuth:
    def test_register_client(self, s):
        from oka_shared import API
        email = f"test_reg_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/register", json={
            "email": email, "password": "TestPass2026!", "first_name": "Reg", "last_name": "User"
        }, timeout=20)
        assert r.status_code == 201, r.text
        j = r.json()
        assert "access_token" in j and j["user"]["role"] == "CLIENT"

    def test_login_all_seeded(self, s):
        from oka_shared import API, ADMIN_EMAIL, ADMIN_PASSWORD, EMP_EMAIL, EMP_PASSWORD, CLIENT_EMAIL_STANDALONE, CLIENT_PW_STANDALONE
        for em, pw in [(ADMIN_EMAIL, ADMIN_PASSWORD), (EMP_EMAIL, EMP_PASSWORD), (CLIENT_EMAIL_STANDALONE, CLIENT_PW_STANDALONE)]:
            r = s.post(f"{API}/auth/login", json={"email": em, "password": pw}, timeout=20)
            assert r.status_code == 200, f"{em}: {r.text}"

    def test_me(self, s, admin):
        from oka_shared import API, ADMIN_EMAIL
        r = s.get(f"{API}/auth/me", headers=admin["h"], timeout=15)
        assert r.status_code == 200 and r.json()["email"] == ADMIN_EMAIL

    def test_password_reset_request_always_200(self, s):
        from oka_shared import API
        r = s.post(f"{API}/auth/password-reset/request", json={"email": "nonexistent_xyz@example.com"}, timeout=15)
        assert r.status_code == 200

    def test_password_reset_confirm_invalid_400(self, s):
        from oka_shared import API
        r = s.post(f"{API}/auth/password-reset/confirm", json={"token": "invalid_token_xxx", "password": "NewPass2026"}, timeout=15)
        assert r.status_code == 400

    def test_role_change_requires_admin(self, s, emp):
        from oka_shared import API
        r = s.patch(f"{API}/auth/users/{emp['user']['id']}/role", headers=emp["h"], json={"role": "EMPLOYEE"}, timeout=15)
        assert r.status_code == 403


# ------------ Public request → lead ------------
class TestPublicRequest:
    def test_missing_consent_422(self, s):
        from oka_shared import API
        r = s.post(f"{API}/public/request", data={
            "name": "TEST No Consent", "email": f"noconsent_{uuid.uuid4().hex[:6]}@example.com",
            "phone": "+491700000", "project_type": "Badsanierung"
        }, timeout=20)
        assert r.status_code == 422

    def test_create_lead_success(self, s, admin):
        from oka_shared import API
        email = f"test_lead_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/public/request", data={
            "name": "TEST Lead", "email": email, "phone": "+4917012345",
            "project_type": "Badsanierung", "consent": "true", "message": "Auto"
        }, timeout=20)
        assert r.status_code == 201 and "Vielen Dank" in r.json()["message"]
        lead_id = r.json()["id"]
        r2 = s.get(f"{API}/leads", headers=admin["h"], timeout=15)
        assert r2.status_code == 200 and lead_id in [x["id"] for x in r2.json()]

    def test_list_leads_forbidden_employee(self, s, emp):
        from oka_shared import API
        r = s.get(f"{API}/leads", headers=emp["h"], timeout=15)
        assert r.status_code == 403


# ------------ CRM: convert flow ------------
class TestConvert:
    def test_convert_creates_expected(self, s, admin, converted):
        from oka_shared import API
        assert converted["project_number"].startswith("OKA-2026-")
        assert converted["client_pw"]
        # system chat message present
        r = s.get(f"{API}/projects/{converted['project_id']}/messages", headers=admin["h"], timeout=15)
        assert r.status_code == 200, r.text
        msgs = r.json().get("messages", r.json()) if isinstance(r.json(), dict) else r.json()
        assert any(("angelegt" in m.get("text", "").lower()) or ("willkommen" in m.get("text", "").lower()) for m in msgs)

    def test_second_convert_409(self, s, admin, converted):
        from oka_shared import API
        r = s.post(f"{API}/leads/{converted['lead_id']}/convert", headers=admin["h"], timeout=15)
        assert r.status_code == 409

    def test_client_dashboard(self, s, converted):
        from oka_shared import API
        r = s.get(f"{API}/client/dashboard", headers=converted["client_h"], timeout=15)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j.get("active_project") is not None or j.get("active_projects") or j.get("project")

    def test_patch_lead_status_and_notes(self, s, admin):
        from oka_shared import API
        # create a fresh lead to patch
        email = f"test_patch_{uuid.uuid4().hex[:6]}@example.com"
        r = s.post(f"{API}/public/request", data={
            "name": "TEST Patch", "email": email, "phone": "+491700",
            "project_type": "Badsanierung", "consent": "true"
        }, timeout=15)
        lid = r.json()["id"]
        r = s.patch(f"{API}/leads/{lid}", headers=admin["h"], json={"status": "KONTAKTIERT", "notes": "TEST note"}, timeout=15)
        assert r.status_code == 200 and r.json()["status"] == "KONTAKTIERT"


# ------------ Projects ------------
class TestProjects:
    def test_list_projects_client_scoping(self, s, converted):
        from oka_shared import API
        r = s.get(f"{API}/projects", headers=converted["client_h"], timeout=15)
        assert r.status_code == 200
        assert converted["project_id"] in [p["id"] for p in r.json()]

    def test_list_projects_employee_scoping(self, s, emp, converted):
        from oka_shared import API
        r = s.get(f"{API}/projects", headers=emp["h"], timeout=15)
        assert r.status_code == 200
        assert converted["project_id"] not in [p["id"] for p in r.json()]

    def test_other_client_forbidden(self, s, client_solo, converted):
        from oka_shared import API
        r = s.get(f"{API}/projects/{converted['project_id']}", headers=client_solo["h"], timeout=15)
        assert r.status_code == 403

    def test_get_model_null(self, s, admin, converted):
        from oka_shared import API
        r = s.get(f"{API}/projects/{converted['project_id']}/model", headers=admin["h"], timeout=15)
        assert r.status_code == 200 and r.json() is None

    def test_patch_stage_and_progress(self, s, admin, converted):
        from oka_shared import API
        pid = converted["project_id"]
        r = s.patch(f"{API}/projects/{pid}", headers=admin["h"], json={"stage": "ANGEBOT VERSENDET", "progress": 10}, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json()["stage"] == "ANGEBOT VERSENDET"
        assert len(r.json().get("stage_history", [])) >= 2

    def test_zones_crud_and_validation(self, s, admin, converted):
        from oka_shared import API
        pid = converted["project_id"]
        r = s.post(f"{API}/projects/{pid}/zones", headers=admin["h"], json={
            "object_name": "bad", "display_name": "Bad", "status": "INVALID"
        }, timeout=15)
        assert r.status_code == 422
        r = s.post(f"{API}/projects/{pid}/zones", headers=admin["h"], json={
            "object_name": "bad", "display_name": "Badezimmer", "progress": 0, "status": "PLANNED"
        }, timeout=15)
        assert r.status_code == 201, r.text
        zid = r.json()["id"]
        r = s.patch(f"{API}/projects/{pid}/zones/{zid}", headers=admin["h"], json={"status": "IN_PROGRESS", "progress": 20}, timeout=15)
        assert r.status_code == 200 and r.json()["status"] == "IN_PROGRESS"
        r = s.delete(f"{API}/projects/{pid}/zones/{zid}", headers=admin["h"], timeout=15)
        assert r.status_code == 200

    def test_timeline(self, s, converted):
        from oka_shared import API
        r = s.get(f"{API}/projects/{converted['project_id']}/timeline", headers=converted["client_h"], timeout=15)
        assert r.status_code == 200 and "events" in r.json()

    def test_updates_visibility(self, s, admin, converted):
        from oka_shared import API
        pid = converted["project_id"]
        s.post(f"{API}/projects/{pid}/updates", headers=admin["h"], json={"title": "Hidden internal", "client_visible": False}, timeout=15)
        s.post(f"{API}/projects/{pid}/updates", headers=admin["h"], json={"title": "Client visible", "client_visible": True}, timeout=15)
        r = s.get(f"{API}/projects/{pid}/updates", headers=converted["client_h"], timeout=15)
        assert r.status_code == 200
        titles = [u["title"] for u in r.json()]
        assert "Client visible" in titles and "Hidden internal" not in titles

    def test_tasks_flow(self, s, admin, converted):
        from oka_shared import API
        pid = converted["project_id"]
        r = s.post(f"{API}/projects/{pid}/tasks", headers=admin["h"], json={"title": "TEST Task", "status": "OFFEN"}, timeout=15)
        assert r.status_code == 201, r.text
        tid = r.json()["id"]
        r = s.patch(f"{API}/projects/{pid}/tasks/{tid}", headers=admin["h"], json={"status": "ERLEDIGT"}, timeout=15)
        assert r.status_code == 200 and r.json()["status"] == "ERLEDIGT"

    def test_diary_client_visibility(self, s, admin, converted):
        from oka_shared import API
        pid = converted["project_id"]
        r = s.post(f"{API}/projects/{pid}/diary", headers=admin["h"], json={
            "date": "2026-01-15", "work_completed": "internal", "client_visible": False
        }, timeout=15)
        assert r.status_code == 201, r.text
        r = s.get(f"{API}/projects/{pid}/diary", headers=converted["client_h"], timeout=15)
        assert r.status_code == 200
        assert all(d.get("client_visible") for d in r.json())


# ------------ Commerce ------------
class TestCommerce:
    def test_offer_flow(self, s, admin, converted):
        from oka_shared import API
        r = s.post(f"{API}/offers", headers=admin["h"], json={
            "customer_id": converted["customer_id"], "project_id": converted["project_id"],
            "items": [
                {"description": "Fliesen", "quantity": 10, "unit": "m²", "unit_price": 100.0},
                {"description": "Sanitär", "quantity": 1, "unit": "Stk.", "unit_price": 500.0},
            ], "vat_rate": 19.0
        }, timeout=20)
        assert r.status_code == 201, r.text
        o = r.json()
        assert o["subtotal"] == 1500.0 and o["vat"] == 285.0 and o["total"] == 1785.0
        oid = o["id"]
        # DRAFT hidden
        r = s.get(f"{API}/offers/{oid}", headers=converted["client_h"], timeout=15)
        assert r.status_code == 403
        # send
        r = s.patch(f"{API}/offers/{oid}", headers=admin["h"], json={"status": "SENT"}, timeout=15)
        assert r.status_code == 200
        # client GET → VIEWED
        r = s.get(f"{API}/offers/{oid}", headers=converted["client_h"], timeout=15)
        assert r.status_code == 200 and r.json()["status"] == "VIEWED"
        # accept
        r = s.post(f"{API}/offers/{oid}/respond", headers=converted["client_h"], json={"accept": True}, timeout=15)
        assert r.status_code == 200 and r.json()["status"] == "ACCEPTED"
        # second → 409
        r = s.post(f"{API}/offers/{oid}/respond", headers=converted["client_h"], json={"accept": True}, timeout=15)
        assert r.status_code == 409
        # PDF
        r = s.get(f"{API}/offers/{oid}/pdf", headers=admin["h"], timeout=20)
        assert r.status_code == 200 and r.content[:4] == b"%PDF"
        # invoice from offer
        r = s.post(f"{API}/invoices", headers=admin["h"], json={
            "customer_id": converted["customer_id"], "project_id": converted["project_id"], "offer_id": oid,
            "issue_date": "2026-01-15", "due_date": "2026-02-15", "items": [], "vat_rate": 19.0
        }, timeout=20)
        assert r.status_code == 201, r.text
        inv = r.json()
        assert inv["total"] == 1785.0 and len(inv["items"]) == 2
        r = s.patch(f"{API}/invoices/{inv['id']}", headers=admin["h"], json={"status": "PAID"}, timeout=15)
        assert r.status_code == 200 and r.json()["status"] == "PAID"
        r = s.get(f"{API}/invoices/{inv['id']}/pdf", headers=admin["h"], timeout=20)
        assert r.status_code == 200 and r.content[:4] == b"%PDF"


# ------------ Comms ------------
class TestComms:
    def test_messages_and_scope(self, s, admin, client_solo, converted):
        from oka_shared import API
        pid = converted["project_id"]
        r = s.post(f"{API}/projects/{pid}/messages", headers=admin["h"], json={"text": "Hallo Kunde"}, timeout=15)
        assert r.status_code in (200, 201), r.text
        r = s.get(f"{API}/projects/{pid}/messages", headers=client_solo["h"], timeout=15)
        assert r.status_code == 403
        r = s.get(f"{API}/projects/{pid}/messages", headers=converted["client_h"], timeout=15)
        assert r.status_code == 200
        msgs = r.json().get("messages", r.json()) if isinstance(r.json(), dict) else r.json()
        assert any(m.get("text") == "Hallo Kunde" for m in msgs)

    def test_inbox(self, s, admin):
        from oka_shared import API
        r = s.get(f"{API}/messages/inbox", headers=admin["h"], timeout=15)
        assert r.status_code == 200

    def test_appointment_type_validation(self, s, admin, converted):
        from oka_shared import API
        r = s.post(f"{API}/appointments", headers=admin["h"], json={
            "project_id": converted["project_id"], "customer_id": converted["customer_id"],
            "type": "INVALID_TYPE_XX", "title": "Bad", "start": "2026-02-01T10:00:00Z", "end": "2026-02-01T11:00:00Z"
        }, timeout=15)
        assert r.status_code == 422

    def test_notifications(self, s, converted):
        from oka_shared import API
        r = s.get(f"{API}/notifications", headers=converted["client_h"], timeout=15)
        assert r.status_code == 200 and isinstance(r.json(), list)


# ------------ Admin ------------
class TestAdmin:
    def test_admin_dashboard(self, s, admin):
        from oka_shared import API
        r = s.get(f"{API}/admin/dashboard", headers=admin["h"], timeout=15)
        assert r.status_code == 200 and isinstance(r.json(), dict)

    def test_employee_dashboard(self, s, emp):
        from oka_shared import API
        r = s.get(f"{API}/employee/dashboard", headers=emp["h"], timeout=15)
        assert r.status_code == 200

    def test_analytics(self, s, admin):
        from oka_shared import API
        r = s.get(f"{API}/analytics", headers=admin["h"], timeout=15)
        assert r.status_code == 200

    def test_activity(self, s, admin):
        from oka_shared import API
        r = s.get(f"{API}/activity", headers=admin["h"], timeout=15)
        assert r.status_code == 200
        actions = [a.get("action") for a in r.json()]
        assert any(a in ("LOGIN", "LEAD_CONVERTED", "OFFER_ACCEPTED") for a in actions)

    def test_search(self, s, admin):
        from oka_shared import API
        r = s.get(f"{API}/search?q=OKA", headers=admin["h"], timeout=15)
        assert r.status_code == 200

    def test_settings(self, s, admin):
        from oka_shared import API
        r = s.get(f"{API}/settings", headers=admin["h"], timeout=15)
        assert r.status_code == 200
        r = s.put(f"{API}/settings", headers=admin["h"], json={**r.json(), "company_tagline": "TEST"}, timeout=15)
        assert r.status_code == 200

    def test_cms_put_admin_only(self, s, admin, emp):
        from oka_shared import API
        r = s.put(f"{API}/cms/homepage_hero", headers=emp["h"], json={"headline": "Nope"}, timeout=15)
        assert r.status_code == 403
        r = s.put(f"{API}/cms/homepage_hero", headers=admin["h"], json={"headline": "TEST"}, timeout=15)
        assert r.status_code in (200, 201)

    def test_employees_create(self, s, admin):
        from oka_shared import API
        r = s.post(f"{API}/employees", headers=admin["h"], json={
            "email": f"test_emp_{uuid.uuid4().hex[:6]}@example.com",
            "first_name": "TEST", "last_name": "Emp", "role": "EMPLOYEE", "password": "Emp!2026abc"
        }, timeout=20)
        assert r.status_code in (200, 201), r.text

    def test_customers(self, s, admin):
        from oka_shared import API
        r = s.get(f"{API}/customers", headers=admin["h"], timeout=15)
        assert r.status_code == 200
        r = s.post(f"{API}/customers", headers=admin["h"], json={
            "name": "TEST Customer", "email": f"cust_{uuid.uuid4().hex[:6]}@example.com", "phone": "+49"
        }, timeout=15)
        assert r.status_code == 201

    def test_portfolio_create(self, s, admin):
        from oka_shared import API
        r = s.post(f"{API}/portfolio", headers=admin["h"], json={
            "title": "TEST Portfolio", "description": "auto", "category": "Bad", "image_ids": []
        }, timeout=15)
        assert r.status_code in (200, 201), r.text

    def test_email_outbox(self, s, admin):
        from oka_shared import API
        r = s.get(f"{API}/email-outbox", headers=admin["h"], timeout=15)
        assert r.status_code == 200


# ------------ Files ------------
class TestFiles:
    def test_upload_and_delete_document(self, s, admin, converted):
        from oka_shared import API
        pid = converted["project_id"]
        content = b"%PDF-1.4\ntest\n"
        r = s.post(f"{API}/projects/{pid}/documents", headers=admin["h"],
                   files={"file": ("test.pdf", io.BytesIO(content), "application/pdf")},
                   data={"category": "Plan"}, timeout=30)
        if r.status_code in (401, 402):
            pytest.skip(f"Object storage env issue: {r.status_code}")
        assert r.status_code == 201, r.text
        fid = r.json().get("id")
        assert fid
        r = s.delete(f"{API}/files/{fid}", headers=admin["h"], timeout=15)
        assert r.status_code == 200

    def test_media_list(self, s, admin):
        from oka_shared import API
        r = s.get(f"{API}/media", headers=admin["h"], timeout=15)
        assert r.status_code == 200
