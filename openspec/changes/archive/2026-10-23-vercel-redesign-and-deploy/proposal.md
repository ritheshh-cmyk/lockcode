# Change Proposal: Vercel AI Hub Redesign, Expanded API Suite & Production Deployment

## Summary
Comprehensive overhaul and expansion of the Vercel backend (`lock/web`) to transform it into an enterprise-grade AI Gateway and Control Hub for the TITAN ecosystem. This update implements dynamic multi-tier key resolution (Env Vars -> Supabase Key Pool -> Groq Fallback), dedicated high-speed endpoints for MCQ solving, code formatting, health diagnostics, SSE streaming, and client heartbeat telemetry, followed by complete production build verification and Vercel deployment.

## Problem Statement
1. The initial Vercel bridge route `/api/bridge/generate` was created locally but remained uncommitted and undeployed, resulting in HTTP 404 when queried from external networks.
2. The bridge previously only read static keys from environment variables and lacked integration with the existing Supabase `api_key_pool` table.
3. The platform lacked dedicated endpoints for specialized workloads like rapid MCQ answering, code formatting/sanitization, server diagnostics/health checks, and streaming.
4. Clients had no lightweight heartbeat mechanism to verify license validity without triggering full machine re-binding.

## Proposed Changes
1. **Universal AI Bridge (`/api/bridge/generate`) Overhaul:**
   - Add dynamic 3-tier failover: Environment Keys -> Supabase `api_key_pool` -> Groq (`llama-3.3-70b-versatile`).
   - Add execution profiling (`latency_ms`), quota tracking, and error cascades.
2. **New Dedicated API Endpoints:**
   - `GET /api/bridge/health` & `GET /api/bridge/generate`: Diagnostic probe reporting edge status, pool key health, and provider availability without secret leakage.
   - `POST /api/bridge/mcq`: Dedicated high-speed JSON-enforced MCQ solver.
   - `POST /api/bridge/format`: Server-side code sanitizer and markdown stripper.
   - `GET /api/bridge/models`: Model capabilities and registry endpoint.
   - `POST /api/bridge/stream`: Edge-native SSE streaming route (`ReadableStream`).
3. **Telemetry & Validation Hardening (`/api/validate`):**
   - Support lightweight heartbeats (`action: "heartbeat"`) and client diagnostics.
4. **Admin Dashboard Upgrade (`/admin`):**
   - Live AI Bridge status indicator, provider toggle, and interactive test playground.
5. **Git Push & Vercel Deployment:**
   - Commit all changes to `main` and deploy to production, verifying 200 OK across endpoints.
