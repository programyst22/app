"""Shared constants for tests (importable from any test file)."""
import os

BASE = os.environ.get("EXPO_BACKEND_URL", "https://oka-build-platform.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

ADMIN_EMAIL = "admin@okabau.de"
ADMIN_PASSWORD = "OkaBau!Admin2026"
EMP_EMAIL = "mitarbeiter@okabau.de"
EMP_PASSWORD = "OkaBau!Team2026"
CLIENT_EMAIL_STANDALONE = "kunde@example.com"
CLIENT_PW_STANDALONE = "OkaBau!Kunde2026"
