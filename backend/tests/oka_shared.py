"""Shared constants for tests (importable from any test file)."""
import os

BASE = os.environ.get("EXPO_BACKEND_URL", "https://oka-build-platform.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

ADMIN_EMAIL = "admin@okabau.de"
ADMIN_PASSWORD = os.environ.get("DEMO_PASSWORD", "")
EMP_EMAIL = "mitarbeiter@okabau.de"
EMP_PASSWORD = os.environ.get("DEMO_PASSWORD", "")
CLIENT_EMAIL_STANDALONE = "kunde@example.com"
CLIENT_PW_STANDALONE = os.environ.get("DEMO_PASSWORD", "")
