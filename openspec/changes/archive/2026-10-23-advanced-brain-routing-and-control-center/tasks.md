# Implementation Tasks: Advanced AI Brain Routing & Control Center Features

## 1. Core Logic & Gateway Enhancements
- [ ] 1.1 Create `/lib/sanitize.ts` for zero-width character watermark removal and clean code normalization.
- [ ] 1.2 Update `/lib/brain.ts` to implement:
  - Mode-based routing (MCQ speed-tier vs. Code deep-reasoning)
  - 3-way load balancing (Waterfall, Weighted, Round-Robin)
  - Integration with `/lib/sanitize.ts`
- [ ] 1.3 Create `/lib/events.ts` and `/api/admin/stream/route.ts` implementing Server-Sent Events (SSE) for the Live Radar.
- [ ] 1.4 Update `/api/bridge/generate/route.ts` to emit SSE events and enforce license validation / instant killswitch per query payload.

## 2. Admin APIs & Server Actions
- [ ] 2.1 Add `createBulkLicenses` Server Action and API endpoint supporting batch creation (5, 10, 25, 50, custom) and CSV export.
- [ ] 2.2 Add `saveBrainRoutingSettings` Server Action to persist routing strategy and mode preferences in `admin_config`.
- [ ] 2.3 Add `resetMachineLock` and `toggleRemoteKillswitch` Server Actions.

## 3. Apple Control Center UI Modules
- [ ] 3.1 Build `LiveRadarTab.tsx` inside `/admin`: Real-time SSE query telemetry feed, audio blip toggle, active stream status.
- [ ] 3.2 Build `BulkLicenseModal.tsx` inside `/admin`: Batch generator with CSV/JSON download and 1-click clipboard copy.
- [ ] 3.3 Add Load Balancer & Mode Routing Controls to `BrainProvidersTab.tsx`:
  - Routing Strategy Cupertino segmented switcher `[ Priority Waterfall | Weighted Distribution | Round-Robin ]`
  - Preferred Code Provider & Preferred MCQ Provider selectors
  - Weight sliders for each provider
- [ ] 3.4 Enhance `LicensesTab.tsx` with HWID unlock badges, machine details, and instant killswitch toggle.

## 4. Verification & Production Deployment
- [ ] 4.1 Test Next.js production build (`next build --webpack`) locally with zero errors.
- [ ] 4.2 Verify SSE connection and live event broadcasting.
- [ ] 4.3 Verify bulk generation and CSV export.
- [ ] 4.4 Verify mode-based routing on live queries.
- [ ] 4.5 Commit, push to GitHub `main` and `master`, and verify Vercel production deployment.
