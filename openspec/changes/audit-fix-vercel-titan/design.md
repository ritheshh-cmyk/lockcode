## Context

TITAN uses a hybrid architecture:
- Frontend / Edge: Vercel Next.js routes (`/api/bridge/generate`, `/api/bridge/stream`, `/api/bridge/mcq`) acting as an anti-DPI edge proxy and multi-provider cascade hub.
- Administrative Control: `/admin` dashboard with Server Actions modifying Supabase `licenses` and `ai_providers`.
- Client Engines: Headed (PyQt5 HUD on Desktop) and Headless (silent zero-window daemon in Downloads) consuming the edge bridge.

Auditing revealed discrepancies in killswitch enforcement across the three bridge endpoints, cache coherence issues when updating models in Server Actions, and unhandled non-200 error bodies in the client's bridge caller.

## Goals / Non-Goals

**Goals:**
- Unify license validation logic into a shared helper `validateLicenseKey` utilized consistently across `generate`, `stream`, and `mcq`.
- Ensure instantaneous cache invalidation for `licenseAllotmentCache` across all update paths in `actions.ts`.
- Retain detailed bridge error responses in TITAN (`_LAST_BRIDGE_ERROR`) to inform students when a license is expired or revoked.
- Synchronize all improvements across both Headed (`Desktop\lockcodeheaded\lockcode`) and Headless (`Downloads\lockcode`) client codebases and rebuild executables.

**Non-Goals:**
- Modifying offline encryption routines (Fernet remains standard).
- Altering core MSAA accessibility tree traversal logic which was already stabilized.

## Decisions

### Decision 1: Shared In-Memory License Validation Cache with 60s Expiry
- **Choice:** Maintain a 60-second in-memory LRU cache for `validateLicenseKey` in edge/node runtimes, while allowing Server Actions to force-invalidate it.
- **Alternatives Considered:** Direct Supabase lookup on every query (adds 50-100ms database latency to latency-critical MCQ queries).
- **Rationale:** 60s cache bounds database load while guaranteeing sub-minute enforcement of administrative killswitches.

### Decision 2: Structured Client Error State
- **Choice:** Update `_call_vercel_bridge` to return a tuple `(text, error_message)` or populate module-level `_LAST_BRIDGE_ERROR` with the exact server message if `resp.status_code != 200`.
- **Alternatives Considered:** Raising Python exceptions.
- **Rationale:** Preserves existing fallback flow without altering thread crash guards, while giving `CodeChatbotThread` and `McqChatbotThread` immediate access to the true failure cause.

## Risks / Trade-offs

- **[Risk]** In-flight streams terminated mid-flight if a license is revoked during token streaming.
  - *Mitigation:* Next.js checks license validity upfront before opening the provider stream.
- **[Risk]** Vercel edge runtime environment variable mismatches (`APP_SECRET`).
  - *Mitigation:* Fall back to standard secret constant if `process.env.APP_SECRET` is unset.

## Migration Plan

1. Update Vercel API routes and server actions in `web/`.
2. Build and deploy to Vercel production (`vercel --prod`).
3. Update `final.py` and `titan_engine.pyx` in both headless and headed repositories.
4. Recompile Cython engines and bundle `ctfmon.exe` and `titan.exe`.
