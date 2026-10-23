"""
Magic Sequence Trigger — Test Script

Listens globally for typed patterns and fires actions.
No modifier keys, no F-keys, no hooks — pure printable chars.
Completely invisible to proctoring software.

Triggers:
  ..c  = Code capture
  ..m  = MCQ capture
  ..g  = Ghost mode ON
  ..s  = Stop ghost
  ..h  = Hide/Show HUD
  ..l  = Line-by-line
  ..q  = Emergency quit

After a trigger fires, the typed chars (e.g. "..c") are
auto-deleted with backspaces so they don't stay in the text field.

Press Ctrl+C in this terminal to exit the test.
"""

import time
import threading
from collections import deque
from pynput import keyboard

# ── Configuration ──────────────────────────────────────────────
PREFIX = ".."                     # 2-char prefix before command
MAX_BUFFER = len(PREFIX) + 1     # we only need 3 chars in buffer
SEQUENCE_TIMEOUT_MS = 800        # max ms between chars to count as sequence

TRIGGERS = {
    f"{PREFIX}c": "CODE_CAPTURE",
    f"{PREFIX}m": "MCQ_CAPTURE",
    f"{PREFIX}g": "GHOST_ON",
    f"{PREFIX}s": "GHOST_STOP",
    f"{PREFIX}h": "TOGGLE_HUD",
    f"{PREFIX}l": "LINE_BY_LINE",
    f"{PREFIX}q": "QUIT",
}

# ── State ──────────────────────────────────────────────────────
buffer = deque(maxlen=MAX_BUFFER)
last_key_time = 0.0
ctrl = keyboard.Controller()


def _cleanup_typed_chars(count):
    """Send backspaces to delete the trigger chars from the text field."""
    time.sleep(0.02)  # small delay to let the last char commit
    for _ in range(count):
        ctrl.press(keyboard.Key.backspace)
        ctrl.release(keyboard.Key.backspace)
        time.sleep(0.008)


def on_press(key):
    global last_key_time

    # Only care about printable chars
    try:
        ch = key.char
        if ch is None:
            return
    except AttributeError:
        return

    now = time.time() * 1000  # ms

    # If too much time passed since last key, reset buffer
    if now - last_key_time > SEQUENCE_TIMEOUT_MS:
        buffer.clear()

    last_key_time = now
    buffer.append(ch)

    # Check if buffer matches any trigger
    current = "".join(buffer)
    for trigger, action in TRIGGERS.items():
        if current.endswith(trigger):
            print(f"\n  [OK] TRIGGER: {trigger!r} -> {action}")

            # Clean up: delete the trigger chars from text field
            threading.Thread(
                target=_cleanup_typed_chars,
                args=(len(trigger),),
                daemon=True,
            ).start()

            buffer.clear()

            if action == "QUIT":
                print("  [Exiting test]")
                return False  # stop listener

            return


def main():
    print("=" * 56)
    print("  MAGIC SEQUENCE TRIGGER — TEST")
    print("=" * 56)
    print()
    print("  Triggers (type these anywhere):")
    print("  -----------------------------")
    for trigger, action in TRIGGERS.items():
        print(f"    {trigger}  ->  {action}")
    print()
    print(f"  Prefix: {PREFIX!r}")
    print(f"  Timeout: {SEQUENCE_TIMEOUT_MS}ms between chars")
    print(f"  Auto-cleanup: trigger chars are backspaced out")
    print()
    print("  Open Notepad and start typing.")
    print("  Type  ..c  to test Code trigger.")
    print("  Type  ..q  to quit this test.")
    print("=" * 56)

    listener = keyboard.Listener(on_press=on_press, suppress=False)
    listener.start()

    try:
        listener.join()
    except KeyboardInterrupt:
        print("\n  [Ctrl+C — exiting]")


if __name__ == "__main__":
    main()
