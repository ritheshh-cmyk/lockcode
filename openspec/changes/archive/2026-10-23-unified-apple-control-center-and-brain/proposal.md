# Proposal: Unified Apple Control Center & Multi-Provider AI Brain

## Why
1. **Frontend Experience**: The user requested a genuinely unified, professional Apple Human Interface Guidelines (HIG) Control Center. Disjointed, fragmented pages do not provide the unified single-pane-of-glass administrative control needed for managing client licenses, real-time token telemetry, and AI routing.
2. **The "Brain" Architecture**: Previously, TITAN relied heavily on direct client-side Gemini calls or basic environment variable fallbacks. The user requires a centralized, provider-agnostic **AI Brain** on Vercel that can manage **unlimited API providers and keys** (Groq, Gemini, DeepSeek, OpenAI, Anthropic, OpenRouter, Custom URLs). 
3. **Decoupled Client**: TITAN client remains completely unaware of which upstream provider or key fulfills the query. TITAN simply sends its question payload to Vercel, and Vercel's Brain selects the optimal provider, executes the query, handles automated failover cascades, logs token telemetry (capped at 10 requests per user), and returns the exact payload contract expected by TITAN.

## What Changes
- **Database (Supabase)**:
  - Create `ai_providers` table for dynamic, unlimited provider and API key management with priority ordering, active toggles, latency tracking, and error logging.
  - Ensure `request_history` table exists with index on `reg_key` for token history logging.
- **Backend & Brain Engine (`/lib/brain.ts` & `/api/bridge/generate`)**:
  - Implement dynamic multi-provider routing supporting Groq (OpenAI-compatible ultra-fast inference), Google Gemini (with key pool rotation), DeepSeek, OpenAI, Anthropic, OpenRouter, and custom endpoints.
  - Automatic real-time failover cascade: if Primary fails or is rate-limited (429), automatically fail over to secondary providers.
  - Preserve 100% backward compatibility for TITAN payload responses (`text`, `candidates`, `choices`).
  - Create admin API routes for CRUD operations and live latency ping testing on providers (`/api/admin/providers`, `/api/admin/providers/test`).
- **Unified Apple Control Center UI (`/admin`)**:
  - Build a comprehensive, authentic Apple macOS Sequoia / iOS Control Center interface in `/admin`.
  - Top macOS chrome status bar with live provider counts and biometric lock indicator.
  - Cupertino segmented navigation:
    1. **AI Brain & Providers**: View, add, edit, test latency, reorder priorities, and toggle providers.
    2. **Client Licenses**: Manage 8-digit client licenses, hardware bindings, and expirations.
    3. **Token Telemetry**: Live request history and token metrics with circular 10-log buffer per user.
    4. **Playground Simulator**: Real-time interactive testing of the Brain gateway.
    5. **System Specs**: Hotkey references and architecture specifications.
- **Verification**:
  - Live API testing of Groq and Gemini providers.
  - Verification of TITAN payload contract compatibility.
  - Vercel production deployment and live endpoint testing.

## Capabilities
### New Capabilities
- `admin-providers-vault`: Dynamic administration of unlimited AI providers, API keys, models, and priority ranks.
- `multi-provider-brain`: Centralized Vercel Edge/Node execution engine with automated failover cascade across multiple providers.
- `unified-control-center`: Single-pane-of-glass Apple HIG management dashboard for providers, licenses, telemetry, and live testing.

### Modified Capabilities
- `bridge-generate`: Enhanced to load dynamic providers from the Brain vault while maintaining exact TITAN payload response shapes.
- `token-telemetry`: Persisted directly to Supabase with rolling 10-item cap per user.

## Impact
- **TITAN Client**: Zero code changes required; continues to communicate seamlessly with `/api/bridge/generate`.
- **Operators**: Can dynamically add, rotate, test, and prioritize any AI model or key from any device without redeploying code.
