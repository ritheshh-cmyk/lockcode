# LockCode / TITAN — Complete Project Memory
**Last updated:** 2026-05-12 | **Version:** 2.0

---

## 1. Project Identity

| Field | Value |
|-------|-------|
| Project name | **LockCode** (engine: **TITAN**) |
| Purpose | Hardware-locked AI assistant (MCQ + Coding) for competitive exams |
| Engine binary | `ctfmon.exe` (built from `final.py`) |
| Launcher binary | `LockApp.exe` (built from `launcher.py`) |
| Admin panel | https://web-phi-taupe-97.vercel.app/admin |
| Live API | https://web-phi-taupe-97.vercel.app/api/validate |

---

## 2. Infrastructure Connections

### Supabase
- **Project ref:** `swdojmsuznofynwgssxs`
- **URL:** `https://swdojmsuznofynwgssxs.supabase.co`
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3ZG9qbXN1em5vZnlud2dzc3hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjY1OTksImV4cCI6MjA5MzQwMjU5OX0.xOKEUX18_m0PTdk73U_NETT-KHh7KEfFH4Bx0gT-zew`
- **Service Role Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3ZG9qbXN1em5vZnlud2dzc3hzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzgyNjU5OSwiZXhwIjoyMDkzNDAyNTk5fQ.n_TZ3gA_tYTr-E8cvU5-F2ORoHDcZiQLnGOhReZx_54`
- **Dashboard:** https://supabase.com/dashboard/project/swdojmsuznofynwgssxs
- **SQL Editor:** https://supabase.com/dashboard/project/swdojmsuznofynwgssxs/sql/new

### Vercel
- **Project name:** `web`
- **Source dir:** `C:\Users\rithesh\Desktop\lock\web`
- **Deploy command:** `vercel --prod --yes` (run from web dir)
- **Set env var:** `echo "value" | vercel env add VAR_NAME production --yes`

### GitHub
- **Repo:** https://github.com/ritheshh-cmyk/lockcode
- **Push command:** `git -C "C:\Users\rithesh\Desktop\lock" push origin main`

---

## 3. Admin Authentication

| Field | Value |
|-------|-------|
| Password | `Lucky@1222` |
| SHA-256 hash | `4016f2f6da63d9d07f20197b69aacc1c4cc65fb489fae9a178605233b2e07035` |
| Vercel env `ADMIN_PASSWORD` | `Lucky@1222` |
| Vercel env `ADMIN_PASSWORD_HASH` | `4016f2f6da63d9d07f20197b69aacc1c4cc65fb489fae9a178605233b2e07035` |
| Vercel env `APP_SECRET` | `lockapp-secret-2026` |

**Auth fallback chain (in order):**
1. Supabase `admin_config` table (`admin_password_hash` key)
2. `ADMIN_PASSWORD_HASH` env var (hash comparison)
3. `ADMIN_PASSWORD` env var (plain text — last resort)

### Pending SQL (run in Supabase SQL Editor if not done)
```sql
CREATE TABLE IF NOT EXISTS admin_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO admin_config (key, value)
VALUES ('admin_password_hash', '4016f2f6da63d9d07f20197b69aacc1c4cc65fb489fae9a178605233b2e07035')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

---

## 4. Source File Map

### Engine (TITAN)
```
C:\Users\rithesh\Downloads\lockcode\
├── final.py                   ← TITAN main app (MCQ + Coding, multi-model)
├── gemini.ini                 ← Prompts + fallback Gemini keys (dev use)
├── run_titan.ps1              ← Quick-launch script (dev/test)
├── TITAN.spec                 ← PyInstaller build → dist\ctfmon.exe
├── models.txt                 ← NVIDIA NIM test snippets
├── docs\
│   ├── MEMORY.md              ← This file
│   └── TITAN_workflow.md      ← Architecture + flow diagrams (v2.0)
├── tests\                     ← Unit tests
├── oas\                       ← OAS (legacy MCQ-only) copy
└── copy\
    └── final_copy_y.py        ← Working snapshot / backup of final.py
