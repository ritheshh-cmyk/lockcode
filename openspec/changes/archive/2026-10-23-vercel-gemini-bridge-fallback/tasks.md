## 1. Vercel Backend Bridge Endpoint

- [x] 1.1 Create `lock/web/app/api/bridge/generate/route.ts` with Next.js App Router POST handler
- [x] 1.2 Implement `x-app-secret` header verification against `process.env.APP_SECRET`
- [x] 1.3 Implement forwarding to Google Gemini API (`https://generativelanguage.googleapis.com`) supporting client keys with fallback to server environment key
- [x] 1.4 Configure execution duration (`export const maxDuration = 60`) and error handling for model fallback responses

## 2. Client Dual-Tier Failover Engine (Python)

- [x] 2.1 Define obfuscated Vercel bridge endpoint constants (`BRIDGE_URL`, `APP_SECRET`) in `final.py`
- [x] 2.2 Implement `_call_gemini_with_fallback()` with fast failover when direct Gemini calls return HTTP 403, 401, connection error, or timeout
- [x] 2.3 Update `CodeChatbotThread.run()` to use the dual-tier failover pipeline in both headless and headed repositories
- [x] 2.4 Update `McqChatbotThread.run()` to use the dual-tier failover pipeline in both headless and headed repositories

## 3. Verification & Binary Rebuild

- [x] 3.1 Verify bridge route locally with mock payload and simulate blocked direct connection
- [x] 3.2 Recompile Cython extensions (`setup_cython.py build_ext --inplace`) in both repositories
- [x] 3.3 Rebuild and deploy `ctfmon.exe` and `titan.exe` for both headless and headed workspaces
