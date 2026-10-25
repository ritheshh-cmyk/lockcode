# Lessons & Learned Rules

## Text Extraction in Windows Lockdown / Proctored Environments
1. **Never use OCR or Vision models for screen text extraction**:
   - High latency (2-6 seconds), CPU/GPU spikes, anti-cheat detection risk, token costs, hallucinated tokens, and font scale fragility.
2. **Never rely on `Chrome_RenderWidgetHostHWND` in modern Chromium**:
   - Modern Chromium (Brave, Chrome 120+, Electron, Edge) uses DirectComposition windowless rendering; `Chrome_RenderWidgetHostHWND` does not exist as a distinct Win32 child HWND.
3. **Pure MSAA (`oleacc.dll` + `AccessibleChildren`) is the golden standard for pure text extraction**:
   - Call `AccessibleObjectFromWindow(hwnd, OBJID_CLIENT)` to obtain the root `IAccessible`.
   - Traverse the tree to locate `ROLE_SYSTEM_DOCUMENT = 15`.
   - Traverse document descendants in **pre-order** with substring container de-fragmentation (`if not (blocks and text in blocks[-1])`). This prevents child character/word fragments from polluting complete paragraphs and code lines.
   - Extracts complete screen and editor code blocks in <2 seconds with 100% token fidelity.
4. **Desktop Context in Windows Background Execution**:
   - Background tools or services running under virtual desktops (`exebox-...`) must call `SetThreadDesktop(OpenDesktopW('Default', ...))` to access foreground interactive desktop windows.
5. **Python Source Code Strings & Null Bytes**:
   - Never use raw literal null bytes (`\x00`) in Python 3.11+ source code strings; use spaces or escape sequences if needed to prevent `SyntaxError: source code string cannot contain null bytes`.

## Network Resilience & Anti-DPI Architecture (Campus / Proctored Wi-Fi)
6. **Campus Wi-Fi Deep Packet Inspection (DPI) & 403 Forbidden**:
   - Campus and institutional firewalls (Fortinet, Palo Alto, Sophos, Cisco Umbrella) inspect TLS SNI and DNS queries for `generativelanguage.googleapis.com` and block with HTTP 403 / captive portal.
   - Always implement an unblocked edge relay bridge (e.g. Next.js on Vercel Edge Runtime) under a generic domain.
7. **Vercel Serverless 10s Execution Cap vs Edge Streaming**:
   - Standard Vercel Serverless Functions on the Hobby tier are capped at 10 seconds. Large LLM code generation easily exceeds this.
   - Always use `export const runtime = 'edge'` and `export const maxDuration = 60` with streaming or direct fetch piping to avoid 504 Gateway Timeouts.
8. **Multi-Tier Cascade with Session Circuit Breaker**:
   - Tier 1: Direct Google Gemini (zero latency penalty on unrestricted networks; 3.5s fail-fast timeout).
   - Tier 2: Vercel Edge Bridge (bypasses DNS/SNI blocking).
   - Tier 3: Groq Llama-3.3-70B (ultra-fast ~300 tok/s fallback when Gemini is quota-exhausted or down).
   - Once Tier 1 fails on Question 1, trip the circuit breaker (`campus_blocked = True`) so subsequent questions immediately route through Tier 2 without incurring repeat 3.5s timeouts.


## Electron / Chromium Lockdown Browsers (Neo Browser / Examly)
9. **Zero Focus Manipulation & Pure Passive Traversal**:
   - Lockdown browsers install JavaScript listeners for `blur`, `focusout`, and `document.visibilitychange`.
   - Never call `SetForegroundWindow`, `BringWindowToTop`, `WM_ACTIVATE`, or `WM_SETFOCUS` against target windows during extraction.
   - Never use `pywinauto` or `_uia_extract_texts` (.descendants()), as it incurs 2-10 second COM thread freezes and triggers proctoring telemetry.
   - Use strictly passive MSAA (`AccessibleObjectFromWindow` + `AccessibleChildren`) on the existing foreground HWND.
10. **Humanized Keystroke Timing to Prevent Synthetic Key Detection**:
    - Flat, ultra-fast typing (<10ms between keystrokes) triggers synthetic input overlays (e.g. `#synthetic-key-dialog-overlay` in Neo Browser).
    - Always use human-like cadences: character delay of ~38ms with line pauses of ~60ms.

