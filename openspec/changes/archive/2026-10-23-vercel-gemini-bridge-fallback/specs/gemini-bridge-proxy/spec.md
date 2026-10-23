## ADDED Requirements

### Requirement: Vercel Gemini Proxy Endpoint
The Vercel backend SHALL expose a secured POST endpoint at `/api/bridge/generate` that forwards Gemini prompt generation requests to Google's Generative Language API and returns the response payload to the client.

#### Scenario: Authorized request forwarded to Gemini successfully
- **WHEN** client sends a POST request to `/api/bridge/generate` with valid `x-app-secret` header, valid model, system instruction, and contents payload
- **THEN** Vercel proxy invokes `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` with the designated API key and returns HTTP 200 with the model candidate text

#### Scenario: Unauthorized request rejected
- **WHEN** client sends a request missing the `x-app-secret` header or providing an invalid secret
- **THEN** Vercel proxy rejects the request immediately with HTTP 401 Unauthorized

### Requirement: Client Dual-Tier Failover
The TITAN client engine (in both `CodeChatbotThread` and `McqChatbotThread`) SHALL implement a two-tier request strategy that attempts direct Google Gemini communication first and automatically fails over to the Vercel bridge upon connection errors or permission denials.

#### Scenario: Direct Gemini request succeeds
- **WHEN** direct request to `https://generativelanguage.googleapis.com` returns HTTP 200 within timeout limits
- **THEN** client processes the response directly without contacting the Vercel bridge

#### Scenario: Direct Gemini blocked or returns 403 Permission Denied
- **WHEN** direct request to `https://generativelanguage.googleapis.com` fails with HTTP 403, 401, connection timeout, or DNS resolution failure
- **THEN** client immediately invokes the Vercel bridge endpoint (`/api/bridge/generate`) passing the active prompt and credentials, and transparently consumes the returned completion

### Requirement: Server-Side Backup Key Fallback
The Vercel proxy endpoint SHALL support fallback to a server-side Gemini API key if the client-provided key encounters quota exhaustion or permission errors.

#### Scenario: Client key exhausted or restricted
- **WHEN** request using the client's API key receives HTTP 429 or 403 from Google
- **THEN** Vercel bridge retries the request using its server-side environment `GEMINI_BACKUP_KEY` before returning an error to the client
