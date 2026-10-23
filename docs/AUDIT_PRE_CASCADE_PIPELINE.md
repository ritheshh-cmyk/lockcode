# System State & Codebase Audit Before Multi-Tier Pipeline Integration

**Timestamp:** 2026-09-21 13:25 IST  
**Audit Purpose:** Comprehensive snapshot of the system state, architecture differences, file integrity, binary hashes, and dependencies across both the headless and headed codebases and the Vercel web backend before implementing the cascading multi-tier failover pipeline.

---

## 1. Binary State & Integrity Manifest

| Binary Target | Workspace Path | File Size | SHA-256 Hash |
| :--- | :--- | :--- | :--- |
| **Headless Engine** | `c:\Users\rithesh\Downloads\lockcode\lock\app\ctfmon.exe` | 110,401,697 B | `42E98B61E875653F10E84CA7A1E2E56C926707D7CFF2EA3642420F84F03D5CD3` |
| **Headless Launcher** | `c:\Users\rithesh\Downloads\lockcode\lock\titan.exe` | 158,459,445 B | `FFFF2BC35BDAE9CEA8676A055619E485D0FBA3D577D23FCC8A67A4A8B0456120` |
| **Headed Engine** | `C:\Users\rithesh\Desktop\lockcodeheaded\lockcode\lock\app\ctfmon.exe` | 110,395,824 B | `6F8D65A8EB6A7E9C45836EFF04230D286F117B9E04ADBDE4B73A4D294DC850DC` |
| **Headed Launcher** | `C:\Users\rithesh\Desktop\lockcodeheaded\lockcode\lock\titan.exe` | 158,451,534 B | `5F14218C9F587851C1EF4E5A69983C24F68A910C9AB55A48E364599BC62DC76E` |

---

## 2. Architectural Comparison: Headless vs. Headed

| Dimension | Headless (`Downloads\lockcode`) | Headed (`Desktop\lockcodeheaded`) |
| :--- | :--- | :--- |
| **GUI Framework** | Zero GUI imports (No PyQt5). Pure Win32 background loop. | PyQt5 (`QtWidgets`, `QtCore`, `QtGui`). Visible translucent HUD. |
| **Window State** | `self.hwnd = 0`, `self.visible = False`, `self.is_hidden = True`. | `UnifiedChatbotUI(QWidget)`. Transparent frameless window with title "TITAN". |
| **Thread Emulation** | `MockTextEdit` emulating QTextEdit; `Win32SignalMock` emulating pyqtSignal. | Native PyQt5 `pyqtSignal` & `QThread` workers. |
| **Screen Text Extraction** | Pure MSAA: `text_extractor.py` (`oleacc.dll` + `AccessibleChildren`). | Pure MSAA: Identical `text_extractor.py` module. |
| **Hotkeys** | `pynput.keyboard` & raw Win32 `GetAsyncKeyState` (`F5` Code, `F4` MCQ, `F6` Line, `F9` Paste). | Identical hotkey listener thread (`F5`, `F4`, `F6`, `F9`). |
| **Credentials Injection** | Stdin pipe from launcher (`titan.exe`), stored only in RAM. | Identical stdin pipe credential ingestion. |
| **Current AI Request Engine** | Direct `requests.post` to `generativelanguage.googleapis.com` (Lines 600-645). Fallback to `integrate.api.nvidia.com` if model != "gemini". | Identical direct `requests.post` to `generativelanguage.googleapis.com` (Lines 580-630). |

---

## 3. Backend State (`lock/web` Next.js on Vercel)

- **Framework**: Next.js 16.2.4 (App Router), React 19.2.4, TypeScript 5, Tailwind CSS 4.
- **Production Host**: `https://web-phi-taupe-97.vercel.app`
- **Existing Endpoints**:
  - `/api/validate`: License and device authentication endpoint used by launcher.
  - `/api/admin/generate-key`: Key generation for licensing.
  - `/api/admin/keys`: Key administration.
- **Security Secret**: Header `x-app-secret` checked against `APP_SECRET` (`lockapp-secret-2026`).
- **Database**: Supabase PostgreSQL (`licenses` table via `@supabase/supabase-js`).

---

## 4. Current Vulnerabilities & Pain Points Discovered

1. **Layer-7 Wi-Fi Blocking**: Direct connections to `generativelanguage.googleapis.com` fail with HTTP 403 `PERMISSION_DENIED` on institutional / campus Wi-Fi networks due to domain category filters.
2. **Single-Point-of-Failure**: If direct Gemini fails, the entire application has zero alternative path in standard configuration.
3. **Headless User Feedback**: In headless mode (`Downloads\lockcode`), without any visual window, users have no feedback if a request fails or is waiting, leading them to believe the application is frozen.
