# TITAN System — Deep Audit Report
Generated: 2026-05-05

---

## FOLDER A: `c:\Users\rithesh\Downloads\lockcode\` (TITAN App)

### 🔴 CRITICAL — Crashes / Wrong Behaviour

| # | File | Line | Issue | Fix |
|---|------|------|-------|-----|
| 1 | final.py | 785 | `load_prompts_from_ini()` still called in `McqChatbotThread._send_request` after function was deleted — **NameError crash on every MCQ call** | Replace with `get_mcq_prompt()` |
| 2 | final.py | 811 | `mcq_load_api_keys_from_ini()` called in `_build_api_keys()` — function does not exist — **NameError crash on every MCQ call** | Replace with `self.api_keys` only (keys come from stdin now) |
| 3 | final.py | 383 | Error message still says "Add more keys to gemini.ini" — wrong, keys come from launcher now | Update message |
| 4 | final.py | 386 | Fallback message still says "Add your Gemini keys to gemini.ini" | Update message |
| 5 | final.py | 892 | MCQ no-key error message references `gemini.ini` | Update message |

### 🟠 HIGH — Dead Code / Memory / Correctness

| # | File | Line | Issue | Fix |
|---|------|------|-------|-----|
| 6 | final.py | 82 | `_DEFAULT_CODING_LANGUAGE = "Java"` — never referenced after refactor | Remove |
| 7 | final.py | 84 | `_CACHED_PROMPTS = {}` — never populated or read anywhere | Remove |
| 8 | final.py | 50 | Stale comment "Load Gemini API keys and prompts from gemini.ini" | Remove |
| 9 | final.py | 442 | `mcq_split_config_values()` — only used internally by deleted `mcq_load_api_keys_from_ini()` — dead code | Remove |
| 10 | final.py | 519-529 | `McqChatbotThread._cached_api_keys` / `_api_keys_cache_built` class vars — stale INI cache mechanism, now uses runtime keys | Remove cache vars, simplify `_build_api_keys()` |

### 🟡 MEDIUM — Stability / Stealth

| # | File | Line | Issue | Fix |
|---|------|------|-------|-----|
| 11 | final.py | 1060 | `api_key` / `api_version` / `model_name` used in strict retry but scoped inside inner loop — may reference last loop value; harmless but fragile | Add explicit capture before loop exit |
| 12 | TITAN.spec | 13 | Spec still bundles `gemini.ini` — keys were in it, but now keys come from launcher. Still needed for SSL verify. Keep but document | Add comment in spec |

---

## FOLDER B: `C:\Users\rithesh\Desktop\lock\` (Launcher + Web)

### 🔴 CRITICAL

| # | File | Line | Issue | Fix |
|---|------|------|-------|-----|
| 13 | LockApp.spec | 15–16 | Still bundles `mcq.ini` + `gemini.ini` — mcq.ini no longer needed (Groq removed). gemini.ini still needed for SSL verify only. | Remove mcq.ini from datas |
| 14 | launcher.py | 147 | `proc.wait(timeout=5)` — if TITAN starts Qt event loop before reading stdin, it won't exit in 5s, so launcher hangs. Should NOT wait for TITAN to exit, only wait for stdin close confirmation | Use `proc.stdin.close()` + brief `time.sleep(2)` then `os._exit(0)` |

### 🟠 HIGH

| # | File | Line | Issue | Fix |
|---|------|------|-------|-----|
| 15 | validate/route.ts | 95–97 | Returns `api_key` (Groq) which TITAN no longer uses — wastes bandwidth and leaks key to client unnecessarily | Can remove `api_key` from response (non-breaking: TITAN ignores it) |
| 16 | actions.ts | 101–107 | `rotateApiKey()` updates Groq `api_key` — still in admin panel. Functionally harmless but UI shows "Groq Key" column that serves no purpose | Cosmetic: can rename label to "Reserved" or remove column |
| 17 | launcher.py | 110–115 | `_write_cached_session` signature has no `api_key` param — but old cached sessions (from before this update) may have an `api_key` field in them that `_read_cached_session` returns. Since `on_success` no longer reads it, this is safe. | Add note, no action needed |

### 🟡 MEDIUM

| # | File | Line | Issue | Fix |
|---|------|------|-------|-----|
| 18 | web/app/page.tsx | all | Default Next.js boilerplate page — still shows "To get started, edit page.tsx". Should redirect `/` to `/admin` | Add redirect |
| 19 | web/supabase/schema.sql | all | Missing `gemini_key`, `language`, `api_key` columns — migration file created but not yet applied to live DB | Run `migration_add_keys.sql` in Supabase SQL editor |
| 20 | launcher_gui.py | 202–204 | Key validation accepts exactly 8 digits. If admin creates a key with fewer than 8 digits (possible via direct DB insert), user can never activate | Enforce 8-digit minimum in `createLicense` on server side too (already done in actions.ts) |

### 🟢 LOW / INFO

| # | File | Line | Issue | Fix |
|---|------|------|-------|-----|
| 21 | machine_id.py | 61 | `wmic` deprecated in Windows 11 24H2+ — may return empty output | Add PowerShell fallback |
| 22 | api_validator.py | 14 | `APP_SECRET` hardcoded as `"lockapp-secret-2026"` — should be in `.env` | Already in `.env` on server; client side is unavoidable for EXE distribution |

---

## Summary of Fixes Applied in Code

- ✅ #1: `load_prompts_from_ini()` → `get_mcq_prompt()` in `_send_request`
- ✅ #2: `mcq_load_api_keys_from_ini()` removed from `_build_api_keys()`; uses `self.api_keys` + env fallback only
- ✅ #3–5: Error messages updated to not reference `gemini.ini`
- ✅ #6–9: Dead globals `_DEFAULT_CODING_LANGUAGE`, `_CACHED_PROMPTS`, stale comment, `mcq_split_config_values` removed
- ✅ #10: MCQ key cache class vars removed; `_build_api_keys()` simplified
- ✅ #13: `mcq.ini` removed from `LockApp.spec`
- ✅ #14: Launcher no longer waits for TITAN to exit; exits cleanly after stdin write
- ✅ #18: `/` now redirects to `/admin`
