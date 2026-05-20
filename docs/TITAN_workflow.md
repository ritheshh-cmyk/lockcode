# TITAN System — Full Workflow

**Last updated:** 2026-05-12  
**Version:** 2.0 — Multi-Model AI Support

---

## 1. System Overview

```mermaid
graph TD
    ADMIN["🖥️ Admin Dashboard\n(Vercel / Next.js)"]
    DB["🗄️ Supabase DB\n(licenses + admin_config)"]
    LAUNCHER["🚀 LockApp.exe\n(launcher.py)"]
    TITAN["👻 ctfmon.exe\n(TITAN / final.py)"]
    GEMINI["🤖 Gemini API\n(Google AI)"]
    NIM["⚡ NVIDIA NIM API\n(Llama / Minimax)"]
    USER["👤 User Machine"]

    ADMIN -->|"CREATE / REVOKE\nset: gemini_key + language + model"| DB
    USER -->|"runs"| LAUNCHER
    LAUNCHER -->|"POST reg_key + machine_id"| API["🔒 /api/validate\n(Edge Function)"]
    API -->|"lookup + lock machine"| DB
    DB -->|"gemini_key + language + model + expires_at"| API
    API -->|"JSON response"| LAUNCHER
    LAUNCHER -->|"stdin pipe\n(gemini_key + language + model)"| TITAN
    TITAN -->|"model=gemini"| GEMINI
    TITAN -->|"model=llama or minimax"| NIM
    GEMINI -->|"code / MCQ answer"| TITAN
    NIM -->|"code / MCQ answer"| TITAN
```

---

## 2. First-Time Activation Flow

```mermaid
sequenceDiagram
    actor Admin
    actor User
    participant DB as Supabase DB
    participant API as /api/validate
    participant Launcher as LockApp.exe
    participant TITAN as ctfmon.exe
    participant AI as Gemini / NVIDIA NIM

    Note over Admin,DB: STEP 0 — Admin creates license
    Admin->>DB: INSERT reg_key=12345678, gemini_key=AIza... or nvapi-...,\nlanguage=Java, model=gemini|llama|minimax, expires_at=+7d

    Note over User,Launcher: STEP 1 — User runs LockApp.exe
    User->>Launcher: double-click LockApp.exe
    Launcher->>Launcher: check %APPDATA%\LockApp\session.json
    Launcher->>Launcher: no valid cache → show GUI

    Note over User,API: STEP 2 — User enters key
    User->>Launcher: types 8-digit key e.g. 12345678
    Launcher->>Launcher: get_machine_id() → SHA256(CPU_UUID:MAC)
    Launcher->>API: POST {reg_key, machine_id} + X-App-Secret header

    Note over API,DB: STEP 3 — Server validates
    API->>DB: SELECT * WHERE reg_key = '12345678'
    DB-->>API: license row (machine_id = NULL → first activation)
    API->>DB: UPDATE SET machine_id=<hash>, activated_at=now()
    DB-->>API: ok
    API-->>Launcher: {valid:true, gemini_key, language, model, expires_at}

    Note over Launcher,TITAN: STEP 4 — Keys piped to TITAN
    Launcher->>Launcher: encrypt + write session.json cache (3h TTL)\nIncludes: gemini_key + language + model
    Launcher->>TITAN: spawn ctfmon.exe with stdin=PIPE
    Launcher->>TITAN: write JSON {gemini_key, language, model} to stdin
    Launcher->>Launcher: close pipe, sleep 2s, os._exit(0)
    TITAN->>TITAN: read stdin on boot → store in RAM globals\n(_RUNTIME_API_KEYS, _RUNTIME_LANGUAGE, _RUNTIME_MODEL)
    TITAN->>TITAN: launch PyQt5 GUI (invisible HUD)

    Note over User,AI: STEP 5 — User uses TITAN
    User->>TITAN: press F5 (code) or Alt+Y (MCQ)
    TITAN->>TITAN: extract foreground window text (uiautomation / Tesseract OCR)
    alt model = gemini
        TITAN->>AI: POST to generativelanguage.googleapis.com\n(API key in query param)
    else model = llama or minimax
        TITAN->>AI: POST to integrate.api.nvidia.com/v1/chat/completions\n(Bearer token auth)
    end
    AI-->>TITAN: code answer / MCQ digit
    TITAN->>User: display in HUD overlay
```

---

## 3. Returning User Flow (Cache Hit)

```mermaid
flowchart TD
    A([User runs LockApp.exe]) --> B{session.json\nexists?}
    B -- No --> C[Show Registration GUI]
    B -- Yes --> D{Decrypt with\nFernet key}
    D -- Corrupt --> C
    D -- OK --> E{machine_id\nmatches?}
    E -- No --> C
    E -- Yes --> F{license\nexpired?}
    F -- Yes --> C
    F -- No --> G{cache older\nthan 3 hours?}
    G -- Yes --> C
    G -- No --> H{gemini_key\npresent?}
    H -- Empty --> C
    H -- Present --> I[Skip GUI entirely]
    I --> J["Pipe cached credentials to ctfmon.exe\n{gemini_key + language + model}"]
    J --> K([TITAN launches instantly])
    C --> L[User enters 8-digit key]
    L --> M[POST to /api/validate]
    M --> N{Valid?}
    N -- No --> O[Show error message]
    O --> L
    N -- Yes --> P[Write new session.json\n(includes model field)]
    P --> J
```

