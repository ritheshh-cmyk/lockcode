## Why

Institutional and campus Wi-Fi networks frequently employ Layer-7 firewalls, captive portals, and DNS filters that block direct outbound requests to Google Generative AI endpoints (`generativelanguage.googleapis.com`), resulting in `403 Forbidden` / `PERMISSION_DENIED`, connection resets, or SSL termination errors. To ensure high reliability during competitive programming and exam assistance, TITAN requires a multi-layer failover mechanism: attempts direct communication with Gemini first, and upon network or permission failure, transparently routes the request through a secure Vercel reverse proxy bridge that forwards the request from Vercel's global cloud network to Gemini.

## What Changes

- **Vercel Bridge API Route**: Create a high-throughput, edge/serverless API endpoint on the Vercel backend (`/api/bridge/generate`) that validates incoming client app secrets, proxies payloads to the Google Gemini Generative Language API, and streams/returns the response.
- **Client Failover Architecture (Python Engine)**: Update `final.py` (`CodeChatbotThread` and `McqChatbotThread`) in both headless and headed versions with a resilient dual-tier request pipeline:
  1. Tier 1: Direct HTTP request to `generativelanguage.googleapis.com`.
  2. Tier 2 (Fallback): If Tier 1 encounters HTTP 403, connection timeouts, or DNS/network blocks, immediately fail over to the Vercel bridge endpoint with authentication headers.
- **Server-Side Key Resilience & Fallback**: Support receiving client-supplied keys while retaining server-side environment variable backup keys (`GEMINI_API_KEY`) if client keys are rate-limited or restricted.

## Capabilities

### New Capabilities
- `gemini-bridge-proxy`: A resilient Vercel edge/serverless proxy layer and client failover protocol that circumvents local network filtering, handles transient network drops, and guarantees prompt delivery to Google Gemini.

### Modified Capabilities
None.

## Impact

- **Backend (`lock/web`)**: New route added at `app/api/bridge/generate/route.ts` with Vercel configuration (`maxDuration: 60`, edge/node runtime options).
- **Client Engine (`final.py` in both workspaces)**: Dual-tier fallback logic in `CodeChatbotThread` and `McqChatbotThread`.
- **Latency**: Direct requests retain optimal 1.5s-2.5s speed; fallback bridge requests add ~300-800ms transit time but prevent complete blockage on restricted networks.
- **Security**: Endpoint protected via `x-app-secret` and optional `reg_key` machine verification to prevent unauthorized public proxy usage.
