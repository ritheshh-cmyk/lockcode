import sys
import os
import time
import threading
import win32gui
import win32con
import win32api
import ctypes
import ctypes.wintypes
import queue

# Custom WM_USER messages
WM_TOGGLE_VISIBILITY = win32con.WM_USER + 101
WM_CYCLE_STEALTH = win32con.WM_USER + 102
WM_UPDATE_TEXT = win32con.WM_USER + 103
WM_MAIN_THREAD_CALLBACK = win32con.WM_USER + 104

def get_dpi_scale():
    """Enable DPI awareness and retrieve the system DPI scale factor."""
    try:
        # PROCESS_PER_MONITOR_DPI_AWARE = 2
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass
            
    try:
        hdc = win32gui.GetDC(0)
        dpi = win32gui.GetDeviceCaps(hdc, win32con.LOGPIXELSY)
        win32gui.ReleaseDC(0, hdc)
        return dpi / 96.0
    except Exception:
        return 1.0

# Pre-calculate DPI scale factor
DPI_SCALE = get_dpi_scale()

class Win32Overlay:
    def __init__(self, class_name="ctfmon"):
        self.class_name = class_name
        self.hwnd = None
        self.hwnd_edit = None
        self.visible = True
        self.stealth_index = 0
        
        # Window opacity levels matching final.py's window opacity (1.0 -> 0.15 -> 0.05)
        # PyQt5 container background was rgba(12, 12, 18, 210) -> 82% opaque.
        # So we use 210 as our Level 0 (opaque) window alpha to match translucency.
        self.alpha_levels = [210, 38, 12]
        
        # Pre-create brushes to avoid GDI leaks
        self.hBrushOuter = win32gui.CreateSolidBrush(win32api.RGB(12, 12, 18))
        self.hBrushInner = win32gui.CreateSolidBrush(win32api.RGB(20, 20, 30))
        self.hBrushKey = win32gui.CreateSolidBrush(win32api.RGB(255, 0, 255)) # transparent color key
        
        self.text_content = "Waiting for command..."
        
        # Thread safe queues for callbacks and text updates
        self.main_thread_queue = queue.Queue()
        self.hwnd_thread = None
        self.W = 0
        self.H = 0

    def start(self):
        self.hwnd_thread = threading.Thread(target=self._run_window, daemon=True)
        self.hwnd_thread.start()

    def toggle(self):
        if self.hwnd:
            win32gui.PostMessage(self.hwnd, WM_TOGGLE_VISIBILITY, 0, 0)

    def cycle_stealth(self):
        if self.hwnd:
            win32gui.PostMessage(self.hwnd, WM_CYCLE_STEALTH, 0, 0)

    def update_text(self, new_text):
        # Format text to use Windows style newlines (\r\n) for EDIT control
        self.text_content = new_text.replace("\r\n", "\n").replace("\n", "\r\n")
        if self.hwnd:
            win32gui.PostMessage(self.hwnd, WM_UPDATE_TEXT, 0, 0)

    def get_font(self, name, size_px, bold=False):
        lf = win32gui.LOGFONT()
        lf.lfHeight = -int(size_px * DPI_SCALE) # specify height directly in scaled pixels
        lf.lfWeight = win32con.FW_BOLD if bold else win32con.FW_NORMAL
        lf.lfFaceName = name
        return win32gui.CreateFontIndirect(lf)

    def _run_window(self):
        # 1. Register Window Class
        wc = win32gui.WNDCLASS()
        wc.lpfnWndProc = self._wnd_proc
        wc.lpszClassName = self.class_name
        wc.hInstance = win32gui.GetModuleHandle(None)
        wc.hCursor = win32gui.LoadCursor(0, win32con.IDC_ARROW)
        wc.hbrBackground = self.hBrushKey
        
        try:
            win32gui.RegisterClass(wc)
        except Exception as e:
            print(f"Error registering class: {e}")
            return

        # 2. Dynamic Sizing and Positioning matching final.py exactly (scaled by DPI)
        screen_w = win32api.GetSystemMetrics(win32con.SM_CXSCREEN)
        screen_h = win32api.GetSystemMetrics(win32con.SM_CYSCREEN)
        
        # Base dimensions from final.py (caps at 360x420, min of 280x260)
        base_w = max(280, min(360, int(screen_w * 0.22)))
        base_h = max(260, min(420, int(screen_h * 0.40)))
        
        self.W = int(base_w * DPI_SCALE)
        self.H = int(base_h * DPI_SCALE)
        
        x = screen_w - self.W - int(18 * DPI_SCALE)
        y = screen_h - self.H - int(50 * DPI_SCALE) # 50px taskbar margin

        # 3. Create window with clean styles (WS_POPUP, WS_EX_TOPMOST, etc.)
        style = win32con.WS_POPUP
        ex_style = (
            win32con.WS_EX_TOPMOST |       # Stays on top
            win32con.WS_EX_TOOLWINDOW |    # Hide from taskbar & Alt+Tab
            win32con.WS_EX_LAYERED |       # Support transparency / alpha
            win32con.WS_EX_TRANSPARENT |   # Click-through outside controls
            win32con.WS_EX_NOACTIVATE      # Do not steal focus
        )

        self.hwnd = win32gui.CreateWindowEx(
            ex_style,
            self.class_name,
            "",
            style,
            x, y, self.W, self.H,
            0, 0, wc.hInstance, None
        )

        # Set window display affinity to exclude from capture (stealth overlay)
        WDA_EXCLUDEFROMCAPTURE = 0x00000011
        try:
            ctypes.windll.user32.SetWindowDisplayAffinity(self.hwnd, WDA_EXCLUDEFROMCAPTURE)
        except Exception:
            pass

        # 4. Create child Edit control mimicking QTextEdit output area
        # We simulate 8px padding inside the inner box (geometries scaled by DPI).
        # We omit WS_VSCROLL to hide the thick, ugly standard Win32 scrollbar
        # but keep ES_AUTOVSCROLL to support programmatical scrolling.
        edit_x = int(22 * DPI_SCALE)
        edit_y = int(40 * DPI_SCALE)
        edit_w = self.W - int(44 * DPI_SCALE)
        edit_h = self.H - int(88 * DPI_SCALE)

        self.hwnd_edit = win32gui.CreateWindowEx(
            0,
            "EDIT",
            "",
            win32con.WS_CHILD | win32con.WS_VISIBLE | win32con.ES_MULTILINE | win32con.ES_READONLY | win32con.ES_AUTOVSCROLL,
            edit_x, edit_y, edit_w, edit_h,
            self.hwnd,
            1001, # Control ID
            wc.hInstance,
            None
        )

        # Set font for the edit control (Consolas, 12px)
        hFontEdit = self.get_font("Consolas", 12, bold=False)
        win32gui.SendMessage(self.hwnd_edit, win32con.WM_SETFONT, hFontEdit, 1)
        win32gui.SetWindowText(self.hwnd_edit, self.text_content)

        # 5. Set initial transparency (Opaque mode: 210 alpha, Magenta color key transparent)
        LWA_COLORKEY = 0x00000001
        LWA_ALPHA = 0x00000002
        ctypes.windll.user32.SetLayeredWindowAttributes(
            self.hwnd, 
            win32api.RGB(255, 0, 255), 
            self.alpha_levels[self.stealth_index], 
            LWA_COLORKEY | LWA_ALPHA
        )

        # 6. Show window and ensure it starts Topmost
        win32gui.SetWindowPos(
            self.hwnd,
            win32con.HWND_TOPMOST,
            0, 0, 0, 0,
            win32con.SWP_NOMOVE | win32con.SWP_NOSIZE | win32con.SWP_NOACTIVATE | win32con.SWP_SHOWWINDOW
        )
        win32gui.UpdateWindow(self.hwnd)

        # 7. Message pump
        win32gui.PumpMessages()

    def _wnd_proc(self, hwnd, message, wparam, lparam):
        if message == win32con.WM_PAINT:
            hdc, ps = win32gui.BeginPaint(hwnd)
            
            # Clear window background with Magenta (transparent color key)
            rect = win32gui.GetClientRect(hwnd)
            win32gui.FillRect(hdc, rect, self.hBrushKey)
            
            # Draw Outer HUD Box Container (border-radius: 12px -> ellipse 24)
            # Inset by 1px to avoid edge clipping.
            # Border: rgba(0, 255, 255, 60) -> blended over dark bg, represented as RGB(0, 160, 160)
            hPenOuter = win32gui.CreatePen(win32con.PS_SOLID, 1, win32api.RGB(0, 160, 160))
            oldPen = win32gui.SelectObject(hdc, hPenOuter)
            oldBrush = win32gui.SelectObject(hdc, self.hBrushOuter)
            
            win32gui.RoundRect(
                hdc, 
                1, 1, 
                self.W - 1, self.H - 1, 
                int(24 * DPI_SCALE), int(24 * DPI_SCALE)
            )
            
            win32gui.SelectObject(hdc, oldPen)
            win32gui.DeleteObject(hPenOuter)
            
            # Draw Inner Output Box (border-radius: 8px -> ellipse 16)
            # Border: rgba(0, 255, 255, 25) -> represented as RGB(0, 75, 75)
            hPenInner = win32gui.CreatePen(win32con.PS_SOLID, 1, win32api.RGB(0, 75, 75))
            oldPen = win32gui.SelectObject(hdc, hPenInner)
            win32gui.SelectObject(hdc, self.hBrushInner)
            
            win32gui.RoundRect(
                hdc, 
                int(14 * DPI_SCALE), int(32 * DPI_SCALE), 
                self.W - int(14 * DPI_SCALE), self.H - int(40 * DPI_SCALE), 
                int(16 * DPI_SCALE), int(16 * DPI_SCALE)
            )
            
            win32gui.SelectObject(hdc, oldPen)
            win32gui.DeleteObject(hPenInner)
            
            # Draw Header Title "T I T A N" (Segoe UI, 13px, bold, bright cyan)
            win32gui.SetBkMode(hdc, win32con.TRANSPARENT)
            win32gui.SetTextColor(hdc, win32api.RGB(0, 220, 220))
            hFontTitle = self.get_font("Segoe UI", 13, bold=True)
            oldFont = win32gui.SelectObject(hdc, hFontTitle)
            
            win32gui.DrawText(
                hdc, "T I T A N", -1,
                (int(14 * DPI_SCALE), int(10 * DPI_SCALE), self.W - int(14 * DPI_SCALE), int(26 * DPI_SCALE)),
                win32con.DT_LEFT | win32con.DT_SINGLELINE | win32con.DT_VCENTER
            )
            win32gui.SelectObject(hdc, oldFont)
            win32gui.DeleteObject(hFontTitle)
            
            # Draw Footer (Segoe UI, 9px, normal, dim gray)
            win32gui.SetTextColor(hdc, win32api.RGB(100, 110, 120))
            hFontFooter = self.get_font("Segoe UI", 9, bold=False)
            oldFont = win32gui.SelectObject(hdc, hFontFooter)
            
            footer_text = "F5 Code | F4 MCQ | F6 Line | F2 Hide | F3 Stealth | Alt+T Exit"
            win32gui.DrawText(
                hdc, footer_text, -1,
                (int(14 * DPI_SCALE), self.H - int(34 * DPI_SCALE), self.W - int(14 * DPI_SCALE), self.H - int(10 * DPI_SCALE)),
                win32con.DT_CENTER | win32con.DT_SINGLELINE | win32con.DT_VCENTER
            )
            win32gui.SelectObject(hdc, oldFont)
            win32gui.DeleteObject(hFontFooter)
            
            win32gui.EndPaint(hwnd, ps)
            return 0

        elif message == win32con.WM_CTLCOLORSTATIC:
            # Color the EDIT control background and text
            hdc_edit = wparam
            win32gui.SetTextColor(hdc_edit, win32api.RGB(224, 224, 224))
            win32gui.SetBkColor(hdc_edit, win32api.RGB(20, 20, 30))
            return int(self.hBrushInner)

        elif message == WM_TOGGLE_VISIBILITY:
            self.visible = not self.visible
            if self.visible:
                win32gui.SetWindowPos(
                    hwnd,
                    win32con.HWND_TOPMOST,
                    0, 0, 0, 0,
                    win32con.SWP_NOMOVE | win32con.SWP_NOSIZE | win32con.SWP_NOACTIVATE | win32con.SWP_SHOWWINDOW
                )
            else:
                win32gui.ShowWindow(hwnd, win32con.SW_HIDE)
            return 0

        elif message == WM_CYCLE_STEALTH:
            self.stealth_index = (self.stealth_index + 1) % len(self.alpha_levels)
            LWA_COLORKEY = 0x00000001
            LWA_ALPHA = 0x00000002
            ctypes.windll.user32.SetLayeredWindowAttributes(
                hwnd, 
                win32api.RGB(255, 0, 255), 
                self.alpha_levels[self.stealth_index], 
                LWA_COLORKEY | LWA_ALPHA
            )
            return 0

        elif message == WM_UPDATE_TEXT:
            if self.hwnd_edit:
                win32gui.SetWindowText(self.hwnd_edit, self.text_content)
                # Auto-scroll edit control to bottom
                win32gui.SendMessage(self.hwnd_edit, win32con.EM_LINESCROLL, 0, 99999)
                win32gui.RedrawWindow(self.hwnd_edit, None, None, win32con.RDW_INVALIDATE | win32con.RDW_UPDATENOW)
            win32gui.InvalidateRect(hwnd, None, True)
            win32gui.UpdateWindow(hwnd)
            return 0

        elif message == WM_MAIN_THREAD_CALLBACK:
            # Process callback queued from background threads
            try:
                while not self.main_thread_queue.empty():
                    action_tuple = self.main_thread_queue.get_nowait()
                    action = action_tuple[0]
                    args = action_tuple[1:]
                    
                    if hasattr(self, action):
                        getattr(self, action)(*args)
            except Exception as e:
                print(f"Error in main thread dispatch: {e}")
            return 0

        elif message == win32con.WM_NCHITTEST:
            # Draggable by clicking anywhere except the edit box
            x = lparam & 0xFFFF
            y = (lparam >> 16) & 0xFFFF
            
            client_pt = win32gui.ScreenToClient(hwnd, (x, y))
            cx, cy = client_pt[0], client_pt[1]
            
            edit_left = int(22 * DPI_SCALE)
            edit_top = int(40 * DPI_SCALE)
            edit_right = self.W - int(22 * DPI_SCALE)
            edit_bottom = self.H - int(48 * DPI_SCALE)
            if edit_left <= cx <= edit_right and edit_top <= cy <= edit_bottom:
                return win32con.HTCLIENT
                
            return win32con.HTCAPTION

        elif message == win32con.WM_DESTROY:
            win32gui.DeleteObject(self.hBrushOuter)
            win32gui.DeleteObject(self.hBrushInner)
            win32gui.DeleteObject(self.hBrushKey)
            win32gui.PostQuitMessage(0)
            return 0

        return win32gui.DefWindowProc(hwnd, message, wparam, lparam)


