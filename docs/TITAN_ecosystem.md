# TITAN Ecosystem — Full Visual Workflow
> Version 2.0 | Multi-Model AI | Hardware-Locked Licensing

---

## 1. 🗺️ 30,000-Foot View — The Full Ecosystem

```mermaid
graph TB
    subgraph CLOUD ["☁️  CLOUD LAYER"]
        SB[(Supabase\nPostgreSQL DB)]
        VR[Vercel\nNext.js App]
        GEMINI[Google Gemini\nAPI]
        NIM[NVIDIA NIM\nAPI]
    end

    subgraph ADMIN ["🖥️  ADMIN — Browser"]
        AP[Admin Panel\nweb-phi-taupe-97.vercel.app/admin]
    end

    subgraph CLIENT ["💻  CLIENT — Windows Machine"]
        LA[Launcher GUI\nlauncher.py]
        TI[TITAN Engine\nctfmon.exe / final.py]
        HUD[HUD Overlay\nTransparent Window]
    end

    subgraph USER ["👤  USER"]
        ADM[Admin / You]
        STU[Student / End User]
    end

    ADM -->|Login + manage licenses| AP
    AP -->|CRUD operations| VR
    VR -->|REST API| SB

    STU -->|Enters reg key| LA
    LA -->|POST /api/validate| VR
    VR -->|Lookup license| SB
    SB -->|Returns gemini_key + language + model| VR
    VR -->|JSON response| LA
    LA -->|stdin pipe credentials| TI
    TI -->|F5 / Alt+Y trigger| HUD

    TI -->|if model=gemini| GEMINI
    TI -->|if model=llama-3.3-70b| NIM
    GEMINI -->|AI response| TI
    NIM -->|AI response| TI
    TI -->|Render answer| HUD
    STU -->|Reads answer| HUD
```

---

## 2. 🔐 License Lifecycle — Admin Creates → User Activates

```mermaid
sequenceDiagram
    actor Admin
    participant Panel as Admin Panel<br/>(Vercel)
    participant DB as Supabase DB
    actor User
    participant Launcher
    participant Validate as /api/validate<br/>(Vercel)

    Note over Admin,DB: ── PHASE 1: Admin Creates License ──
    Admin->>Panel: Login with password (Lucky@1222)
    Panel->>Panel: SHA-256 hash compare
    Panel-->>Admin: Authenticated ✅

    Admin->>Panel: Fill form: reg_key, label,<br/>gemini_key, model, language, duration
    Panel->>DB: INSERT INTO licenses<br/>{reg_key, gemini_key, model, language,<br/>expires_at, is_active=true}
    DB-->>Panel: License created ✅
    Panel-->>Admin: Show reg_key to copy

    Note over User,Validate: ── PHASE 2: User First Activation ──
    User->>Launcher: Enter 8-digit reg_key
    Launcher->>Launcher: Collect machine_id<br/>(MAC address hash)
    Launcher->>Validate: POST {reg_key, machine_id}<br/>Header: x-app-secret
    Validate->>DB: SELECT * WHERE reg_key = ?
    DB-->>Validate: License row

    alt machine_id is NULL (first time)
        Validate->>DB: UPDATE SET machine_id = ?<br/>activated_at = now()
        Validate-->>Launcher: {valid:true, gemini_key,<br/>language, model, expires_at}
    else machine_id matches
        Validate-->>Launcher: {valid:true, welcome back}
    else machine_id mismatch
        Validate-->>Launcher: {valid:false, wrong machine}
    else expired or revoked
        Validate-->>Launcher: {valid:false, reason}
    end

    Launcher->>Launcher: Encrypt + cache session.json<br/>(Fernet key)
    Launcher->>Launcher: Spawn ctfmon.exe subprocess
    Launcher-->>Launcher: stdin pipe →<br/>{"gemini_key":"...","language":"Java","model":"gemini"}
```

---

## 3. 🤖 Model Routing — How TITAN Picks the AI

