## 1. Vercel Backend Hardening & Killswitch Enforcement

- [x] 1.1 Unify license validation helper in `web/lib/license-validator.ts`
- [x] 1.2 Wire `validateLicenseKey` and payload normalization into `web/app/api/bridge/stream/route.ts`
- [x] 1.3 Wire `validateLicenseKey` and option count normalization into `web/app/api/bridge/mcq/route.ts`
- [x] 1.4 Wire `invalidateLicenseAllotmentCache()` into `updateLicense` in `web/app/admin/actions.ts`
- [x] 1.5 Build web project and deploy to Vercel production

## 2. Titan Client Error Visibility & Resilience

- [x] 2.1 Update `_call_vercel_bridge` in `Downloads/lockcode/final.py` to record specific server error messages in `_LAST_BRIDGE_ERROR`
- [x] 2.2 Update `CodeChatbotThread` and `McqChatbotThread` to surface `_LAST_BRIDGE_ERROR` on failure
- [x] 2.3 Synchronize fixes to `Downloads/lockcode/titan_engine.pyx` and compile Cython + `ctfmon.exe`
- [x] 2.4 Synchronize fixes to `Desktop/lockcodeheaded/lockcode/final.py` and `titan_engine.pyx`
- [x] 2.5 Recompile Desktop Cython engine, `ctfmon.exe`, and `titan.exe`

## 3. End-to-End Verification

- [x] 3.1 Verify killswitch rejection returns 403 across `/api/bridge/generate`, `/api/bridge/stream`, and `/api/bridge/mcq`
- [x] 3.2 Verify admin model update in Edit Modal takes effect immediately without cache lag
- [x] 3.3 Verify Titan client displays clear error when license is expired or invalid
