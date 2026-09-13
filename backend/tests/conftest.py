"""Shared fixtures. NOTE: pytest.ini uses xdist loadscope: fixtures are per-class-group per-worker."""
import os
import uuid
import pytest
import requests

BASE = os.environ.get("EXPO_BACKEND_URL", "https://oka-build-platform.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

ADMIN_EMAIL = "admin@okabau.de"
ADMIN_PASSWORD = os.environ.get("DEMO_PASSWORD", "")
EMP_EMAIL = "mitarbeiter@okabau.de"
EMP_PASSWORD = os.environ.get("DEMO_PASSWORD", "")
CLIENT_EMAIL_STANDALONE = "kunde@example.com"
CLIENT_PW_STANDALONE = os.environ.get("DEMO_PASSWORD", "")


def _headers(tok):
    return {"Authorization": f"Bearer {tok}"}


def _login(s, email, password):
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    j = r.json()
    return j["access_token"], j["user"]


@pytest.fixture(scope="session")
def s():
    ss = requests.Session()
    ss.headers.update({"Accept": "application/json"})
    return ss


@pytest.fixture(scope="session")
def admin(s):
    tok, user = _login(s, ADMIN_EMAIL, ADMIN_PASSWORD)
    return {"token": tok, "user": user, "h": _headers(tok)}


@pytest.fixture(scope="session")
def emp(s):
    tok, user = _login(s, EMP_EMAIL, EMP_PASSWORD)
    return {"token": tok, "user": user, "h": _headers(tok)}


@pytest.fixture(scope="session")
def client_solo(s):
    tok, user = _login(s, CLIENT_EMAIL_STANDALONE, CLIENT_PW_STANDALONE)
    return {"token": tok, "user": user, "h": _headers(tok)}


@pytest.fixture(scope="session")
def converted(s, admin):
    """Creates a lead, converts it to a project, logs in as client. Returns full state dict."""
    email = f"test_conv_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/public/request", data={
        "name": "TEST Converted Flow", "email": email, "phone": "+4917099999",
        "project_type": "Badsanierung", "consent": "true", "message": "Auto flow"
    }, timeout=20)
    assert r.status_code == 201, r.text
    lead_id = r.json()["id"]
    r = s.post(f"{API}/leads/{lead_id}/convert", headers=admin["h"], timeout=30)
    assert r.status_code == 201, r.text
    j = r.json()
    temp_pw = j["temp_password"]
    client_email = j["account"]["email"]
    tok, cuser = _login(s, client_email, temp_pw)
    return {
        "lead_id": lead_id,
        "lead_email": email,
        "project_id": j["project"]["id"],
        "project_number": j["project"]["number"],
        "customer_id": j["customer"]["id"],
        "client_email": client_email,
        "client_pw": temp_pw,
        "client_token": tok,
        "client_h": _headers(tok),
        "client_user": cuser,
    }
