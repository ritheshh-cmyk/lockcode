## Context

TITAN client (`ctfmon.exe` / `final.py`) makes direct outbound HTTPS POST requests to Google's Generative Language API (`https://generativelanguage.googleapis.com/v1beta/models/...:generateContent`). In academic institutions, corporate campuses, and testing lab Wi-Fi environments, these domains are frequently intercepted or blocked by network firewalls (Sophos, FortiGate, Palo Alto, Cisco Umbrella) via Layer-7 category filtering (blocking "Generative AI" / "LLM" categories) or captive portals, resulting in HTTP 403 `PERMISSION_DENIED`, DNS NXDOMAIN, or connection timeouts.

The project already maintains a deployed Next.js backend on Vercel (`https://web-phi-taupe-97.vercel.app`) used for license validation (`/api/validate`). Vercel's global CDN domains are standard SaaS infrastructure that are rarely blocked by institutional Wi-Fi filters.

## Goals / Non-Goals

**Goals:**
- Provide a dual-tier request pipeline: attempt fast direct Gemini first; transparently fail over to the Vercel bridge if direct communication fails with 403, timeout, or network connection errors.
- Create `/api/bridge/generate` on the Next.js Vercel backend that receives prompts, invokes Google Gemini from Vercel's cloud IPs, and returns the generation back to the client.
- Maintain identical output format so existing client parsing logic (`_extract_response_text`, `_normalize_answer`) works seamlessly.
- Secure the bridge endpoint with `x-app-secret` and client verification to prevent unauthorized public abuse.

**Non-Goals:**
- Deprecating direct Gemini calls: direct calls remain the primary Tier-1 path because they offer the lowest latency (1.5s - 2.5s) and zero Vercel compute consumption.
- Building a standalone proxy server or VPN outside the existing Vercel deployment.

## Decisions

### 1. Dual-Tier Failover in `final.py`
- **Choice**: In `CodeChatbotThread` and `McqChatbotThread`, wrap the primary POST to `generativelanguage.googleapis.com` with a failover handler.
- **Failover Trigger**: Any of:
  - HTTP status 403 (`PERMISSION_DENIED` or campus captive portal block).
  - HTTP status 401.
  - `requests.exceptions.ConnectionError` (DNS failure, TCP reset, firewall drop).
  - `requests.exceptions.Timeout` after 4.0 seconds.
- **Alternative Considered**: Routing 100% of all requests through Vercel.
  - *Rejected*: Adds unnecessary latency (~400-800ms) to every request when user is on an open/home network and risks exhausting Vercel serverless execution limits.

### 2. Vercel Route Architecture (`lock/web/app/api/bridge/generate/route.ts`)
- **Choice**: Next.js App Router POST handler using Edge or Node.js runtime with `export const maxDuration = 60;`.
- **Payload Contract**:
  ```json
  {
    "model": "gemini-2.5-flash",
    "contents": [...],
    "systemInstruction": {...},
    "generationConfig": {...},
    "apiKey": "optional client api key override"
  }
  ```
- **Security**: Validates `x-app-secret` header against `process.env.APP_SECRET`.

### 3. Server-Side Fallback Keys
- **Choice**: The bridge accepts the client's API key. If the client key fails with quota/permission issues or if no key is provided, the bridge falls back to `process.env.GEMINI_API_KEY` stored securely in Vercel environment variables.

## Risks / Trade-offs

- **[Risk] Vercel Serverless Function Timeout**
  - *Impact*: Free (Hobby) tier Vercel functions have a 10s default execution limit (up to 60s max configured). If Gemini takes 8s and network roundtrips take 3s, the request could time out.
  - *Mitigation*: Configure `export const maxDuration = 60;` in `route.ts`. Use lightweight, fast models (`gemini-2.5-flash`, `gemini-2.0-flash`) and set client-side read timeout for the bridge to 15s.
- **[Risk] Latency Increase on Fallback**
  - *Impact*: Direct call timeout (3-4s) + bridge roundtrip (3-5s) could total 7-9s on restricted networks.
  - *Mitigation*: Fail fast on explicit HTTP 403/connection reset (0ms delay to fallback). Keep direct timeout tight (3.5s). Cache network status: if direct failed recently, consider preferring bridge for consecutive calls during that session.
- **[Risk] Endpoint Abuse**
  - *Impact*: Malicious actors discovering the Vercel URL and exhausting Gemini quota.
  - *Mitigation*: Strict header authentication with `x-app-secret` (`lockapp-secret-2026`) and payload validation.