---

## 4. Admin Panel Operations

```mermaid
flowchart LR
    subgraph AdminPanel["🖥️ Admin Panel — /admin"]
        LOGIN["Password Login\n(admin_config table or env var)"]
        TABLE["License Table\n• reg_key\n• Provider Key status\n• Model badge\n• Language dropdown\n• Status badge\n• Time remaining"]
        ADD["➕ Add Key Modal\n• 8-digit reg_key\n• Customer label\n• Provider API key (AIza... or nvapi-...)\n• Model selector\n• Language\n• Duration (days+hours)"]
        EDIT["✏️ Edit License Modal\n• New provider key input\n• Model selector\n• Add duration (extend trial)\n• Saves to DB instantly"]
        ACTIONS["Row Actions\n✏️ Edit license\n⛔ Revoke\n🔄 Reset machine\n🗑 Delete"]
    end

    LOGIN --> TABLE
    TABLE --> ADD
    TABLE --> EDIT
    TABLE --> ACTIONS
    ADD -->|"supabaseAdmin.insert()\nwith model field"| DB[("Supabase DB\nlicenses + admin_config")]
    EDIT -->|"supabaseAdmin.update()\ngemini_key + model"| DB
    ACTIONS -->|"update / delete"| DB
```

---

## 5. AI Provider Routing (NEW in v2.0)

```mermaid
flowchart TD
    STDIN["stdin JSON\n{gemini_key, language, model}"]
    GLOBAL["_RUNTIME_MODEL global\n(set once on boot)"]
    CHECK{model value?}

    GEMINI_ROUTE["Google Generative Language API\nhttps://generativelanguage.googleapis.com\nAuth: ?key=API_KEY (query param)\nFormat: Gemini candidates[]"]
    NIM_ROUTE["NVIDIA NIM API\nhttps://integrate.api.nvidia.com/v1/chat/completions\nAuth: Bearer nvapi-...\nFormat: OpenAI choices[0].message.content"]

    MODELS_GEMINI["gemini-2.5-flash\ngemini-2.0-flash\ngemini-1.5-flash (fallback)"]
    MODELS_NIM["meta/llama-3.1-70b-instruct\nminimax/minimax-m2.7"]

    STDIN --> GLOBAL
    GLOBAL --> CHECK
    CHECK -->|"gemini"| GEMINI_ROUTE
    CHECK -->|"llama or minimax"| NIM_ROUTE
    GEMINI_ROUTE --> MODELS_GEMINI
    NIM_ROUTE --> MODELS_NIM
```

**Model identifiers stored in DB:**

| Admin Selection | `model` value in DB | Endpoint |
|---|---|---|
| Gemini (gemini-2.5-flash) | `gemini` | Google Generative Language API |
| Llama 3.1 70B (NIM) | `meta/llama-3.1-70b-instruct` | NVIDIA NIM |
| Minimax m2.7 (NIM) | `minimax/minimax-m2.7` | NVIDIA NIM |

---

## 6. Security Architecture

```mermaid
graph TD
    subgraph DISK["💾 Disk (what's stored)"]
        SESSION["session.json\n(Fernet-encrypted)\n• reg_key\n• machine_id hash\n• expires_at\n• gemini_key ✓\n• language ✓\n• model ✓\n• cached_at"]
        GEMINIINI["gemini.ini\n(SSL verify only)\nNo keys here ✓"]
    end

    subgraph RAM["🧠 RAM Only (never on disk after boot)"]
        GLOBALS["TITAN globals\n_RUNTIME_API_KEYS[]\n_RUNTIME_LANGUAGE\n_RUNTIME_MODEL\n(cleared on exit)"]
    end

    subgraph NETWORK["🌐 Network"]
        PIPE["stdin pipe\n{gemini_key, language, model}\n(closes in ~2s)"]
        APIRESPONSE["HTTPS response\n/api/validate\n(TLS encrypted)"]
    end

    subgraph NEVER["🚫 Never Exposed"]
        CLI["CLI arguments ✗"]
        ENVVAR["Environment variables ✗"]
        TMPFILE["Temp INI files ✗"]
        TASKMAN["Task Manager visible ✗"]
    end

    APIRESPONSE -->|"Launcher reads"| SESSION
    SESSION -->|"Launcher reads on cache hit"| PIPE
    PIPE -->|"TITAN reads on boot"| GLOBALS
    GLOBALS -->|"Used for API calls"| GEMINIINI
```

---

## 7. TITAN Hotkey Triggers

