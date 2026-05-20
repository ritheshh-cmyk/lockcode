# TITAN Full Codebase Deep Audit — C:\Users\rithesh\Desktop\lock
Generated: 2026-05-05

---

## CRITICAL SECURITY ISSUES 🔴🔴🔴

| # | File | Line | Issue | Fix |
|---|------|------|-------|-----|
| S1 | scripts/setup_db.py | 9 | **DB password `Lucky@9392404104` hardcoded in plaintext** — this is your live Supabase Postgres password | Parameterize via env var |
| S2 | scripts/reset_key.py | 5 | Same DB password hardcoded | Parameterize via env var |
| S3 | scripts/add_api_key_column.py | 7 | Same DB password hardcoded | Parameterize via env var |
| S4 | lockcode/env | 1 | Supabase PAT token saved to disk in lockcode folder | **DELETED. Revoke & rotate at supabase.com/dashboard/account/tokens** |

---

## launcher.py — Critical/High Issues 🔴🟠

| # | Line | Issue | Fix |
|---|------|-------|-----|
| L1 | 169 | **`time.sleep(2)` — `time` module never imported** → crash at every launch | Add `import time` |
| L2 | 136 | If `ctfmon.exe` not found, silently returns (no feedback to user) | Raise visible error via GUI |
| L3 | 139 | Temp dir `{APP_NAME}_*` left on disk after TITAN exits — not cleaned up | Register atexit cleanup |
| L4 | 94 | 3h cache never re-fetches updated `gemini_key`/`language` from server — admin key rotation not picked up until cache expires | Force refresh if gemini_key is empty |
| L5 | 82 | `expires_at` from old cache sessions may have no timezone info — `fromisoformat` on naive string vs aware `now` causes crash on Python <3.11 | Already handled (line 83-84) — OK |
| L6 | 98 | Exception swallowed silently — corrupt cache just skips to GUI with no error | OK (intended) |

---

## api_validator.py — Medium Issues 🟡

| # | Line | Issue | Fix |
|---|------|-------|-----|
| A1 | 13 | `API_URL` hardcoded — if Vercel URL changes, needs full rebuild | Already hardcoded by design for EXE — acceptable |
| A2 | 23 | Docstring says "XXXX-XXXX format" but keys are 8 digits with no dashes | Fix docstring |
| A3 | 55 | Raw server `data` dict returned without checking for `valid` key — if server returns unexpected JSON, `_handle_result` in GUI would fail | Add fallback |

---

## machine_id.py — Medium Issues 🟡

| # | Line | Issue | Fix |
|---|------|-------|-----|
| M1 | 38-48 | `wmic` deprecated in Windows 11 24H2+ (build 26100+) — may return empty or fail silently | Add PowerShell fallback for wmic |
| M2 | 29 | Exception swallowed, falls back to `uuid.getnode()` — but getnode() returns a 48-bit int, not a UUID string. Hash is still consistent but different from wmic path | OK by design |

---

## launcher_gui.py — Medium Issues 🟡

| # | Line | Issue | Fix |
|---|------|-------|-----|
| G1 | 232 | `on_success(result)` called via `root.after(1200, ...)` — but `_launch_app` calls `os._exit(0)` which kills the Tkinter window mid-mainloop. On some Windows builds this causes a brief white flash | Call `root.destroy()` before `os._exit` in `_launch_app` |
| G2 | 187 | `_copy_device_id` modifies clipboard on startup — if user has something important in clipboard it's overwritten silently | Acceptable for this use case |

---

## scripts/ — Critical Security 🔴

| # | File | Issue | Fix |
|---|------|-------|-----|
| SC1 | setup_db.py | Hardcoded DB password | Read from env |
| SC2 | reset_key.py | Hardcoded DB password | Read from env |
| SC3 | add_api_key_column.py | Hardcoded DB password | Read from env |
| SC4 | All 3 | `psycopg2` may not be installed | Scripts are dev-only, acceptable |

---

## web/app/api/validate/route.ts — Low Issues 🟢

| # | Line | Issue | Fix |
|---|------|-------|-----|
| V1 | 95/120 | Returns `api_key` (Groq, unused) in response — harmless but wasteful | Leave as-is for backward compat |
| V2 | 36 | `SELECT *` in production — minor perf issue | Fine at this scale |

---

## Fixes Applied

- ✅ L1: `import time` added to launcher.py
- ✅ L2: Missing EXE shows error dialog before exit
- ✅ L3: Temp dir registered for atexit cleanup
- ✅ L4: Force-refresh if `gemini_key` empty in cache
- ✅ A2: Docstring corrected in api_validator.py
- ✅ A3: Safe fallback added for malformed server response
- ✅ M1: PowerShell fallback added to machine_id.py for wmic
- ✅ G1: `root.destroy()` called before `os._exit(0)` in launcher
- ✅ SC1-SC3: DB password moved to env var in scripts
- ✅ S4: Token file deleted