```mermaid
flowchart TD
    START([TITAN boots\nctfmon.exe]) --> STDIN

    STDIN{stdin is a pipe?} -->|YES| PARSE
    STDIN -->|NO - dev mode| ENVVAR[Read env vars\nGEMINI_API_KEY\nGEMINI_MODEL]

    PARSE[Parse JSON from stdin\ngemini_key, language, model] --> STORE

    ENVVAR --> STORE
    STORE[Store in RAM globals\n_RUNTIME_API_KEYS\n_RUNTIME_LANGUAGE\n_RUNTIME_MODEL]

    STORE --> TRIGGER

    TRIGGER{User trigger} -->|F5 pressed| MCQ
    TRIGGER -->|Alt+Y pressed| CODE

    MCQ[MCQ Pipeline\nScreenshot → OCR → Prompt] --> ROUTE
    CODE[Code Pipeline\nScreenshot → Parse → Prompt] --> ROUTE

    ROUTE{_RUNTIME_MODEL?}

    ROUTE -->|gemini| GEMINI_PATH
    ROUTE -->|meta/llama-3.3-70b-instruct| NIM_PATH

    subgraph GEMINI_PATH ["🔵 Gemini Route"]
        G1[POST generativelanguage.googleapis.com\n?key=AIza...]
        G2[Format: contents → parts → text\ntemperature=0.0]
        G3[Parse: candidates → content → parts → text]
        G1 --> G2 --> G3
    end

    subgraph NIM_PATH ["🟢 NVIDIA NIM Route"]
        N1[POST integrate.api.nvidia.com/v1/chat/completions\nAuthorization: Bearer nvapi-...]
        N2[Format: messages → role/content\ntemp=0.0, top_p=1.0]
        N3[Parse: choices → message → content]
        N1 --> N2 --> N3
    end

    G3 --> DISPLAY
    N3 --> DISPLAY

    DISPLAY[Render on HUD Overlay\nTransparent window\nWDA_EXCLUDEFROMCAPTURE]
```

---

## 4. 🧠 MCQ Pipeline — Screenshot to Answer

```mermaid
flowchart LR
    A([F5 Pressed]) --> B[Capture screen region\nwin32gui GetForegroundWindow]
    B --> C[Tesseract OCR\nExtract text]
    C --> D{Question detected?}
    D -->|NO| E[Show: No text found]
    D -->|YES| F[Build prompt\nMCQ system + question text]
    F --> G{Model?}

    G -->|gemini| H[Gemini API\n~1-2s]
    G -->|llama-3.3-70b| I[NIM API\ntemp=0 max_tokens=300\n~2.2s]

    H --> J[Parse response\nFind 'Answer: N' on last line]
    I --> J

    J --> K{Answer found?}
    K -->|YES| L[Display on HUD\nColoured highlight\nOption 1/2/3/4]
    K -->|NO| M[Show full reasoning\nFallback display]

    style H fill:#4285f4,color:#fff
    style I fill:#76b900,color:#fff
```

---

## 5. 💻 Coding Pipeline — Problem to Code

```mermaid
flowchart LR
    A([Alt+Y Pressed]) --> B[Capture active window\nFull screenshot]
    B --> C[Win32 / OCR\nExtract problem text]
    C --> D[Load language from\n_RUNTIME_LANGUAGE\nJava / Python / C++ etc]
    D --> E[Build system prompt\nOUTPUT RULES: raw code only\nno comments no fences]
    E --> F{Model?}

    F -->|gemini| G[Gemini API\n~2-4s\nmax_tokens=8192]
    F -->|llama-3.3-70b| H[NIM API\ntemp=0.0 top_p=1.0\nmax_tokens=2000\n~3.2s]

    G --> I[Strip markdown fences\nClean raw code]
    H --> I

    I --> J[Syntax check\nbalanced braces]
    J --> K[Display on HUD\nCode-formatted\nMonospace font]

    style G fill:#4285f4,color:#fff
    style H fill:#76b900,color:#fff
```

---

## 6. 🛡️ Security Architecture

```mermaid
flowchart TD
    subgraph NEVER ["❌  NEVER happens"]
        N1[Key written to disk]
        N2[Key in CLI args]
        N3[Key in env vars at runtime]
        N4[Key visible in Process Explorer]
    end

    subgraph ALWAYS ["✅  Always happens"]
        A1[Key delivered via stdin pipe\ninvisible to Task Manager]
        A2[Key stored only in RAM\n_RUNTIME_API_KEYS list]
        A3[Alt+T emergency wipe\nctypes zero-fill then os._exit]
        A4[HUD excluded from capture\nWDA_EXCLUDEFROMCAPTURE]
        A5[machine_id bound on first use\nMAC address SHA hash]
        A6[Admin auth: SHA-256 hash\nStored in Supabase admin_config]
        A7[All traffic over HTTPS TLS 1.3]
    end

    subgraph LAUNCHER ["Launcher Security"]
        L1[session.json Fernet encrypted]
        L2[Watchdog restarts TITAN on crash\nRe-pipes keys automatically]
        L3[Subprocess spawn — separate RAM space\nLauncher dying does NOT wipe TITAN keys]
    end

    A1 --> A2 --> A3
    L1 --> L2 --> L3
```

---

