# Technical Design: Vercel AI Hub Redesign & Expansion

## 1. System Architecture

```
[ TITAN Client Apps ] ── (HTTPS + x-app-secret) ──► [ Vercel Edge AI Hub ]
                                                          │
          ┌───────────────────────────────────────────────┼──────────────────────────────┐
          ▼                                               ▼                              ▼
  /api/bridge/generate                           /api/bridge/mcq                 /api/bridge/health
  (Universal Code & Multi-Mode)                  (Optimized Deterministic)       (Diagnostics & Status)
          │                                               │
          ▼                                               ▼
  Tier 1: Env Pool (`GEMINI_API_KEYS`)                    │
  Tier 2: Supabase Pool (`api_key_pool`)                  │
  Tier 3: Groq Edge (`llama-3.3-70b`)                     │
          │                                               │
          └───────────────────────┬───────────────────────┘
                                  ▼
                     [ Return Clean Sanitized JSON ]
```

## 2. Dynamic Key Resolution Algorithm

When a request arrives at `/api/bridge/generate`:
1. Check `x-app-secret`. Reject with 401 if invalid.
2. Build candidate key list:
   - Check if `apiKey` is provided in request body (Client override).
   - Read and parse comma-separated `GEMINI_API_KEYS` from `process.env`.
   - Query Supabase `api_key_pool` for up to 3 `active` (or unchecked) keys where `used = false`.
3. Sequentially query Gemini models (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`).
4. If HTTP 429/403/401 occurs:
   - Mark key as temporarily failed.
   - If key was from Supabase, update its status in background to `rate_limited`.
   - Rotate to next key in pool.
5. If all Gemini keys fail or are exhausted:
   - Immediately dispatch to Groq (`llama-3.3-70b-versatile`).
   - Return response with `provider: "groq"`, `fallback_used: true`.

## 3. Dedicated Endpoints Specification

### A. Health & Diagnostics (`GET /api/bridge/health`)
- Returns:
  ```json
  {
    "status": "healthy",
    "edge_region": "iad1",
    "uptime": 123456,
    "providers": {
      "gemini": { "env_keys_count": 2, "pool_keys_available": 5, "configured": true },
      "groq": { "configured": true, "model": "llama-3.3-70b-versatile" }
    },
    "timestamp": "2026-10-23T13:10:00.000Z"
  }
  ```

### B. High-Speed MCQ Solver (`POST /api/bridge/mcq`)
- Payload: `{ "question": "What is ...", "options": ["A: ...", "B: ..."], "systemPrompt"?: "..." }`
- Prompt enforces strict JSON output: `{"option": "A", "confidence": 95, "explanation": "..."}`.
- Sanitizes and parses response directly, returning `<800ms` answer.

### C. Code Cleaner & Formatter (`POST /api/bridge/format`)
- Payload: `{ "code": "```java\npublic class ...\n```", "language": "Java" }`
- Strips markdown fences, trailing whitespace, invalid characters, and validates basic bracket matching.

### D. Streaming Endpoint (`POST /api/bridge/stream`)
- Uses Edge Web Streams (`new ReadableStream`) to emit Server-Sent Events (`data: {"chunk": "..."}\n\n`).
