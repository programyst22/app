# TypeSafe bridge for ChatGPT

This is an MCP resource server. It exposes `ask_typesafe` to a signed-in ChatGPT user and forwards typed questions to `POST https://api.typesafe.ai/v1/systemone`.

## Required configuration

- `TYPESAFE_API_KEY`: new TypeSafe key, stored as a server secret.
- `PUBLIC_MCP_URL`: exact public HTTPS URL ending in `/mcp`.
- `OAUTH_ISSUER`: OAuth/OIDC authorization server URL. It must support ChatGPT's MCP OAuth discovery and client registration (CIMD or DCR), PKCE S256, and issue RS256 access tokens whose audience equals `PUBLIC_MCP_URL` and scope includes `typesafe:ask`.
- `OAUTH_OWNER_SUB`: the exact `sub` claim of the sole permitted user.

The OAuth server is a separate prerequisite. Configure its ChatGPT redirect URL following OpenAI's current plugin authentication guide. A generic Google login without MCP-compatible OAuth metadata will not work.

Run with `uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}`. Configure the HTTPS host to forward all paths including `/.well-known/oauth-protected-resource/mcp`.

The TypeSafe key is never returned to ChatGPT or stored in the plugin archive. Limit OAuth sign-in to the owner, and retain the `OAUTH_OWNER_SUB` server check. Keep rate limits and billing controls on the TypeSafe account.

## Test locally

Set placeholder environment values, then run `python -m unittest discover -s tests` for validation. Full OAuth sign-in and a real TypeSafe call require configured services and a fresh key. No live API call is made by the tests.

## Plugin link

After this server is reachable and OAuth is verified, add a portable `mcp.json` to the existing `typesafe-integration` plugin with a streamable HTTP server at the exact `PUBLIC_MCP_URL`. The current skill-only plugin has no runtime API tool.
