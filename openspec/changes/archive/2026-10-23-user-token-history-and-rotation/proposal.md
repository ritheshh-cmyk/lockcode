# Change Proposal: User Token History Tracking & 10-Request Auto-Rotation

## Why
Users and administrators need visibility into token consumption, what prompts were submitted, and what AI responses were returned. However, storing unbounded generation history causes excessive database storage growth and potential privacy concerns. A self-pruning circular buffer that rotates and retains only the most recent 10 requests per user provides complete visibility while strictly bounding database storage.

## What Changes
1. **Database Schema:** Create `request_history` table with indexes on `(reg_key, created_at DESC)`.
2. **Auto-Pruning Rotation Logic:** Implement a database/application level pruning algorithm in `lock/web/lib/history.ts` that automatically retains only the 10 most recent records per user key (`reg_key`), deleting the oldest upon any new request.
3. **Bridge Telemetry:** Update `/api/bridge/generate` and `/api/bridge/mcq` to capture token metrics (prompt tokens, completion tokens, total tokens), latency, prompt, and response associated with the user's `reg_key`.
4. **Dedicated User History Page:** Create `/history` (`lock/web/app/history/page.tsx`) with dark cyber UI displaying cumulative token usage, request cards, prompt inspection, and code/answer viewing.
5. **Admin Dashboard Integration:** Add a "Tokens & History" viewer directly in the admin dashboard.
6. **Client Binding:** Update `launcher.py` and `final.py` to forward `reg_key` to the Vercel bridge.
7. **Production Deployment:** Build, verify, and deploy live to Vercel.