def start_raw_key_poller_thread(overlay):
    VK_F2 = 0x71
    VK_F3 = 0x72
    VK_F4 = 0x73
    VK_F5 = 0x74
    VK_F6 = 0x75
    VK_F9 = 0x78
    VK_MENU = 0x12
    VK_T = 0x54

    state = {VK_F2: False, VK_F3: False, VK_F4: False, VK_F5: False,
             VK_F6: False, VK_F9: False, VK_T: False}
    
    def is_pressed(vk):
        return (ctypes.windll.user32.GetAsyncKeyState(vk) & 0x8000) != 0

    while True:
        try:
            alt_down = is_pressed(VK_MENU)
            for vk in list(state.keys()):
                pressed = is_pressed(vk)
                if pressed and not state[vk]:
                    state[vk] = True
                    if vk == VK_F2:
                        ctypes.windll.user32.MessageBeep(0)
                        overlay.toggle()
                    elif vk == VK_F3:
                        ctypes.windll.user32.MessageBeep(0)
                        overlay.cycle_stealth()
                    elif vk == VK_F4:
                        overlay.update_text("MCQ Answer Ready — press F2 to view:\n\n1/3 🔍 Capturing MCQ...\n✓ Selected: Option 2")
                    elif vk == VK_F5:
                        overlay.update_text("AI Response Ready — press F2 to view:\n\n1/3 🔍 Capturing Code...")
                    elif vk == VK_F6:
                        overlay.update_text("Line-by-line typing triggered...")
                    elif vk == VK_F9:
                        overlay.update_text("Paste all triggered...")
                    elif vk == VK_T:
                        if alt_down:
                            win32gui.PostMessage(overlay.hwnd, win32con.WM_DESTROY, 0, 0)
                            sys.exit(0)
                elif not pressed and state[vk]:
                    state[vk] = False
        except Exception as e:
            print(f"Error in key poller: {e}")
        time.sleep(0.02)


