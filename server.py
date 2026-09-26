"""Authenticated MCP bridge for TypeSafe System One."""
import json
import os
from typing import Any

import httpx
import jwt
from jwt import PyJWKClient
from mcp.server import MCPServer
from mcp.server.auth.provider import AccessToken, TokenVerifier
from mcp.server.auth.settings import AuthSettings
from pydantic import AnyHttpUrl

ISSUER = os.environ["OAUTH_ISSUER"].rstrip("/") + "/"
RESOURCE = os.environ["PUBLIC_MCP_URL"].rstrip("/")
API_KEY = os.environ["TYPESAFE_API_KEY"]
OWNER_SUB = os.environ["OAUTH_OWNER_SUB"]
REQUIRED_SCOPE = "typesafe:ask"

if not RESOURCE.startswith("https://"):
    raise RuntimeError("PUBLIC_MCP_URL must be HTTPS")

jwks = PyJWKClient(f"{ISSUER}.well-known/jwks.json", cache_jwk_set=True, lifespan=300)


class OIDCTokenVerifier(TokenVerifier):
    async def verify_token(self, token: str) -> AccessToken | None:
        try:
            key = await __import__("asyncio").to_thread(jwks.get_signing_key_from_jwt, token)
            claims = jwt.decode(
                token, key.key, algorithms=["RS256"], audience=RESOURCE,
                issuer=ISSUER, options={"require": ["exp", "iss", "aud", "sub"]},
            )
            if claims["sub"] != OWNER_SUB:
                return None
            scopes = claims.get("scope", "").split()
            if REQUIRED_SCOPE not in scopes:
                return None
            return AccessToken(
                token=token, client_id=claims.get("azp", "chatgpt"),
                scopes=scopes, resource=RESOURCE, subject=claims["sub"],
                expires_at=claims["exp"],
            )
        except (jwt.PyJWTError, ValueError, KeyError, TypeError):
            return None


mcp = MCPServer(
    "TypeSafe System One",
    token_verifier=OIDCTokenVerifier(),
    auth=AuthSettings(
        issuer_url=AnyHttpUrl(ISSUER),
        resource_server_url=AnyHttpUrl(RESOURCE),
        required_scopes=[REQUIRED_SCOPE],
        validate_token_resource=True,
    ),
)


def validate_questions(questions: dict[str, Any]) -> None:
    if not isinstance(questions, dict) or not 1 <= len(questions) <= 20:
        raise ValueError("Provide 1 to 20 questions")
    for name, question in questions.items():
        if not isinstance(name, str) or not isinstance(question, dict):
            raise ValueError("Each question needs a string ID and an object")
        kind = question.get("type")
        if kind not in ("choice", "score", "noul") or not question.get("instructions"):
            raise ValueError("Each question needs a valid type and instructions")
        criteria = question.get("criteria")
        if kind == "choice" and (not isinstance(criteria, dict) or not 2 <= len(criteria) <= 255):
            raise ValueError("Choice needs 2 to 255 criteria options")
        if kind == "score" and (not isinstance(criteria, list) or not 2 <= len(criteria) <= 10):
            raise ValueError("Score needs 2 to 10 ordered levels")


async def evaluate(state: str | dict[str, Any] | list[Any], questions: dict[str, Any]) -> dict[str, Any]:
    validate_questions(questions)
    payload = {"state": state, "questions": questions, "model": "jev-latest"}
    if len(json.dumps(payload, ensure_ascii=False)) > 100_000:
        raise ValueError("Request is too large")
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            "https://api.typesafe.ai/v1/systemone",
            headers={"Authorization": f"Bearer {API_KEY}"}, json=payload,
        )
        response.raise_for_status()
        return response.json()


@mcp.tool()
async def ask_typesafe(state: str | dict[str, Any] | list[Any], questions: dict[str, Any]) -> dict[str, Any]:
    """Ask TypeSafe Jev up to 20 typed questions about supplied state. Use 'choice' with a criteria object, 'score' with an ordered criteria array, or 'noul' for a yes/no probability. Return raw answers and usage; do not treat probabilities as guaranteed facts."""
    try:
        return await evaluate(state, questions)
    except httpx.HTTPStatusError as exc:
        raise ValueError(f"TypeSafe request failed with HTTP {exc.response.status_code}") from None
    except httpx.RequestError:
        raise ValueError("TypeSafe service could not be reached") from None


app = mcp.streamable_http_app(stateless_http=True, json_response=True)