## 7. 🖥️ Admin Panel — Page & Action Map

```mermaid
flowchart TD
    LOGIN[Login Screen\nPassword → SHA-256 compare] -->|Authenticated| DASH

    DASH[Dashboard Layout\nSidebar + Top Nav + Mobile Bottom Nav]

    DASH --> OV[📊 Overview\nLicensing Ledger Table\n9-column with actions]
    DASH --> KV[🔑 Key Vault\nCard grid view\nSearch + filter]
    DASH --> AL[📋 Audit Logs\nEvent timeline\nCreated / Locked / Revoked]
    DASH --> API[🔌 API Access\nEndpoint reference docs]
    DASH --> SP[❓ Support / FAQ\nAccordion Q&A]
    DASH --> SEC[🛡️ Security\nHardening checklist]
    DASH --> POOL[🗄️ API Key Pool\nBulk key management\nlocalStorage based]

    OV --> ADD[+ Add Key Modal\nreg_key label gemini_key\nmodel language duration]
    OV --> EDIT[Edit Modal\nUpdate key / model / extend trial]
    OV --> REVOKE[Revoke → is_active=false]
    OV --> RESET[Reset Machine → machine_id=null]
    OV --> DELETE[Delete → hard delete]

    ADD --> SB[(Supabase)]
    EDIT --> SB
    REVOKE --> SB
    RESET --> SB
    DELETE --> SB
```

---

## 8. 📱 Responsive Layout — Desktop vs Mobile

```mermaid
flowchart LR
    subgraph DESKTOP ["🖥️  lg+ (≥1024px)"]
        DS[Fixed sidebar\nw-64 left panel\nFull nav links\nLogout button]
        DH[Top header\nLogo + nav tabs\nNotifications + Settings\nAdd Key button with label]
        DC[Main content area\nml-64 offset\nFull table view]
    end

    subgraph MOBILE ["📱  < lg (phone / tablet)"]
        MH[Top header\nHamburger ☰ + Logo\nAdd Key icon only]
        MD[Slide-in drawer\nFull nav on tap\nBackdrop closes it]
        MB[Bottom tab bar\nOverview Key Vault Audit\nAPI Security\n5-tab thumb navigation]
        MM[Modals as bottom sheets\nSlides up from bottom\nScrollable max-h-92vh]
    end

    DESKTOP -.->|same design tokens\nsame colors animations| MOBILE
```

---

## 9. 🔄 End-to-End Data Flow Summary

```mermaid
graph LR
    ADM([Admin]) -->|1 Create license\nmodel=gemini OR llama| DB[(Supabase\nlicenses table)]

    DB -->|2 Validate API returns\ngemini_key + language + model| LA[Launcher\nlauncher.py]

    LA -->|3 Encrypt cache\nsession.json Fernet| CACHE[Encrypted\nSession Cache]
    CACHE -->|4 On next launch\nrestore session| LA

    LA -->|5 stdin pipe JSON\ngemini_key language model| TI[TITAN\nctfmon.exe]

    TI -->|6a model=gemini| GEM[Google Gemini API\nAIza... key]
    TI -->|6b model=llama-3.3-70b| NIM[NVIDIA NIM\nnvapi-... key]

    GEM -->|7 AI answer| HUD[HUD Overlay]
    NIM -->|7 AI answer| HUD

    HUD -->|8 User reads| USR([End User])
```

---

## 10. ⚡ Performance Benchmarks

```mermaid
gantt
    title AI Response Time Comparison (tested 2026-05-12)
    dateFormat X
    axisFormat %ss

    section Gemini
    MCQ response        :0, 2
    Code response       :0, 4

    section Llama 3.3 70B (NIM)
    MCQ response        :0, 3
    Code response       :0, 4

    section Failed Models
    Minimax m2.7        :crit, 0, 120
    GLM 4.7             :crit, 0, 120
    DeepSeek V4 Flash   :crit, 0, 128
```

| Model | MCQ | Code | Key Format | Status |
|-------|-----|------|-----------|--------|
| **Gemini 2.5 Flash** | ~1-2s | ~2-4s | `AIza...` | ✅ Production |
| **Llama 3.3 70B (NIM)** | ~2.2s | ~3.2s | `nvapi-...` | ✅ Production |
| Minimax m2.7 | 120s timeout | 120s | nvapi- | ❌ Removed |
| GLM 4.7 | 120s timeout | 120s | nvapi- | ❌ Removed |
| DeepSeek V4 Flash | 120s timeout | ~128s | nvapi- | ❌ Removed |

---

*Generated automatically from session audit · TITAN v2.0 · 2026-05-12*
