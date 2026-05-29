# test_f9_typing.py
# ─────────────────────────────────────────────────────────────
# Standalone test for the F9 typing logic.
# HOW TO USE:
#   1. Run:  python tests\test_f9_typing.py
#   2. Open Notepad / IDE and click inside it.
#   3. Press F9 — 2-second countdown starts.
#   4. All 7 Java lines appear correctly.
#
# Strategy: pyautogui.write() per line + press('enter') between lines.
# pyautogui handles Shift+key combinations reliably via its own
# key-map; does NOT suffer from the pynput Shift-sticking bug.
# ─────────────────────────────────────────────────────────────

import threading
import time
import pyautogui
from pynput import keyboard

# Disable pyautogui's built-in failsafe (moving mouse to corner quits)
pyautogui.FAILSAFE = False
# No automatic pause between pyautogui calls
pyautogui.PAUSE = 0

# ── 7 lines of Java code to type ─────────────────────────────
JAVA_CODE = """\
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        System.out.println(n * n);
    }
}"""

# Delay between lines after pressing Enter (ms → s)
# Gives the IDE time to apply auto-indent before the next line starts.
_LINE_DELAY = 0.005   # 5 ms per line — very fast

# Delay between characters within a line (pyautogui interval param)
# 8 ms is aggressive but stable with proper Shift handling
_CHAR_INTERVAL = 0.008

# Extra delay after special characters (with Shift: @, #, $, %, *, +, etc)
# 5 ms is enough to clear Shift without slowing down too much
_SPECIAL_CHAR_DELAY = 0.005


# ── Core typing function ──────────────────────────────────────
def type_code(text: str):
    """Type text line-by-line with smart special char handling.

    Why pyautogui instead of pynput:
      pynput's Shift handling at fast intervals causes modifier-state leakage.
      pyautogui is more reliable, but special chars need extra delay.

    Strategy: Use 20ms per char (faster than original 25ms) + extra 15ms
      after Shift-based chars to ensure clean key release before next char.
    """
    # Characters that require Shift (need extra delay to clear state)
    SHIFT_CHARS = set('@#$%^&*()_+-={}|:"<>?')
    
    lines = text.split('\n')
    total_chars = len(text)
    print(f"[F9] Typing {total_chars} chars across {len(lines)} lines...")

    try:
        for line_idx, line in enumerate(lines):
            # Handle tabs within the line
            segments = line.split('\t')
            for seg_idx, seg in enumerate(segments):
                if seg:
                    # Type character by character with smart delays
                    for char in seg:
                        pyautogui.write(char, interval=_CHAR_INTERVAL)
                        # Extra delay after Shift-based chars to clear modifier state
                        if char in SHIFT_CHARS:
                            time.sleep(_SPECIAL_CHAR_DELAY)
                # Press Tab between segments (not after the last one)
                if seg_idx < len(segments) - 1:
                    pyautogui.press('tab')
                    time.sleep(0.01)

            # Press Enter between lines (not after the last line)
            if line_idx < len(lines) - 1:
                pyautogui.press('enter')
                time.sleep(_LINE_DELAY)

    except Exception as e:
        print(f"[F9] Typing error: {e}")
        return

    print(f"[F9 ✓] Done — {total_chars} chars typed.")


def _countdown_and_type(text: str, countdown: int = 2):
    """Show countdown then type on a background thread."""
    for i in range(countdown, 0, -1):
        print(f"[F9] Click your target window… typing in {i}s")
        time.sleep(1)
    type_code(text)


# ── F9 hotkey listener ────────────────────────────────────────
_triggered = False

def on_press(key):
    global _triggered
    if key == keyboard.Key.f9 and not _triggered:
        _triggered = True
        print("[F9] Triggered!")
        threading.Thread(
            target=_countdown_and_type,
            args=(JAVA_CODE, 2),
            daemon=True,
        ).start()

def on_release(key):
    if key == keyboard.Key.esc:
        print("[EXIT] Listener stopped.")
        return False  # stop listener


# ── Main ──────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 50)
    print("F9 Typing Test — pyautogui line-by-line")
    print("=" * 50)
    print(f"Code to type ({len(JAVA_CODE)} chars, {JAVA_CODE.count(chr(10)) + 1} lines):")
    print("-" * 40)
    print(JAVA_CODE)
    print("-" * 40)
    print(">> Press F9 to start typing into any window.")
    print(">> Press Esc to quit.")
    print()

    with keyboard.Listener(on_press=on_press, on_release=on_release) as listener:
        listener.join()