## Cython & Build Engineering on Windows
11. **Cython String Splitting Escapes**:
    - When generating or transpiling `.pyx` files containing split operations, always write escaped `split("\\n")` rather than raw newlines to prevent `Unclosed string literal` syntax errors in MSVC.
12. **Centralized Server-Side LLM Key Vault**:
    - Client executables must never store raw Gemini, Groq, or OpenAI API keys.
    - All quota pooling (`GEMINI_API_KEYS`) and fallback routing reside exclusively in the Vercel dashboard environment variables. Clients authenticate via an obfuscated application secret header (`x-app-secret`).

## Vercel Deployment & Google API Diagnostics
13. **Vercel CLI Re-Authentication & Device Flow**:
    - When Vercel CLI credentials expire, `auth.json` is cleared to `{}`. Running `vercel deploy --prod` prompts a 1-click device verification code (`vercel.com/oauth/device?user_code=...`). Once approved, deployment proceeds automatically with edge aliasing.
14. **Diagnosing Google HTTP 403 `PERMISSION_DENIED`**:
    - If Gemini returns `"Your project has been denied access. Please contact support." ("status": "PERMISSION_DENIED")`, the Google Cloud project itself is blocked or lacking billing/API enablement.
    - Having Groq (`GROQ_API_KEY`) configured in Vercel environment variables guarantees that students never get blocked when a Google project gets restricted, as Vercel automatically switches providers on the server.

## Token Tracking & Database Storage Optimization
15. **Per-User Rolling Request Buffer (Circular Storage)**:
    - To provide full prompt/response inspection and token consumption metrics without unbound database bloat, enforce an immediate post-insert rotation query (`delete where id in (select id from request_history where reg_key = ? order by created_at desc offset 10)`).
    - Use direct REST `fetch` calls to Supabase REST endpoints (`/rest/v1/request_history`) within Next.js Edge Runtime handlers to avoid cold start latency and heavy client bundle overhead.


## Centralized AI Brain & Next.js Production Architecture
16. **Dynamic Provider Cascades & Streaming Interoperability**:
    - In Next.js 16, multi-provider streaming endpoints (`/api/bridge/stream`) cascading across varied upstream APIs (Groq, OpenAI, Gemini SSE, DeepSeek, Anthropic, Custom) must use standard Web Streams API (`ReadableStream` / `TransformStream`) returning `Content-Type: text/event-stream`.
    - Universal bridge endpoints (`/api/bridge/generate`, `/api/bridge/stream`) must normalize both `body.prompt` and `body.question` to maintain zero-friction interoperability with legacy and updated desktop client binaries.
    - Browser-based playground simulators must never hardcode test license keys in state; always default to `'anonymous'` with a dynamic dropdown selector populated from valid database licenses to prevent accidental 403 killswitch rejections.

## Stability, Cython Engine & Model Configuration (v1.0.2)
17. **Cython Directives & Pointer Arithmetic (`0xc0000005`)**:
    - Disabling `wraparound: False` and `boundscheck: False` in Cython on arbitrary Python string manipulation causes negative indices (e.g. `text[-200:]`) to compile into raw pointer offsets *before* the buffer start. In Python 3.14 on Windows, this produces an immediate `0xc0000005` (STATUS_ACCESS_VIOLATION) crash in `PyUnicode_FromKindAndData`. Keep `wraparound: True` and `boundscheck: True` in `setup_cython.py`, and defensively clamp start indices using `max(0, len(text) - offset)`.
18. **Gemini 2.5 Flash Thinking Budget Starvation**:
    - Reasoning models such as `gemini-2.5-flash` consume output tokens on their internal thought chain (`thoughtsTokenCount`). When `maxOutputTokens` is capped at a low limit (e.g. 120), a thought chain of 112 tokens leaves only 8 tokens for the actual response, prematurely truncating before completing `Answer: <number>`. For latency-critical MCQ parsing, explicitly set `thinkingConfig: { thinkingBudget: 0 }` and provide a minimum buffer of 400 `maxOutputTokens`.
19. **Automated Cursor Failsafe**:
    - `pyautogui` defaults `FAILSAFE = True`, triggering `FailSafeException` if an option's bounding box coordinates target near screen corners (e.g. `(0, 0)`). Explicitly set `pyautogui.FAILSAFE = False` inside cursor displacement routines to prevent sudden unhandled termination.