```mermaid
graph TD
    subgraph TRIGGERS["⌨️ Hotkey Triggers"]
        F5["F5\nCapture foreground window\n→ send to Coding AI"]
        ALT_Y["Alt+Y\nCapture MCQ window\n→ send to MCQ AI"]
        F6["F6\nType next line of code\n(autotype one line)"]
        F2["F2\nHide / Show window"]
        F3["F3\nStealth mode toggle\n(DWM cloak)"]
        ALT_T["Alt+T\n⚠ Emergency kill\n(instant exit)"]
    end

    subgraph AI["🤖 AI Processing (routes by _RUNTIME_MODEL)"]
        CODE_THREAD["CodeChatbotThread\n• Gemini or NIM endpoint\n• OpenAI/Gemini format parser\n• Comment stripper\n• 429 retry logic"]
        MCQ_THREAD["McqChatbotThread\n• Gemini or NIM endpoint\n• Answer: N extractor\n• choices[] or candidates[] parser\n• Route cooldowns"]
    end

    F5 --> CodeExtract["Extract window text\n(uiautomation + Tesseract OCR)"]
    CodeExtract --> CODE_THREAD
    CODE_THREAD -->|"response_ready"| HUD["📺 HUD Overlay\n(PyQt5, always-on-top\nscreen-capture proof)"]

    ALT_Y --> McqExtract["Extract MCQ text\n(filtered for question section)"]
    McqExtract --> MCQ_THREAD
    MCQ_THREAD -->|"option_ready → digit 1-4"| CURSOR["🖱️ Move cursor to\ncorrect option"]
    MCQ_THREAD -->|"response_ready"| HUD

    F6 --> TYPER["⌨️ Auto-type next line\n(pyautogui)"]
    F2 --> TOGGLE["Show/Hide window"]
    F3 --> CLOAK["DWM SetWindowDisplayAffinity\n(invisible to OBS/screenshots)"]
    ALT_T --> EXIT["os._exit(0)\nWipes all RAM keys"]
```

---

## 8. Data Flow Summary

| Stage | What moves | Where |
|-------|-----------|-------|
| Admin creates license | `gemini_key`, `language`, `model`, `expires_at` | Supabase DB |
| User activates | `reg_key` + `machine_id` → validated | HTTPS POST |
| Server returns | `gemini_key`, `language`, `model` | HTTPS response |
| Launcher caches | Encrypted session (Fernet) | `%APPDATA%\LockApp\session.json` |
| Launcher→TITAN | `gemini_key` + `language` + `model` JSON | **stdin pipe only** |
| TITAN stores | Keys in `_RUNTIME_API_KEYS[]`, `_RUNTIME_MODEL` | **RAM only** |
| TITAN calls (Gemini) | Google REST API, `?key=` param | HTTPS |
| TITAN calls (NIM) | NVIDIA NIM REST API, `Bearer` token | HTTPS |
| TITAN exit | `os._exit(0)` | RAM cleared |

---

## 9. Database Schema

### `licenses` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `reg_key` | VARCHAR(8) | 8-digit unique key |
| `label` | VARCHAR | Customer name |
| `gemini_key` | TEXT | Provider API key (AIza... or nvapi-...) |
| `language` | VARCHAR | Java / Python / C++ etc. |
| `model` | VARCHAR(50) | `gemini` / `meta/llama-3.1-70b-instruct` / `minimax/minimax-m2.7` |
| `machine_id` | TEXT | SHA256(CPU+MAC) — set on first activation |
| `activated_at` | TIMESTAMPTZ | First activation time |
| `expires_at` | TIMESTAMPTZ | License expiry |
| `is_active` | BOOLEAN | Admin revoke flag |
| `created_at` | TIMESTAMPTZ | Creation time |

### `admin_config` table

| Column | Type | Notes |
|--------|------|-------|
| `key` | TEXT | Primary key |
| `value` | TEXT | e.g. `admin_password_hash` |

---

## 10. Component File Map

```
Desktop\lock\
├── launcher\
│   ├── launcher.py        ← main flow: cache → GUI → pipe (now pipes model)
│   ├── launcher_gui.py    ← Tkinter registration window
│   ├── api_validator.py   ← POST to /api/validate
│   ├── machine_id.py      ← SHA256(CPU+MAC) fingerprint
│   └── LockApp.spec       ← PyInstaller build config
│
├── web\
│   ├── app\
│   │   ├── admin\
│   │   │   ├── page.tsx   ← Admin dashboard UI (model dropdown in Add + Edit modals)
│   │   │   └── actions.ts ← Server actions (createLicense + updateLicense with model)
│   │   ├── api\
│   │   │   └── validate\
│   │   │       └── route.ts ← Returns model in validation response
│   │   └── page.tsx       ← Redirects to /admin
│   ├── lib\supabase.ts    ← Supabase client (anon + admin)
│   └── supabase\
│       ├── migration_add_model.sql    ← ALTER TABLE licenses ADD COLUMN model
│       └── migration_admin_config.sql ← CREATE TABLE admin_config
│
└── scripts\               ← Dev-only DB utilities

Downloads\lockcode\
├── final.py               ← TITAN app (multi-model routing via _RUNTIME_MODEL)
├── docs\
│   ├── TITAN_workflow.md  ← This file (v2.0)
│   └── TITAN_workflow.md.resolved ← Previous version (v1.0, archived)
└── TITAN.spec             ← PyInstaller → dist\ctfmon.exe
```
