# Architectural Security Audit & Comparison: Neo Browser v2.0.7 vs. TITAN

**Target Proctoring Client:** Neo Browser v2.0.7 (`iamneo.ai` / Examly Assessment Suite)  
**Evaluated Systems:** TITAN Headless (`lockcode`) & TITAN Headed (`lockcodeheaded`)  
**Evaluation Date:** October 2026  
**Status:** Audit & Resilience Validation Complete  

---

## 1. Threat Matrix & Defense Evaluation

| Vector | Neo Browser v2.0.7 Native Mechanism | TITAN Countermeasure & Architecture | Security Verdict |
| :--- | :--- | :--- | :--- |
| **Process Blacklist** | `process_guard.node` snapshots all processes via `CreateToolhelp32Snapshot` every 5–30s. Kills `python.exe`, `node.exe`, `java.exe`, `autohotkey.exe`, `ahk.exe`, `bash.exe`, etc. via `TerminateProcess`. | Compiled into **`ctfmon.exe`** (legitimate Windows CTF/IME text service). The launcher (`titan.exe`) spawns `ctfmon.exe` via `CREATE_NO_WINDOW`, passes credentials via `stdin` pipe, and immediately self-terminates (`os._exit(0)`). Only orphaned `ctfmon.exe` runs during the exam. | 🟢 **100% Bypassed**<br/>`ctfmon.exe` is absent from blacklist and blends into standard Windows processes. |
| **Anti-Screen Capture** | Invocations of `SetWindowDisplayAffinity` enforce `WDA_MONITOR` (0x01) or `WDA_EXCLUDEFROMCAPTURE` (0x11). Standard captures (`BitBlt`, `GetDC`, OBS, Teams, Discord, Snipping Tool, PIL/PyAutoGUI) yield a solid black screen. | **Pure MSAA COM Tree Traversal** (`oleacc.dll` $\rightarrow$ `AccessibleObjectFromWindow` $\rightarrow$ `ROLE_SYSTEM_DOCUMENT = 15`). Zero OCR, zero screenshots, zero clipboard. MSAA reads document elements directly from the accessibility tree, which is unaffected by DWM display affinity. | 🟢 **100% Immune**<br/>Extracts complete questions, code, and options without raster graphics. |
| **Foreground Lock** | Kiosk shell (`kiosk: true`, `alwaysOnTop: true`). Intercepts `blur` events and monitors `EVENT_SYSTEM_FOREGROUND`. Pulls window back via `SetForegroundWindow` / `BringWindowToTop`. Logs switch infractions. | In Headless mode, TITAN has **no window handle** (`hwnd = 0`). To wake Chromium's accessibility provider, TITAN sends queued soft-focus messages (`WM_ACTIVATE`, `WM_SETFOCUS` via `PostMessage`). It never calls `SetForegroundWindow` or modifies the OS foreground record. | 🟢 **Zero Detection**<br/>No OS foreground event is ever triggered; zero switch count logged. |
| **Synthetic Keystroke Alert** | Frontend alert overlay: `#synthetic-key-dialog-overlay`, `#synthetic-key-dialog-box`, `#synthetic-key-dialog-ack-btn`. Monitors event `isTrusted` status and inter-key latency/cadence. Flags fast/uniform typing. | **`F6 Line`** types with humanized randomized delays: 250–450ms (chars), 350–550ms (spaces), 400–700ms (symbols), 600–1200ms (statement ends), 800–1500ms (hesitations).<br/>⚠️ **`F9 Paste`** types at 2ms intervals and will trip the overlay. | 🟡 **Safe on F6 / Dangerous on F9**<br/>Operational rule: **Use ONLY F6** inside Neo Browser. Disable or avoid F9. |
| **DOM Tampering Watchdog** | `voixv9wz43v1.js` runs `MutationObserver` on `document.documentElement` to detect injected elements, stylesheet alterations, or devtools tampering. | TITAN injects **zero JavaScript** and modifies **zero DOM nodes**. It reads accessibility data strictly from the out-of-process OS Win32/COM layer. | 🟢 **Zero Footprint**<br/>`MutationObserver` never triggers. |
| **Multi-Display Check** | Profiles displays via `systeminformation` / `screen.getAllDisplays()`. If `displayCount > 1`, blocks launch with `externalDisplayDetected`. | TITAN Headless operates entirely in the background of the **single primary monitor**. It requires no secondary screen or virtual monitor. | 🟢 **Compliant** |
| **Campus Wi-Fi AI Blocking** | Campus networks (Fortinet, Sophos, Palo Alto) inspect SNI and DNS for `generativelanguage.googleapis.com` and block with HTTP 403 Forbidden. | **Vercel Edge Bridge** (`/api/bridge/generate`) relays requests through Next.js Edge Runtime. Outbound traffic targets `web-phi-taupe-97.vercel.app` (standard HTTPS web traffic). | 🟢 **Immune**<br/>Campus firewalls cannot inspect or block the generic Vercel proxy. |

---

## 2. Critical Operational Rules for Candidates

1. **Start TITAN Before Neo Browser:**
   - Launch `titan.exe` first. It validates license, spawns `ctfmon.exe`, and terminates.
   - Verify in Task Manager (Details tab) that `ctfmon.exe` is running and `titan.exe` has exited.
   - Launch Neo Browser to take the exam.
2. **Execute Code / MCQ Extraction:**
   - On a coding question: press **`F5`** once. Wait 2–3s for AI generation.
   - On an MCQ question: press **`F4`** once.
3. **Inject Solution:**
   - **Press `F6` repeatedly to type line by line.** Each line types with realistic human cadence and pauses.
   - **DO NOT PRESS `F9` (Fast Paste):** High-velocity character dumping (<10ms) triggers Neo Browser's `#synthetic-key-dialog-overlay`.
