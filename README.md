# 🔒 LockApp — Hardware-Locked Licensing System

A complete software licensing system that locks your Python application to specific hardware. Each user gets a unique 8-digit license key with an optional API key that auto-injects into your app's config.

---

## 📁 Project Structure

```
lock/
│
├── app/                            ← Protected Application
│   ├── ctfmon.exe                  # The real app (launched after license validation)
│   └── mcq.ini                    # API config — [groq] api_key gets auto-injected per user
│
├── launcher/                       ← Python Launcher (Desktop Client)
│   ├── launcher.py                # Main entry — validates → injects API key → launches app
│   ├── launcher_gui.py            # Dark-themed registration window (8-digit key input)
│   ├── api_validator.py           # HTTP client — validates key + hardware fingerprint
│   ├── machine_id.py              # Hardware fingerprinting (CPU + MAC → SHA-256)
│   └── LockApp.spec               # PyInstaller build spec
│
├── web/                            ← Admin Dashboard + API (Next.js)
│   ├── app/
│   │   ├── admin/
│   │   │   ├── page.tsx           # Dashboard — license CRUD + API key management
│   │   │   ├── actions.ts         # Server actions (create, revoke, reset, rotate)
│   │   │   └── layout.tsx         # Admin layout
│   │   ├── api/
│   │   │   ├── validate/route.ts  # POST /api/validate — license check endpoint
│   │   │   └── admin/generate-key/route.ts
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Landing page
│   │   └── globals.css            # Styles
│   ├── lib/supabase.ts            # Supabase client config
│   ├── supabase/schema.sql        # Database schema
│   ├── .env.local                 # 🔐 API keys (do not share)
│   ├── .env.local.template        # Template (safe to share)
│   └── vercel.json                # Deployment config
│
├── scripts/                        ← Setup & Dev Tools
│   ├── setup_db.py                # Create the licenses table
│   ├── add_api_key_column.py      # Migration: add api_key column
│   └── reset_key.py               # Clear machine lock for testing
│
├── _legacy/                        ← Old Files (safe to delete)
│   ├── main.py                    # Original PyQt5 app
│   ├── GUI_Test.spec              # Old PyInstaller spec
│   ├── build/                     # Old build cache
│   └── dist/GUI_Test.exe          # Old compiled exe
│
├── .env                           # Database connection (dev only)
└── README.md                      # This file
```

---

## 🔄 How It Works

```
  ADMIN DASHBOARD                    SUPABASE DB                    PYTHON LAUNCHER
 ┌──────────────┐               ┌──────────────────┐            ┌──────────────────┐
 │ Create Key:  │               │   licenses table │            │ 1. Check cache   │
 │  8-digit ID  │──── write ───→│  reg_key         │            │ 2. Show GUI      │
 │  API key     │               │  api_key         │←── read ───│ 3. Validate key  │
 │  Duration    │               │  machine_id      │            │ 4. Write mcq.ini │
 │  🔑 Rotate   │               │  expires_at      │            │ 5. Launch app    │
 └──────────────┘               └──────────────────┘            └──────────────────┘
```

---

## ⚡ Quick Start

### 1. Database
```bash
pip install psycopg2 python-dotenv
python scripts/setup_db.py
python scripts/add_api_key_column.py
```

### 2. Admin Dashboard
```bash
cd web
npm install
npm run dev                    # → http://localhost:3000/admin
```

### 3. Test Launcher
```bash
cd launcher
pip install cryptography requests
python launcher.py
```

### 4. Build Final EXE
```bash
cd launcher
pyinstaller LockApp.spec      # → dist/LockApp.exe
```

---

## 🗄️ Database Schema

| Column         | Type        | Description                              |
|----------------|-------------|------------------------------------------|
| `id`           | UUID        | Auto-generated primary key               |
| `reg_key`      | TEXT        | 8-digit license key (e.g. `12402879`)    |
| `machine_id`   | TEXT        | SHA-256 hardware fingerprint             |
| `api_key`      | TEXT        | Per-user API key (injected into mcq.ini) |
| `created_at`   | TIMESTAMPTZ | When the license was created             |
| `activated_at` | TIMESTAMPTZ | When first activated                     |
| `expires_at`   | TIMESTAMPTZ | Expiration date/time                     |
| `is_active`    | BOOLEAN     | False = revoked                          |
| `label`        | TEXT        | Customer name / note                     |

---

## 🔐 Security

| Layer              | Mechanism                                     |
|--------------------|-----------------------------------------------|
| **Hardware Lock**  | CPU UUID + MAC → SHA-256 fingerprint           |
| **API Auth**       | `X-App-Secret` header on validate requests     |
| **Admin Auth**     | Password-protected dashboard                   |
| **Session Cache**  | Fernet-encrypted at `%APPDATA%/LockApp/`       |
| **API Key Inject** | Per-user key written into mcq.ini at launch    |

---

## 🖥️ Admin Features

| Action           | Description                                       |
|------------------|---------------------------------------------------|
| ➕ **Add Key**    | 8-digit key + API key + duration (days + hours)   |
| 🔑 **Rotate**    | Change API key anytime (next launch picks it up)  |
| 🔴 **Revoke**    | Instantly disable a license                       |
| 🔄 **Reset**     | Clear machine lock (re-activate on new device)    |
| 🗑️ **Delete**    | Permanently remove license                        |

---

## 🚀 Deployment Checklist

- [ ] Deploy `web/` to Vercel with env vars
- [ ] Update `API_URL` in `launcher/api_validator.py` to Vercel URL
- [ ] Build `LockApp.exe` with PyInstaller
- [ ] Rotate Supabase database password
- [ ] End-to-end test: dashboard → launcher → ctfmon.exe + correct API key
