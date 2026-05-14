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
_LINE_DELAY = 0.05   # 50 ms per line — adjust up if IDE is slow

# Delay between characters within a line (pyautogui interval param)
# 10 ms was too fast and caused Shift to drop (turning ')' into '0' and '*' into '8').
# 25 ms (~40 chars/sec) is generally the safe minimum for Windows to reliably process
# Shift modifier keydown/keyup events without mixing them up.
_CHAR_INTERVAL = 0.025


# ── Core typing function ──────────────────────────────────────
def type_code(text: str):
    """Type text line-by-line using pyautogui.write() + press('enter').

    Why pyautogui instead of pynput at 5 ms:
      pynput.Controller.type() internally presses Shift for capitals.
      At <10 ms intervals the Windows input stack doesn't fully clear
      the Shift state, corrupting subsequent chars (S→}, M→}, *→}).
      pyautogui uses its own VK key-map with explicit per-char timing
      that avoids modifier-state leakage.

    Tab handling: split each line on \\t, write segments, press tab between.
    """
    lines = text.split('\n')
    total_chars = len(text)
    print(f"[F9] Typing {total_chars} chars across {len(lines)} lines...")

    try:
        for line_idx, line in enumerate(lines):
            # Handle tabs within the line
            segments = line.split('\t')
            for seg_idx, seg in enumerate(segments):
                if seg:
                    pyautogui.write(seg, interval=_CHAR_INTERVAL)
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
