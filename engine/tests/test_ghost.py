"""
Ghost Mode v4 — Proper Windows Low-Level Keyboard Hook (ctypes)

This is the CORRECT way to intercept and replace keypresses on Windows:
1. Install WH_KEYBOARD_LL hook via ctypes
2. In the hook callback, check LLKHF_INJECTED flag to skip our own events
3. Suppress user keypress (return 1) and inject AI char via SendInput
4. SendInput chars automatically have LLKHF_INJECTED set by the OS

No pynput suppress=True, no feedback loops, no AV signatures from
third-party libraries. Pure Win32 API.

Test: Run this, switch to Notepad within 5s, type any keys.
AI code appears instead. Backspace works. F8 stops.
"""
import ctypes
import ctypes.wintypes as wintypes
import threading
import time

# ── Win32 constants ──
user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

# Fix 64-bit return types — critical for hooks on x64 Windows
user32.SetWindowsHookExW.restype = ctypes.c_void_p
user32.SetWindowsHookExW.argtypes = [
    ctypes.c_int,       # idHook
    ctypes.c_void_p,    # lpfn
    ctypes.c_void_p,    # hMod
    wintypes.DWORD,     # dwThreadId
]
user32.CallNextHookEx.restype = ctypes.c_long
user32.CallNextHookEx.argtypes = [
    ctypes.c_void_p,    # hhk
    ctypes.c_int,       # nCode
    wintypes.WPARAM,    # wParam
    ctypes.c_void_p,    # lParam
]
user32.UnhookWindowsHookEx.argtypes = [ctypes.c_void_p]
user32.SendInput.argtypes = [
    ctypes.c_uint,                # nInputs
    ctypes.c_void_p,              # pInputs
    ctypes.c_int,                 # cbSize
]
kernel32.GetModuleHandleW.restype = ctypes.c_void_p
kernel32.GetModuleHandleW.argtypes = [wintypes.LPCWSTR]

WH_KEYBOARD_LL  = 13
WM_KEYDOWN       = 0x0100
WM_SYSKEYDOWN    = 0x0104
HC_ACTION        = 0
LLKHF_INJECTED   = 0x00000010

INPUT_KEYBOARD       = 1
KEYEVENTF_UNICODE    = 0x0004
KEYEVENTF_KEYUP      = 0x0002

VK_BACK    = 0x08
VK_TAB     = 0x09
VK_RETURN  = 0x0D
VK_SHIFT   = 0x10
VK_CONTROL = 0x11
VK_MENU    = 0x12   # Alt
VK_CAPITAL = 0x14
VK_ESCAPE  = 0x1B
VK_LWIN    = 0x5B
VK_RWIN    = 0x5C
VK_F8      = 0x77

# VK codes to always pass through (modifiers, nav, function keys except F8)
PASSTHROUGH_VKS = {
    VK_SHIFT, VK_CONTROL, VK_MENU, VK_CAPITAL, VK_ESCAPE,
    VK_LWIN, VK_RWIN,
    0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5,  # L/R shift, ctrl, alt
    0x90, 0x91,  # NumLock, ScrollLock
    # Arrow keys
    0x25, 0x26, 0x27, 0x28,
    # Navigation: PageUp, PageDown, End, Home, Insert, Delete
    0x21, 0x22, 0x23, 0x24, 0x2D, 0x2E,
}
# F-keys F1-F12 except F8
for fk in range(0x70, 0x7C):
    if fk != VK_F8:
        PASSTHROUGH_VKS.add(fk)


# ── Win32 structures ──
class KBDLLHOOKSTRUCT(ctypes.Structure):
    _fields_ = [
        ("vkCode",      wintypes.DWORD),
        ("scanCode",    wintypes.DWORD),
        ("flags",       wintypes.DWORD),
        ("time",        wintypes.DWORD),
        ("dwExtraInfo", ctypes.POINTER(ctypes.c_ulong)),
    ]

HOOKPROC = ctypes.WINFUNCTYPE(
    ctypes.c_long,       # return (LRESULT)
    ctypes.c_int,        # nCode
    wintypes.WPARAM,     # wParam
    ctypes.c_void_p,     # lParam (we cast it inside)
)

class KEYBDINPUT(ctypes.Structure):
    _fields_ = [
        ("wVk",         wintypes.WORD),
        ("wScan",       wintypes.WORD),
        ("dwFlags",     wintypes.DWORD),
        ("time",        wintypes.DWORD),
        ("dwExtraInfo", ctypes.POINTER(ctypes.c_ulong)),
    ]

class INPUT_UNION(ctypes.Union):
    _fields_ = [("ki", KEYBDINPUT)]

class INPUT(ctypes.Structure):
    _fields_ = [
        ("type",   wintypes.DWORD),
        ("_input", INPUT_UNION),
    ]


# ── SendInput helpers ──
def send_unicode_char(ch):
    """Send a single Unicode character via SendInput (KEYEVENTF_UNICODE).
    These events automatically get LLKHF_INJECTED flag from the OS."""
    code = ord(ch)
    inputs = (INPUT * 2)()
    inputs[0].type = INPUT_KEYBOARD
    inputs[0]._input.ki.wScan = code
    inputs[0]._input.ki.dwFlags = KEYEVENTF_UNICODE
    inputs[1].type = INPUT_KEYBOARD
    inputs[1]._input.ki.wScan = code
    inputs[1]._input.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP
    user32.SendInput(2, ctypes.byref(inputs), ctypes.sizeof(INPUT))


