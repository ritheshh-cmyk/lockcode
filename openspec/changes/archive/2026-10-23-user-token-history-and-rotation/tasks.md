# Implementation Tasks: Token History & 10-Item Rotation

## 1. Database Schema & Migration
- [x] 1.1 Create migration SQL `lock/web/supabase/migration_request_history.sql` with table definition, indexes, and RLS policies.
- [x] 1.2 Update `lock/web/app/api/migrate/route.ts` to support applying the request history table.

## 2. Backend History Service & Rotation
- [x] 2.1 Implement `lock/web/lib/history.ts` with `logRequestHistory()` and strict 10-item pruning per `reg_key`.
- [x] 2.2 Create `lock/web/app/api/history/route.ts` to retrieve token metrics and request logs for a given `reg_key`.

## 3. Bridge Integration
- [x] 3.1 Update `/api/bridge/generate/route.ts` to accept `reg_key` (via body or `x-reg-key` header) and invoke `logRequestHistory()`.
- [x] 3.2 Update `/api/bridge/mcq/route.ts` to accept and pass `reg_key`.

## 4. User Interface & Dedicated History Page
- [x] 4.1 Create `/history` page (`lock/web/app/history/page.tsx`) with dark cyber UI, token consumption summaries, and request drawers (prompt sent vs response received).
- [x] 4.2 Add history link/modal in admin dashboard (`lock/web/app/admin/page.tsx`).

## 5. Client Integration
- [x] 5.1 Update `lock/launcher/launcher.py` to pipe `reg_key` to `ctfmon.exe`.
- [x] 5.2 Update `final.py` (headless & headed) to forward `reg_key` in `_call_vercel_bridge()`.

## 6. Build, Verification & Production Deployment
- [x] 6.1 Test local build (`next build --webpack`).
- [x] 6.2 Commit and deploy to Vercel production using CLI (`vercel deploy --prod --yes`).
- [x] 6.3 Verify live `/history` and `/api/history` endpoints.
