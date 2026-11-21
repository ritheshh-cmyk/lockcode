# Implementation Tasks: Unified Apple Control Center & Multi-Provider AI Brain

## 1. Database Provisioning & Schema Migration
- [x] 1.1 Execute SQL migration on Supabase using Management API to create `ai_providers` table with indices and RLS policies.
- [x] 1.2 Execute SQL migration on Supabase to ensure `request_history` table exists with indices and RLS policies.
- [x] 1.3 Seed default initial providers (Groq Llama 3.3 70B & Gemini 2.5 Flash) into `ai_providers`.

## 2. Multi-Provider AI Brain Engine (`/lib/brain.ts` & `/api/bridge/generate`)
- [x] 2.1 Implement `/lib/brain.ts` supporting Groq, Google Gemini, DeepSeek, OpenAI, Anthropic, OpenRouter, and custom endpoints with failover cascade and circuit breaking.
- [x] 2.2 Update `/api/bridge/generate/route.ts` to route all queries through the dynamic Brain engine while guaranteeing the exact payload response (`text`, `candidates`, `choices`) for TITAN.
- [x] 2.3 Verify token logging in `/lib/history.ts` records to `request_history` and strictly caps entries at 10 per user.

## 3. Dynamic Provider Management API (`/api/admin/providers`)
- [x] 3.1 Create `/api/admin/providers/route.ts` with GET, POST, PUT, DELETE handlers protected by admin authentication.
- [x] 3.2 Create `/api/admin/providers/test/route.ts` for live connection testing and latency measurement.

## 4. Unified Apple Control Center Frontend (`/admin`)
- [x] 4.1 Rebuild `/admin/page.tsx` into a single-pane-of-glass Apple macOS Sequoia / iOS Control Center interface.
- [x] 4.2 Build the `AI Brain & Providers` tab: provider cards, priority badges, Cupertino toggle switches, live latency ping buttons, and Add/Edit Provider modal.
- [x] 4.3 Build the `Client Licenses` tab: license table, Cupertino filter segments, days remaining pills, and Add License modal.
- [x] 4.4 Build the `Token Telemetry` tab: token metrics, search by reg key, expandable prompt/response diff viewer with copy-to-clipboard.
- [x] 4.5 Build the `Playground Simulator` tab: test prompts directly in the browser and inspect the exact TITAN payload response.
- [x] 4.6 Build the `System Specs` tab: hotkey guide and architecture specs.
- [x] 4.7 Polish `/history` and `/docs` to align with the Control Center design and provide seamless bidirectional navigation.

## 5. Verification & Production Deployment
- [x] 5.1 Test Next.js production build (`next build --webpack`) locally with zero errors.
- [x] 5.2 Test live Brain query and provider latency testing.
- [x] 5.3 Commit and push changes to GitHub `main` and `master`.
- [x] 5.4 Verify Vercel production deployment (`web-phi-taupe-97.vercel.app`) and test live endpoints.