# Z-Order Guardian 1: OS Event Hook (App Switching)
_WinEventProc = ctypes.WINFUNCTYPE(
    None,
    ctypes.c_void_p,
    ctypes.wintypes.DWORD,
    ctypes.wintypes.HWND,
    ctypes.wintypes.LONG,
    ctypes.wintypes.LONG,
    ctypes.wintypes.DWORD,
    ctypes.wintypes.DWORD
)

def _on_fg_change(hHook, event, hwnd, idObject, idChild, dwThread, dwTime):
    global overlay_instance
    try:
        if overlay_instance and overlay_instance.hwnd and overlay_instance.visible:
            if hwnd != overlay_instance.hwnd:
                win32gui.SetWindowPos(
                    overlay_instance.hwnd,
                    win32con.HWND_TOPMOST,
                    0, 0, 0, 0,
                    win32con.SWP_NOMOVE | win32con.SWP_NOSIZE | win32con.SWP_NOACTIVATE | win32con.SWP_SHOWWINDOW
                )
    except Exception:
        pass

_cb_ref = _WinEventProc(_on_fg_change)

def start_zorder_guardian():
    def _run():
        EVENT_SYSTEM_FOREGROUND = 0x0003
        WINEVENT_OUTOFCONTEXT = 0x0002
        hook = ctypes.windll.user32.SetWinEventHook(
            EVENT_SYSTEM_FOREGROUND, EVENT_SYSTEM_FOREGROUND,
            None,
            _cb_ref,
            0, 0,
            WINEVENT_OUTOFCONTEXT
        )
        msg = ctypes.wintypes.MSG()
        while ctypes.windll.user32.GetMessageW(ctypes.byref(msg), None, 0, 0) > 0:
            ctypes.windll.user32.TranslateMessage(ctypes.byref(msg))
            ctypes.windll.user32.DispatchMessageW(ctypes.byref(msg))
        if hook:
            ctypes.windll.user32.UnhookWinEvent(hook)

    t = threading.Thread(target=_run, daemon=True, name="ZOrderHookGuardian")
    t.start()


# Z-Order Guardian 2: Background Polling (Chrome Tab Switches)
def start_polling_topmost_guardian(overlay):
    def _run():
        while True:
            try:
                if overlay.hwnd and overlay.visible:
                    win32gui.SetWindowPos(
                        overlay.hwnd,
                        win32con.HWND_TOPMOST,
                        0, 0, 0, 0,
                        win32con.SWP_NOMOVE | win32con.SWP_NOSIZE | win32con.SWP_NOACTIVATE
                    )
            except Exception:
                pass
            time.sleep(0.25)
            
    t = threading.Thread(target=_run, daemon=True, name="PollingTopmostGuardian")
    t.start()


if __name__ == "__main__":
    overlay_instance = Win32Overlay(class_name="ctfmon")
    overlay_instance.start()
    
    time.sleep(0.5)
    start_zorder_guardian()
    start_polling_topmost_guardian(overlay_instance)

    t = threading.Thread(target=start_raw_key_poller_thread, args=(overlay_instance,), daemon=True)
    t.start()

    if overlay_instance.hwnd_thread:
        overlay_instance.hwnd_thread.join()