def send_vk(vk):
    """Send a virtual key press+release via SendInput."""
    inputs = (INPUT * 2)()
    inputs[0].type = INPUT_KEYBOARD
    inputs[0]._input.ki.wVk = vk
    inputs[1].type = INPUT_KEYBOARD
    inputs[1]._input.ki.wVk = vk
    inputs[1]._input.ki.dwFlags = KEYEVENTF_KEYUP
    user32.SendInput(2, ctypes.byref(inputs), ctypes.sizeof(INPUT))


def send_ghost_char(ch):
    """Send an AI character — handles newline, tab, and regular chars."""
    if ch == '\n':
        send_vk(VK_RETURN)
    elif ch == '\t':
        send_vk(VK_TAB)
    else:
        send_unicode_char(ch)


# ── Test data ──
TEST_CODE = """public class Solution {
    public static int fibonacci(int n) {
        if (n <= 1) return n;
        int a = 0, b = 1;
        for (int i = 2; i <= n; i++) {
            int temp = a + b;
            a = b;
            b = temp;
        }
        return b;
    }
}"""


def run_ghost_mode(ghost_text, timeout_s=120):
    """Install keyboard hook, intercept user keys, inject AI chars.
    Returns number of chars typed."""

    pos = [0]  # mutable container for closure
    hook_handle = [None]
    done_reason = ["timeout"]

    def hook_proc(nCode, wParam, lParam):
        if nCode < 0:
            return user32.CallNextHookEx(hook_handle[0], nCode, wParam, lParam)

        # Only process keydown events
        if wParam not in (WM_KEYDOWN, WM_SYSKEYDOWN):
            return user32.CallNextHookEx(hook_handle[0], nCode, wParam, lParam)

        # Cast lParam to KBDLLHOOKSTRUCT
        kb = ctypes.cast(lParam, ctypes.POINTER(KBDLLHOOKSTRUCT)).contents
        vk = kb.vkCode

        # CRITICAL: Pass through injected events (our own SendInput)
        if kb.flags & LLKHF_INJECTED:
            return user32.CallNextHookEx(hook_handle[0], nCode, wParam, lParam)

        # F8 → stop ghost mode
        if vk == VK_F8:
            done_reason[0] = "F8"
            user32.PostQuitMessage(0)
            return user32.CallNextHookEx(hook_handle[0], nCode, wParam, lParam)

        # Backspace → pass through normally
        if vk == VK_BACK:
            return user32.CallNextHookEx(hook_handle[0], nCode, wParam, lParam)

        # Modifier/nav/F-keys → pass through
        if vk in PASSTHROUGH_VKS:
            return user32.CallNextHookEx(hook_handle[0], nCode, wParam, lParam)

        # ── Printable key: suppress it and inject AI char ──
        if pos[0] >= len(ghost_text):
            done_reason[0] = "exhausted"
            user32.PostQuitMessage(0)
            return user32.CallNextHookEx(hook_handle[0], nCode, wParam, lParam)

        ch = ghost_text[pos[0]]
        pos[0] += 1

        # Inject AI char in a micro-thread to avoid blocking the hook
        threading.Thread(target=send_ghost_char, args=(ch,), daemon=True).start()

        # Return 1 = suppress the original keypress
        return 1

    # ── Install hook ──
    callback = HOOKPROC(hook_proc)
    # For WH_KEYBOARD_LL, use python DLL handle or 0
    h_mod = kernel32.GetModuleHandleW("python314.dll") or kernel32.GetModuleHandleW(None) or 0
    hook_handle[0] = user32.SetWindowsHookExW(
        WH_KEYBOARD_LL,
        callback,
        h_mod,
        0,
    )
    if not hook_handle[0]:
        print(f"[Ghost] Failed to install hook (error {ctypes.GetLastError()})")
        return 0

    print(f"[Ghost] Hook installed. {len(ghost_text)} chars loaded.")

    # ── Timeout watchdog ──
    def _timeout():
        time.sleep(timeout_s)
        if hook_handle[0]:
            done_reason[0] = "timeout"
            user32.PostQuitMessage(0)
    threading.Thread(target=_timeout, daemon=True).start()

    # ── Message pump (required for low-level hooks) ──
    msg = wintypes.MSG()
    while user32.GetMessageW(ctypes.byref(msg), None, 0, 0) != 0:
        user32.TranslateMessage(ctypes.byref(msg))
        user32.DispatchMessageW(ctypes.byref(msg))

    # ── Cleanup ──
    user32.UnhookWindowsHookEx(hook_handle[0])
    hook_handle[0] = None

    print(f"[Ghost] Done ({done_reason[0]}). Typed {pos[0]}/{len(ghost_text)} chars.")
    return pos[0]


def main():
    print("=" * 60)
    print("  GHOST MODE v4 — Win32 Low-Level Hook")
    print("=" * 60)
    print(f"  Chars: {len(TEST_CODE)}")
    print(f"  Switch to Notepad in 5 seconds, then type.")
    print(f"  AI code appears instead of your keys.")
    print(f"  Backspace = normal | F8 = stop")
    print("=" * 60)

    time.sleep(5)
    print("[Ghost] ACTIVE — type in Notepad now!\n")
    run_ghost_mode(TEST_CODE)


if __name__ == "__main__":
    main()
