## ADDED Requirements

### Requirement: Universal Edge Bridge Killswitch Enforcement
All AI bridge routes (`/api/bridge/generate`, `/api/bridge/stream`, and `/api/bridge/mcq`) MUST validate license keys against database status and return HTTP 403 with `killswitch: true` if revoked or expired.
- The validation MUST accept both `regKey` and `reg_key` in request body or headers.
- If a license is revoked (`is_active: false`) or expired (`expires_at < now`), the bridge MUST reject the request immediately before dispatching upstream AI tokens.

#### Scenario: Revoked license attempts streaming
- **WHEN** a client initiates an SSE stream via `/api/bridge/stream` with a revoked `reg_key`
- **THEN** the server returns HTTP 403 with `License validation failed: License revoked` and terminates the stream

#### Scenario: Expired license attempts MCQ query
- **WHEN** a client sends a question to `/api/bridge/mcq` with an expired `regKey`
- **THEN** the server returns HTTP 403 with `killswitch: true` without invoking AI models

### Requirement: Instant Allotment Cache Invalidation
When an administrator modifies a license's assigned AI model or provider policy via `updateLicense`, the system MUST immediately purge the server's in-memory allotment cache (`invalidateLicenseAllotmentCache`).

#### Scenario: Administrator re-assigns student model
- **WHEN** an administrator changes a student's license model from `all` to `groq` in the Edit License modal
- **THEN** `updateLicense` clears `licenseAllotmentCache`, and subsequent queries from that key immediately route through the Groq provider

### Requirement: Transparent Client Bridge Error Diagnostics
The TITAN client's Vercel bridge caller (`_call_vercel_bridge`) MUST preserve non-200 HTTP responses and capture the server's error payload into diagnostic state.

#### Scenario: Server returns license killswitch error
- **WHEN** the bridge returns HTTP 403 with error `"License validation failed: License expired"`
- **THEN** TITAN records the specific error message and displays `"License Expired: Contact admin"` on the HUD instead of a generic unreachable error
