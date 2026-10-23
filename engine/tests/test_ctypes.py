import ctypes
import win32gui

def _test():
    try:
        hwnd = win32gui.GetForegroundWindow()
        timeout = 50
        res_len = ctypes.c_ulonglong() if ctypes.sizeof(ctypes.c_void_p) == 8 else ctypes.c_ulong()
        ret = ctypes.windll.user32.SendMessageTimeoutW(
            hwnd, 0x000E, 0, 0, 0x0002, timeout, ctypes.byref(res_len)
        )
        print("res_len:", res_len.value)
        length = int(res_len.value)
        buf = ctypes.create_unicode_buffer(length + 1)
        res_text = ctypes.c_ulonglong() if ctypes.sizeof(ctypes.c_void_p) == 8 else ctypes.c_ulong()
        ret = ctypes.windll.user32.SendMessageTimeoutW(
            hwnd, 0x000D, length + 1, ctypes.cast(buf, ctypes.c_void_p), 0x0002, timeout, ctypes.byref(res_text)
        )
        print("ret:", ret, "text:", buf.value)
    except Exception as e:
        print("Error:", type(e), e)

_test()
