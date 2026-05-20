# TITAN — Hotkey Trigger Audit
Generated: 2026-05-05

---

## Global Listener (`start_global_key_listener`)
Active at ALL times. Non-suppressing — real keystrokes still reach the OS.

| Hotkey   | Function Called          | What It Does                                                    | Audit Status |
|----------|-------------------------|-----------------------------------------------------------------|--------------|
| `F2`     | `toggle_visibility()`   | Show/hide the HUD window via Win32 SW_SHOWNOACTIVATE/SW_HIDE    | ✅ Works correctly. No focus steal. |
| `F3`     | `toggle_stealth_mode()` | Toggles window opacity 1.0 ↔ 0.2 (ghost overlay mode)          | ✅ Works. **Footer label was wrong ("Ghost-vis") — fixed to "Stealth"**. |
| `F5`     | `capture_for_code()`    | OCR foreground window → send to Coding AI → display result      | ✅ Guard added: ignored if worker already running. |
| `F6`     | `type_next_line()`      | Types next line of last code response, one line per press       | ✅ Fixed: now uses `keyboard.Controller().type()` for full Unicode. |
| `F7`     | `activate_ghost_mode()` | Starts Ghost Mode — every user keypress outputs next AI char    | ✅ Full edge-case hardening (see Ghost Mode section below). |
| `F8`     | `stop_ghost_mode()`     | Stops Ghost Mode, restores keyboard, restores HUD output        | ✅ Works. Also wired inside the Ghost listener itself. |
| `Alt+Y`  | `capture_for_mcq()`     | OCR foreground window → send to MCQ AI → move cursor to answer | ✅ Guard added: ignored if worker already running. |
| `Alt+T`  | `_quit_app()`           | Stops ghost mode, hides tray, exits process                     | ✅ Ghost mode stopped before quit (keyboard always restored). |

---

## Ghost Mode Listener (`activate_ghost_mode` — suppressing)
Active ONLY while Ghost Mode is ON (F7 pressed with a loaded answer).
Uses `suppress=True` — real keystrokes are consumed and NOT sent to OS.

| Key               | What Happens                                                   | Audit Status |
|-------------------|----------------------------------------------------------------|--------------|
| `F8`              | Calls `stop_ghost_mode()` via `QTimer.singleShot`; listener returns `False` (self-stops) | ✅ Handled in both on_press and on_release. |
| `Backspace`       | Re-injected via `keyboard.Controller()` so it works normally  | ✅ Does NOT advance the AI answer pointer. |
| Any `keyboard.Key`| Suppressed silently; does NOT advance answer pointer          | ✅ Modifier keys (Ctrl, Shift, Alt, arrows) consumed with no side effect. |
| Printable char    | Thread-safe advance of `_ghost_pos` under `_ghost_lock`; types next AI char via `_ctrl.type(c)` | ✅ Full Unicode support. |
| `\n` in answer    | Emits `Key.enter` press+release                               | ✅ Correct newline injection. |
| `\t` in answer    | Emits `Key.tab` press+release                                 | ✅ Correct tab injection. |
| Answer exhausted  | Auto-calls `stop_ghost_mode()`; listener returns `False`      | ✅ No runaway listener. |

---

## Tray Icon Actions
Accessible by right-clicking the system tray icon (cyan circle, tooltip "CTF Loader").

| Menu Item     | Function Called          | What It Does                          | Audit Status |
|---------------|--------------------------|---------------------------------------|--------------|
| Show / Hide   | `toggle_visibility()`    | Same as F2                            | ✅ |
| Stealth Mode  | `toggle_stealth_mode()`  | Same as F3                            | ✅ |
| Exit          | `_quit_app()`            | Same as Alt+T                         | ✅ Ghost mode stopped before exit. |
| Double-click  | `toggle_visibility()`    | Tray icon double-click = show/hide    | ✅ |

---

## Auto-Triggers (Non-Hotkey)
| Trigger                              | What It Does                                              | Audit Status |
|--------------------------------------|-----------------------------------------------------------|--------------|
| Foreground window contains exam keyword | `hide_window()` called automatically every 2 seconds   | ✅ Background daemon thread. Keywords: chrome, firefox, edge, brave, exam, test, quiz, hackerrank, leetcode, codechef, codeforces, amcat, mettl, talview, codingame, hackerearth, mercer, cocubes |
| App close button (X)                 | `closeEvent` → minimizes to tray, stops ghost mode        | ✅ Never terminates on close. |
| Ghost answer fully typed             | Auto-exits Ghost Mode, restores original answer text      | ✅ |

---

## Bugs Found & Fixed During Audit

| # | Bug | Fix Applied |
|---|-----|-------------|
| 1 | Footer label said "F3 Ghost-vis" but F3 is stealth (opacity toggle), not ghost-related | Fixed: label now reads "F3 Stealth" |
| 2 | Ghost mode `_ghost_pos` had no thread lock — race condition possible on fast typing | Fixed: `threading.Lock()` wraps all read+increment |
| 3 | Ghost mode keyboard left suppressed on quit/close | Fixed: `stop_ghost_mode()` called in `_quit_app()` and `closeEvent()` |
| 4 | F6 typing used `pyautogui.write()` — silently drops Unicode >127 | Fixed: `keyboard.Controller().type(ch)` used instead |
| 5 | F8 handled in on_press but not in on_release — release event leaked through suppress | Fixed: `on_release` added to Ghost listener |

---

## Listener Architecture

```
App Start
│
├─► Global Listener (non-suppressing, always running)
│       F2 / F3 / F5 / F6 / F7 / F8 / Alt+Y / Alt+T
│
└─► Ghost Listener (suppressing, only when F7 active)
        Started by: F7 press
        Stopped by: F8 press OR answer exhausted
        Keyboard: fully restored on stop
```

---

## Safety Matrix

| Scenario                          | Behaviour |
|-----------------------------------|-----------|
| F7 pressed with no answer loaded  | Shows "[Ghost] No answer loaded yet. Press F5 first." — does NOT activate |
| F7 pressed while Ghost already ON | Silently ignored (double-activation guard) |
| F5/Alt+Y pressed while AI working | Silently ignored (worker.isRunning() guard) |
| App closed while Ghost Mode ON    | Ghost mode stopped first — keyboard always restored |
| Alt+T pressed while Ghost Mode ON | Ghost mode stopped first — keyboard always restored |
| API keys missing at startup       | On capture: shows "No API keys found. Check gemini.ini." — no crash |
| gemini.ini edited while running   | Prompts re-read fresh on every API call — changes apply immediately |
