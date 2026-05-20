# TITAN Trigger Audit Report

## Overview
This audit details the dual-trigger input listener system implemented in TITAN (`final.py`). The application utilizes `pynput.keyboard.Listener` to intercept raw keyboard events globally, allowing the assistant to be triggered regardless of which window is in focus.

The system is designed with a fallback architecture, implementing two completely separate trigger paradigms:
1. **Traditional Hotkeys** (F-keys and Alt+Key combinations)
2. **Magic Sequences** (Stealth rolling-buffer sequences)

---

## 1. Traditional Hotkeys
These are single or combination key presses. While extremely fast, they are susceptible to being intercepted, blocked, or flagged by aggressive proctoring software that hooks the keyboard to block system keys (like Alt, Ctrl, and F-keys).

| Trigger | Action | Internal Function |
| :--- | :--- | :--- |
| **`F2`** | Toggle HUD Visibility | `toggle_visibility()` |
| **`F3`** | Toggle Stealth Mode | `toggle_stealth_mode()` |
| **`F5`** | Capture Screen for Code | `capture_for_code()` |
| **`F6`** | Type Next Line (Auto-Typer) | `type_next_line()` |
| **`F7`** | Activate Ghost Mode | `activate_ghost_mode()` |
| **`F8`** | Deactivate Ghost Mode | `stop_ghost_mode()` |
| **`Alt + Y`** | Capture Screen for MCQ | `capture_for_mcq()` |
| **`Alt + T`** | Emergency Quit/Kill Switch | `_quit_app()` |

> [!WARNING]
> Because standard F-Keys and Alt combinations rely on non-printable hardware key codes, advanced anti-cheat software can easily swallow these inputs, rendering the application unresponsive.

---

## 2. Magic Sequences (Stealth Triggers)
To bypass keyboard hooking, TITAN implements a stealth "rolling buffer" that listens to standard, printable characters as you type them normally.

Because these characters are standard alphabet inputs, proctoring software cannot block them without completely preventing the user from taking the test. TITAN monitors the last few keystrokes in a `deque` buffer. If the sequence matches a predefined trigger within the `_SEQ_TIMEOUT_MS` threshold, it fires the event.

| Sequence | Action | Internal Event Mapping |
| :--- | :--- | :--- |
| **`..c`** | Code Capture | `CODE_CAPTURE` |
| **`..m`** | MCQ Capture | `MCQ_CAPTURE` |
| **`..l`** | Type Next Line | `LINE_BY_LINE` |
| **`..g`** | Ghost Mode ON | `GHOST_ON` |
| **`..s`** | Ghost Mode OFF | `GHOST_STOP` |
| **`..h`** | Toggle HUD | `TOGGLE_HUD` |
| **`..t`** | Toggle Stealth | `STEALTH` |
| **`..q`** | Emergency Quit | `QUIT` |

### Cleanup Mechanism (`_cleanup_trigger_chars`)
When a Magic Sequence is successfully detected, TITAN spins up a daemon thread (`_cleanup_trigger_chars`) to simulate Backspace key presses. This guarantees that if a user types `..c` inside a code editor during a test, the "c" and the two periods are immediately deleted, leaving no trace in the editor while still triggering the background capture process.

---

## Evasion Analysis
*   **Dual Redundancy:** By maintaining both systems simultaneously, the user can default to standard Hotkeys, but seamlessly transition to Magic Sequences if standard keys become unresponsive.
*   **Zero-UI Triggers:** Both systems fire `QTimer.singleShot` events, dropping execution back onto the main PyQt thread cleanly without blocking the keyboard input stream.
*   **Buffer Timeout:** The sequence buffer clears automatically if too much time passes between keystrokes (`_SEQ_TIMEOUT_MS`), preventing accidental triggers during normal typing tasks.

> [!TIP]
> The `gemini.ini` file could theoretically be extended to allow users to customize their Magic Sequences remotely without needing to recompile the `titan.exe` payload.
