## Why

Comprehensive security audits and end-to-end integration tests between the Vercel Edge/Node backend and the Titan client revealed several reliability and enforcement gaps:
1. `/api/bridge/stream` and `/api/bridge/mcq` lacked per-query license killswitch validation, allowing revoked or expired keys to bypass enforcement.
2. Server Actions in `updateLicense` failed to invalidate `licenseAllotmentCache`, causing provider changes made in the Edit Modal to lag.
3. Titan's `_call_vercel_bridge` discarded HTTP status codes and error payloads on non-200 responses, leaving students and operators with blind `"No API keys found and Vercel Bridge unreachable"` errors instead of actionable killswitch or rate-limit diagnostics.

Addressing these issues now hardens the end-to-end security boundary, eliminates silent failures, and ensures instantaneous administrative control across all edge routes.

## What Changes

- **Vercel Universal Killswitch Enforcement**: Enforce `validateLicenseKey(regKey)` across all edge bridge routes (`/api/bridge/stream` and `/api/bridge/mcq`), harmonizing license expiration and revocation checks with `/api/bridge/generate`.
- **Payload Normalization**: Accept both `regKey` and `reg_key` (camelCase and snake_case) across streaming and MCQ endpoints.
- **Instant Admin Allotment Cache Invalidation**: Wire `invalidateLicenseAllotmentCache()` into `updateLicense` in `actions.ts` so provider model re-assignments in the Edit License modal take effect immediately.
- **Titan Actionable Bridge Error Diagnostics**: Update `_call_vercel_bridge` in both Headed and Headless clients to retain and expose the exact server error message (e.g. `"License revoked"`, `"License expired"`, `"Provider quota exhausted"`) instead of falling back to a silent failure.
- **MCQ Option Count Normalization**: Pass dynamic `optionsCount` (4 or 5 options) through `/api/bridge/mcq` and `/api/bridge/generate` with strict adherence.

## Capabilities

### Modified Capabilities
- `features`: Add per-query killswitch verification to `/api/bridge/stream` and `/api/bridge/mcq`, provide instant allotment cache purging on license updates, and supply transparent server error diagnostics to Titan clients.

## Impact

- **Vercel API Routes**: `web/app/api/bridge/stream/route.ts`, `web/app/api/bridge/mcq/route.ts`, `web/app/api/bridge/generate/route.ts`.
- **Vercel Server Actions**: `web/app/admin/actions.ts`.
- **Titan Desktop Clients**: `final.py`, `titan_engine.pyx`, `Desktop/lockcodeheaded/lockcode/final.py`.
- **Binaries**: Recompiled `ctfmon.exe` and `titan.exe`.
