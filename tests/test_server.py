import os
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

os.environ.setdefault("OAUTH_ISSUER", "https://auth.example.com/")
os.environ.setdefault("PUBLIC_MCP_URL", "https://example.com/mcp")
os.environ.setdefault("TYPESAFE_API_KEY", "placeholder-for-test-only")
os.environ.setdefault("OAUTH_OWNER_SUB", "owner")

from server import evaluate, validate_questions


class ValidationTests(unittest.TestCase):
    def test_requires_bounded_choice(self):
        with self.assertRaises(ValueError):
            validate_questions({"route": {"type": "choice", "instructions": "Pick", "criteria": {"one": None}}})

    def test_noul(self):
        validate_questions({"urgent": {"type": "noul", "instructions": "Is it urgent?"}})

    def test_type_safe_wire_shape(self):
        question = {"urgent": {"type": "noul", "instructions": "Is it urgent?"}}
        response = MagicMock()
        response.json.return_value = {"answers": {"urgent": {"type": "noul", "noul": 0.9}}}
        client = AsyncMock()
        client.post.return_value = response
        context = MagicMock()
        context.__aenter__ = AsyncMock(return_value=client)
        context.__aexit__ = AsyncMock(return_value=None)
        with patch("server.httpx.AsyncClient", return_value=context):
            result = __import__("asyncio").run(evaluate("Urgent", question))
        self.assertEqual(result["answers"]["urgent"]["noul"], 0.9)
        _, kwargs = client.post.call_args
        self.assertEqual(kwargs["json"]["model"], "jev-latest")
        self.assertEqual(kwargs["json"]["questions"], question)


if __name__ == "__main__":
    unittest.main()