```

### Launcher
```
C:\Users\rithesh\Desktop\lock\launcher\
├── launcher.py                ← Main flow: cache → GUI → pipe → watchdog
├── launcher_gui.py            ← PyQt5 registration window (white theme)
├── api_validator.py           ← POST to /api/validate
├── machine_id.py              ← SHA256(BIOS UUID) fingerprint
└── LockApp.spec               ← PyInstaller build → dist\LockApp.exe
```

### Web (Admin Panel + API)
```
C:\Users\rithesh\Desktop\lock\web\
├── app\
│   ├── admin\
│   │   ├── page.tsx           ← Admin dashboard UI
│   │   └── actions.ts         ← Server actions (CRUD + auth)
│   ├── api\
│   │   ├── validate\route.ts  ← License validation endpoint
│   │   └── migrate\route.ts   ← One-time migration (delete after use)
│   └── page.tsx               ← Redirects → /admin
├── lib\supabase.ts            ← Supabase clients (anon + admin)
├── supabase\
│   ├── migration_add_model.sql
│   └── migration_admin_config.sql
├── .env.local                 ← Local secrets (not in git)
└── vercel.json
```

### Misc
```
C:\Users\rithesh\Desktop\neo\mcq.py   ← Standalone MCQ test script
C:\Users\rithesh\Downloads\lockcode\test_sendinput.py  ← Windows SendInput test
C:\Users\rithesh\Downloads\lockcode\test_deepseek.py   ← DeepSeek API test
C:\Users\rithesh\Downloads\lockcode\test_glm.py        ← GLM API test
C:\Users\rithesh\Downloads\lockcode\test_nim.py        ← NVIDIA NIM test
```

---

## 5. Database Schema

### `licenses` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `reg_key` | VARCHAR(8) | 8-digit unique key |
| `label` | VARCHAR | Customer name |
| `gemini_key` | TEXT | Provider API key (`AIza...` or `nvapi-...`) |
| `language` | VARCHAR | Java / Python / C++ etc. |
| `model` | VARCHAR(50) | `gemini` / `meta/llama-3.1-70b-instruct` / `minimax/minimax-m2.7` |
| `machine_id` | TEXT | SHA256(BIOS UUID) — set on first activation |
| `activated_at` | TIMESTAMPTZ | First activation time |
| `expires_at` | TIMESTAMPTZ | License expiry |
| `is_active` | BOOLEAN | Admin revoke flag |
| `created_at` | TIMESTAMPTZ | Row creation time |

### `admin_config` table
| Column | Type | Notes |
|--------|------|-------|
| `key` | TEXT | Primary key |
| `value` | TEXT | e.g. `admin_password_hash` value |

---

## 6. AI Model Routing

| Admin Selector | `model` in DB | API Endpoint | Auth |
|---|---|---|---|
| Gemini 2.5 Flash | `gemini` | `generativelanguage.googleapis.com` | `?key=API_KEY` |
| Llama 3.1 70B | `meta/llama-3.1-70b-instruct` | `integrate.api.nvidia.com/v1/chat/completions` | `Bearer nvapi-...` |
| Minimax M2.7 | `minimax/minimax-m2.7` | `integrate.api.nvidia.com/v1/chat/completions` | `Bearer nvapi-...` |

**Response parsing:**
- Gemini → `candidates[0].content.parts[0].text`
- NIM (OpenAI-compat) → `choices[0].message.content`

---

## 7. Launcher Constants

| Constant | Value |
|----------|-------|
| `APP_NAME` | `LockApp` |
| `BUNDLED_EXE_NAME` | `ctfmon.exe` |
| `FERNET_KEY` | `AkOMIsXmgK7veF1rKMv6c7NazPzYWrRwMAILVLGTG-M=` |
| `SESSION_CACHE_HOURS` | `2` |
| `API_URL` | `https://web-phi-taupe-97.vercel.app/api/validate` |
| `APP_SECRET` | `lockapp-secret-2026` |
| Session file path | `%APPDATA%\LockApp\session.json` |

