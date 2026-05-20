"""
test_typing.py
--------------
Standalone test for F6 human typing behavior using pyautogui.
Tests the exact same logic that will run inside TITAN.

HOW TO TEST:
  1. Run this script:  python test_typing.py
  2. You get 5 seconds — quickly open Notepad (or any IDE)
  3. Click inside the text area
  4. Watch the code type itself out
  5. Check for repeated characters (ssss, dddd), missed chars, or uneven pauses
  6. Edit the DELAYS section below and re-run until it feels perfect.
"""

import pyautogui
import time
import random
import ctypes


# ─────────────────────────────────────────────────────────────────
# CONFIGURABLE DELAYS — Tune these until it feels right
# ─────────────────────────────────────────────────────────────────

# Key release gap — prevents "ssshhhh" character-repeat OS bug.
# 0.05 is safe. Increase to 0.07 if repeats still happen.
KEY_RELEASE_GAP = 0.05

# Regular characters (a-z, 0-9) — human programmer ~150-200ms avg
CHAR_DELAY_MIN  = 0.10
CHAR_DELAY_MAX  = 0.20

# Spaces between words — humans pause more here
SPACE_DELAY_MIN = 0.15
SPACE_DELAY_MAX = 0.28

# Symbols/brackets — reaching for Shift or unusual key positions
SYMBOL_DELAY_MIN = 0.20
SYMBOL_DELAY_MAX = 0.40

# "End-of-statement" pause: after ; } ) — programmer thinks before next line
END_STATEMENT_DELAY_MIN = 0.35
END_STATEMENT_DELAY_MAX = 0.65

# Random "thinking" hesitation mid-line (~5% chance per character)
THINK_PAUSE_CHANCE = 0.05
THINK_PAUSE_MIN    = 0.40
THINK_PAUSE_MAX    = 0.90

# Natural pause between lines (reading what's next)
LINE_PAUSE_MIN = 0.35
LINE_PAUSE_MAX = 0.65


# ─────────────────────────────────────────────────────────────────
# SAMPLE CODE TO TYPE
# ─────────────────────────────────────────────────────────────────

SAMPLE_CODE = """\
import java.util.*;

public class BubbleSort {
    public static void main(String[] args) {
        int[] arr = {64, 34, 25, 12, 22, 11, 90};
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
        System.out.println(Arrays.toString(arr));
    }
}"""


# ─────────────────────────────────────────────────────────────────
# TYPING ENGINE
# ─────────────────────────────────────────────────────────────────

SYMBOL_CHARS   = set('{}[];,()="\':<>!@#$%^&*_+-|?/')
END_STMT_CHARS = set(';})')   # Programmer pauses longer after these


def type_line(line: str) -> None:
    """Type a single line using pyautogui with production-level human timing."""

    # Force 1ms Windows timer resolution for jitter-free sleep on all laptops
    try:
        ctypes.windll.winmm.timeBeginPeriod(1)
    except Exception:
        pass

    pyautogui.PAUSE    = KEY_RELEASE_GAP
    pyautogui.FAILSAFE = False

    try:
        for ch in line:
            pyautogui.write(ch)

            if ch == ' ':
                # Word boundary — slight pause
                time.sleep(random.uniform(SPACE_DELAY_MIN, SPACE_DELAY_MAX))

            elif ch in END_STMT_CHARS:
                # End of statement — programmer pauses to think about next line
                time.sleep(random.uniform(END_STATEMENT_DELAY_MIN, END_STATEMENT_DELAY_MAX))

            elif ch in SYMBOL_CHARS:
                # Symbol — reaching for special key/shift
                time.sleep(random.uniform(SYMBOL_DELAY_MIN, SYMBOL_DELAY_MAX))

            else:
                # Standard letter/digit — occasionally hesitate (thinking)
                if random.random() < THINK_PAUSE_CHANCE:
                    time.sleep(random.uniform(THINK_PAUSE_MIN, THINK_PAUSE_MAX))
                else:
                    time.sleep(random.uniform(CHAR_DELAY_MIN, CHAR_DELAY_MAX))

        pyautogui.press('enter')

    finally:
        try:
            ctypes.windll.winmm.timeEndPeriod(1)
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────
# MAIN: Countdown then type line by line
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 50)
    print("  F6 Typing Simulation Test")
    print("  Switch to Notepad / IDE NOW")
    print("=" * 50)

    for i in (5, 4, 3, 2, 1):
        print(f"  Starting in {i}s...", flush=True)
        time.sleep(1)

    print("  Typing...", flush=True)
    lines = SAMPLE_CODE.split("\n")

    for i, ln in enumerate(lines):
        print(f"  [{i+1}/{len(lines)}] {ln[:40]}", flush=True)
        type_line(ln)
        # Natural pause between lines (reading what's next)
        time.sleep(random.uniform(LINE_PAUSE_MIN, LINE_PAUSE_MAX))

    print("  Done!")
