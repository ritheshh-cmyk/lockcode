"""
test_sendinput.py
-----------------
Tests ultra-fast text injection via Windows SendInput (Unicode key events).
NO clipboard. NO OCR. No pyautogui per-char delay.

How to test:
  1. Run:  python test_sendinput.py
  2. Open Notepad, click inside it
  3. Press F9
  4. You have 3 seconds to focus Notepad
  5. Watch the code appear instantly

Ctrl+C in terminal to quit.
"""

import ctypes
import ctypes.wintypes as wt
import time
import threading
from pynput import keyboard

# ── Windows SendInput constants ────────────────────────────────────────────────
INPUT_KEYBOARD    = 1
KEYEVENTF_UNICODE = 0x0004
KEYEVENTF_KEYUP   = 0x0002
VK_RETURN         = 0x0D
VK_TAB            = 0x09

class KEYBDINPUT(ctypes.Structure):
    _fields_ = [
        ("wVk",         wt.WORD),
        ("wScan",       wt.WORD),
        ("dwFlags",     wt.DWORD),
        ("time",        wt.DWORD),
        ("dwExtraInfo", ctypes.POINTER(wt.ULONG)),
    ]

class _INPUT_UNION(ctypes.Union):
    _fields_ = [("ki", KEYBDINPUT)]

class INPUT(ctypes.Structure):
    _anonymous_ = ("_u",)
    _fields_    = [("type", wt.DWORD), ("_u", _INPUT_UNION)]

_SendInput = ctypes.windll.user32.SendInput
_SendInput.argtypes = [wt.UINT, ctypes.POINTER(INPUT), ctypes.c_int]
_SendInput.restype  = wt.UINT


# ── Core injection: entire text in one burst, no clipboard touched ─────────────
def sendinput_type(text: str, chunk_size: int = 200) -> None:
    """
    Inject text via SendInput Unicode events.
    - No clipboard
    - No per-character delay
    - chunk_size controls how many inputs per SendInput call
    """
    inputs: list[INPUT] = []

    def _flush(buf):
        if not buf:
            return
        arr = (INPUT * len(buf))(*buf)
        _SendInput(len(buf), arr, ctypes.sizeof(INPUT))
        time.sleep(0.002)  # 2ms gap between chunks — prevents OS key drop

    for ch in text:
        if ch == "\n":
            for flag in (0, KEYEVENTF_KEYUP):
                ki  = KEYBDINPUT(wVk=VK_RETURN, wScan=0, dwFlags=flag, time=0, dwExtraInfo=None)
                inputs.append(INPUT(type=INPUT_KEYBOARD, ki=ki))
        elif ch == "\t":
            for flag in (0, KEYEVENTF_KEYUP):
                ki  = KEYBDINPUT(wVk=VK_TAB, wScan=0, dwFlags=flag, time=0, dwExtraInfo=None)
                inputs.append(INPUT(type=INPUT_KEYBOARD, ki=ki))
        else:
            scan = ord(ch)
            for flag in (KEYEVENTF_UNICODE, KEYEVENTF_UNICODE | KEYEVENTF_KEYUP):
                ki  = KEYBDINPUT(wVk=0, wScan=scan, dwFlags=flag, time=0, dwExtraInfo=None)
                inputs.append(INPUT(type=INPUT_KEYBOARD, ki=ki))

        # Flush every chunk_size characters (2 events per char)
        if len(inputs) >= chunk_size * 2:
            _flush(inputs)
            inputs = []

    _flush(inputs)


# ── Sample code that will be typed into Notepad ───────────────────────────────
SAMPLE_CODE = """\
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

nums = [64, 34, 25, 12, 22, 11, 90]
print(bubble_sort(nums))
"""


# ── Trigger: press F9 anywhere ────────────────────────────────────────────────
_typing = False

def on_press(key):
    global _typing
    if key == keyboard.Key.f9 and not _typing:
        threading.Thread(target=_countdown_and_type, daemon=True).start()

def _countdown_and_type():
    global _typing
    _typing = True
    for i in (3, 2, 1):
        print(f"[F9] Click Notepad... {i}s", flush=True)
        time.sleep(1)
    print("[F9] Injecting now...", flush=True)
    t0 = time.perf_counter()
    sendinput_type(SAMPLE_CODE)
    elapsed = time.perf_counter() - t0
    print(f"[F9] Done — {len(SAMPLE_CODE)} chars in {elapsed*1000:.0f}ms", flush=True)
    _typing = False


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 48)
    print("  SendInput Typing Test  (NO clipboard)")
    print("  Press F9 -> switch to Notepad -> 3s")
    print("  Ctrl+C to quit")
    print("=" * 48)

    with keyboard.Listener(on_press=on_press) as listener:
        listener.join()