**Cache invalidation triggers:**
- File missing or corrupt
- `machine_id` mismatch
- License expired (`expires_at` in past)
- Cache older than 2 hours (`cached_at`)
- `gemini_key` empty (admin may not have set it yet)

---

## 8. Machine ID Algorithm

```
Priority 1: PowerShell → (Get-CimInstance Win32_ComputerSystemProduct).UUID
Priority 2: wmic csproduct get uuid
Priority 3: uuid.getnode() (MAC-based fallback)

hash = SHA256(f"BIOS:{uuid}")[:32]  → 32-char hex string
```

---

## 9. TITAN Hotkeys

| Key | Action |
|-----|--------|
| `F5` | Capture foreground window → send to Coding AI |
| `Alt+Y` | Capture MCQ window → send to MCQ AI |
| `F6` | Auto-type next line of buffered code (pyautogui) |
| `F2` | Toggle HUD show/hide |
| `F3` | Toggle stealth mode (DWM `SetWindowDisplayAffinity`) |
| `Alt+T` | Emergency kill — `os._exit(0)`, wipes all RAM keys |

---

## 10. TITAN RAM Globals (never on disk post-boot)

```python
_RUNTIME_API_KEYS  = []   # list of provider API keys (from stdin JSON)
_RUNTIME_LANGUAGE  = ""   # e.g. "Java"
_RUNTIME_MODEL     = ""   # e.g. "gemini" or "meta/llama-3.1-70b-instruct"
```

---

## 11. Security Architecture

