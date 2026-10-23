# Spec: Control Center & Multi-Provider AI Brain

## ADDED Requirements

### Requirement: Multi-Provider Brain Dispatcher
The Vercel Edge/Serverless bridge MUST dynamically load available AI providers from the database, sort by priority, and execute queries with automatic real-time failover.
- Supported providers: Groq, Google Gemini, DeepSeek, OpenAI, Anthropic, OpenRouter, and custom endpoints.
- Auto Failover: If a provider returns HTTP 429, 5xx, or times out, the dispatcher MUST automatically try the next active provider in the cascade.
- Circuit breaker: Rate-limited providers MUST be temporarily skipped without blocking other providers.
- TITAN Compatibility: The gateway MUST return standard universal responses containing `text`, `candidates`, and `choices` structures so that client code remains 100% intact.

#### Scenario: Successful dispatch to primary provider
- Given an active primary provider (e.g. Groq with Llama 3.3 70B) in the Brain
- When TITAN client sends a POST request with question payload to `/api/bridge/generate`
- Then Vercel invokes Groq API, receives the response, and returns `{ success: true, text: "...", candidates: [...], choices: [...] }` with HTTP 200 within target latency

#### Scenario: Automatic failover on rate limit
- Given the primary provider returns HTTP 429 Too Many Requests
- When TITAN sends a query to `/api/bridge/generate`
- Then the Brain catches the 429, marks the provider temporarily rate-limited, immediately dispatches to the secondary provider (e.g. Gemini), and successfully delivers the answer to TITAN without client error

### Requirement: Dynamic Provider Vault API
The backend MUST provide authenticated CRUD endpoints under `/api/admin/providers`:
- `GET /api/admin/providers`: Retrieve all configured providers with masked API keys and execution stats.
- `POST /api/admin/providers`: Create a new provider entry with validation.
- `PUT /api/admin/providers`: Update model, priority, active state, or credentials.
- `DELETE /api/admin/providers`: Delete a provider entry.
- `POST /api/admin/providers/test`: Execute a low-latency ping to measure real-time connection status and round-trip milliseconds.

#### Scenario: Admin configures new provider
- Given an operator with valid admin session
- When the operator submits a new provider (e.g. DeepSeek with model `deepseek-chat`)
- Then the system validates credentials, stores the provider in `ai_providers`, and makes it available to the Brain dispatcher

#### Scenario: Live connection ping test
- Given a configured provider in the vault
- When the operator clicks "Test Ping"
- Then the endpoint executes a test completion, measures latency, and returns `{ success: true, latency_ms: 320 }`

### Requirement: Unified Apple HIG Control Center
The `/admin` frontend MUST provide a single-pane-of-glass unified Apple Control Center layout:
- Pitch-black OLED background with Apple Liquid Glass frosted panels.
- Top macOS window chrome with live status badges.
- Cupertino segmented navigation switching between:
  1. `AI Brain & Providers` (Provider configuration, priority reordering, live latency tests, add/edit modals)
  2. `Client Licenses` (License generation, device locks, status filters, expiration management)
  3. `Token Telemetry` (User search, prompt/response inspector, token counts, rolling 10-log buffer)
  4. `Playground Simulator` (Interactive browser query testing to verify Brain execution)
  5. `System Specs` (Hotkeys, hooks documentation, and architecture diagrams)
- Mobile-responsive drawer navigation with frosted glass backdrop.

#### Scenario: Operator switches control center tabs
- Given an authenticated operator in `/admin`
- When the operator clicks the `AI Brain & Providers` tab
- Then the interface smoothly transitions to the provider management surface with Bento metrics and Cupertino switch controls without reloading the page

### Requirement: Rolling 10-Item Token Telemetry
All user requests processed through the Brain MUST be recorded in the `request_history` table in Supabase, and each user (registration key) MUST be capped at a maximum of 10 stored historical queries by automatically pruning older records.

#### Scenario: Enforcing circular 10-item buffer
- Given a registration key with 10 existing history records in Supabase
- When an 11th request is processed for this registration key
- Then the new request is saved, and the oldest (11th) record for that key is deleted, keeping the count at exactly 10