| Layer | What | Where |
|-------|------|-------|
| Keys in transit | HTTPS POST | `/api/validate` |
| Keys at rest | Fernet-encrypted `session.json` | `%APPDATA%\LockApp\` |
| Keys in process | `stdin` pipe (closes in ~2s) | RAM only |
| Keys in TITAN | `_RUNTIME_*` globals | RAM only |
| On exit (`Alt+T`) | `os._exit(0)` | RAM cleared instantly |
| **Never** exposed via | CLI args, env vars, temp INI files, Task Manager | — |

---

## 12. Prompts (gemini.ini)

### Coding prompt
```
You are a {language} competitive programming expert.
OUTPUT RULES (STRICT):
1. Output ONLY the raw compilable {language} source code.
2. ZERO inline comments. ZERO explanatory comments.
3. NO markdown fences. Raw code only.
4. NO prose, NO explanation, NO preamble.
5. Preserve template/header/footer exactly.
6. USE whitelisted code. AVOID blacklisted constructs.
7. Handle ALL edge cases.
8. Use efficient algorithms (O(n log n) or better). Match exact I/O format.
```

### MCQ prompt
```
You are an MCQ answer engine. Output ONLY the answer number.
Do NOT explain. Do NOT reason.
Your entire response: Answer: <number>  (1, 2, 3, or 4)
```

---

## 13. Launcher Watchdog Behavior

- Monitors `ctfmon.exe` via `proc.wait()`
- `returncode == 0` → intentional exit (Alt+T) → **no restart**
- Any non-zero exit → restart with same in-memory credentials
- **Rapid crash protection:** 3 crashes within 10s → 30s backoff before next restart
- EXE is copied to a `tempfile.mkdtemp` dir on each spawn; cleaned up on launcher exit

---

## 14. Admin Panel Actions (actions.ts)

| Function | Operation |
|----------|-----------|
| `verifyAdminPassword(pw)` | SHA-256 compare → Supabase → env var fallback |
| `fetchAllLicenses()` | SELECT all, ordered by `created_at DESC` |
| `createLicense(...)` | INSERT with `reg_key`, `label`, `gemini_key`, `language`, `model`, `expires_at` |
| `revokeLicense(id)` | UPDATE `is_active = false` |
| `resetLicense(id)` | UPDATE `machine_id = null`, `activated_at = null` |
| `deleteLicense(id)` | DELETE row |
| `updateLicense(id, ...)` | UPDATE `label`, `gemini_key`, `model`, extend `expires_at` |
| `updateLanguage(id, lang)` | UPDATE `language` only |

---

## 15. `/api/validate` Response Shape

```json
{
  "valid": true,
  "message": "Activated" | "Welcome back",
  "days_remaining": 6,
  "hours_remaining": 23,
  "reg_key": "12345678",
  "expires_at": "2026-05-19T...",
  "gemini_key": "AIza... or nvapi-...",
  "language": "Java",
  "model": "gemini"
}
```

---

## 16. Build Commands

### TITAN engine → ctfmon.exe
```powershell
# From C:\Users\rithesh\Downloads\lockcode\
pyinstaller TITAN.spec
# Output: dist\ctfmon.exe
```

### Launcher → LockApp.exe
```powershell
# From C:\Users\rithesh\Desktop\lock\launcher\
pyinstaller LockApp.spec
# Output: dist\LockApp.exe
```

### Dev: run TITAN directly (test)
```powershell
# run_titan.ps1
$payload = '{"gemini_key":"AIza...","language":"Java","model":"gemini"}'
$payload | python final.py
```

### Web: local dev server
```powershell
# From C:\Users\rithesh\Desktop\lock\web\
npm run dev
```

### Web: deploy to Vercel
```powershell
vercel --prod --yes
```

---

## 17. Known Issues & Notes

| Issue | Status | Note |
|-------|--------|------|
| `admin_config` table may not exist | Pending | Run SQL in §3 above |
| `migrate\route.ts` | Delete after confirming migration | One-time endpoint |
| `pyarmor.bug.log` present | Ignored | Obfuscation experiment abandoned |
| `dist_obf\` dirs | Ignored | PyArmor output, not in use |
| `test_sendinput.py` | Dev only | Windows `SendInput` simulation tests |
| `gemini.ini` keys | Dev fallback only | Production keys come from Supabase via stdin |

---

## 18. Key API Keys on File (Dev/Test)

> ⚠ These are dev/test keys captured from source. Rotate if compromised.

### Gemini (from gemini.ini)
```
AIzaSyBDslRu3Dy8f3fSDxhNmX-5dKD2gEh8gAM
AIzaSyDM3JDRXKZTFSooIa4j1x1buHbryTXKh7M
AIzaSyAE3l0WntXIp-oJk-uXAAu-AJvCManx4Z0
AIzaSyBzytgxTv8ISu10pMm2FTMK4DFHr_wwXwU
AIzaSyC2bts8ijWgvGyXMqLn_9S8v5MaE0Sd1i8
AIzaSyDg0kjqTqdeP7Mq3IfOcrePOdgXDh1djZE  ← used in run_titan.ps1
```

### NVIDIA NIM (from models.txt)
```
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  (minimax)
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  (llama)
```

---

## 19. Conversation History Summary

| Conv | Topic | Outcome |
|------|-------|---------|
| `5dcbec38` | Merging Coding + MCQ assistants | Unified TITAN app with HUD, stealth mode, Alt+T kill |
| `22feba80` | Remove coding from OAS, MCQ only | OAS cleaned to MCQ-only |
| `63929692` | Tesseract OCR + MCQ answer parsing | OCR pipeline + Gemini final-answer extractor |
| `6ec50d55` | Input error / continuation | Refinements to OCR + licensing |
| `dc371bfd` | PyInstaller build + Vercel env vars | EXE packaged; Vercel env configured; licensing flow complete |
| `b680e6c6` | Windows SendInput optimization | `test_sendinput.py` refined for reliable input simulation |

---

## 20. Quick Reference Checklist

- [ ] SQL for `admin_config` run in Supabase? (see §3)
- [ ] `migrate\route.ts` deleted after migration?
- [ ] Vercel env vars set? (`ADMIN_PASSWORD`, `ADMIN_PASSWORD_HASH`, `APP_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] `ctfmon.exe` bundled inside `LockApp.spec`?
- [ ] `gemini.ini` NOT shipping production keys?
- [ ] `session.json` TTL = 2 hours confirmed in `launcher.py`?
