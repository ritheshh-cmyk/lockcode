import re

with open("final.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update extract_window_text_from_foreground
new_extract = """def extract_window_text_from_foreground() -> str:
    \"\"\"
    Extract visible text from the current foreground window.
    Uses WM_GETTEXT + EnumChildWindows. If blocked by anti-cheat,
    falls back to simulating Ctrl+A -> Ctrl+C.
    \"\"\"
    try:
        import win32gui
        hwnd = win32gui.GetForegroundWindow()
        if not hwnd:
            return ""
            
        texts = _win32_collect_texts(hwnd, min_len=2)
        text = "\\n".join(texts).strip()
        
        if len(text) > 10:
            return text
            
        # Fallback: Ctrl+A, Ctrl+C (Universal stealth fallback)
        import pyperclip
        import pyautogui
        import time
        
        old_cb = ""
        try:
            old_cb = pyperclip.paste()
        except:
            pass
            
        pyautogui.hotkey('ctrl', 'a')
        time.sleep(0.05)
        pyautogui.hotkey('ctrl', 'c')
        time.sleep(0.1)
        # unselect
        pyautogui.press('right')
        
        new_cb = pyperclip.paste()
        
        if old_cb:
            try:
                pyperclip.copy(old_cb)
            except:
                pass
                
        if new_cb and new_cb.strip() and new_cb != old_cb:
            return new_cb.strip()
            
        return text
    except Exception as e:
        return f"Error: {e}"
"""
content = re.sub(
    r'def extract_window_text_from_foreground\(\) -> str:.*?except Exception as e:\s*return f"Error: \{e\}"',
    new_extract,
    content,
    flags=re.DOTALL
)

# 2. Add raw key poller thread and remove F-keys from pynput listener
raw_poller = """    def _raw_key_poller_thread(self):
        import ctypes
        import time
        
        VK_F2 = 0x71
        VK_F3 = 0x72
        VK_F5 = 0x74
        VK_F6 = 0x75
        VK_F7 = 0x76
        VK_F8 = 0x77
        VK_F9 = 0x78
        VK_MENU = 0x12
        VK_Y = 0x59
        VK_T = 0x54
        
        state = {VK_F2: False, VK_F3: False, VK_F5: False, VK_F6: False,
                 VK_F7: False, VK_F8: False, VK_F9: False, VK_Y: False, VK_T: False}
        
        def is_pressed(vk):
            return (ctypes.windll.user32.GetAsyncKeyState(vk) & 0x8000) != 0

        while True:
            try:
                alt_down = is_pressed(VK_MENU)
                for vk in list(state.keys()):
                    pressed = is_pressed(vk)
                    if pressed and not state[vk]:
                        state[vk] = True
                        if vk == VK_F2: self.trigger_hide_signal.emit()
                        elif vk == VK_F3:
                            self.trigger_stealth_signal.emit()
                            self.flash_key_hint_signal.emit("F3 Stealth")
                        elif vk == VK_F5:
                            self.trigger_code_signal.emit()
                            self.flash_key_hint_signal.emit("F5 Code")
                        elif vk == VK_F6:
                            self.trigger_line_signal.emit()
                            self.flash_key_hint_signal.emit("F6 Line")
                        elif vk == VK_F7:
                            self.trigger_ghost_on_signal.emit()
                            self.flash_key_hint_signal.emit("F7 Ghost")
                        elif vk == VK_F8:
                            self.trigger_ghost_stop_signal.emit()
                            self.flash_key_hint_signal.emit("F8 Stop")
                        elif vk == VK_F9:
                            self.trigger_paste_signal.emit()
                            self.flash_key_hint_signal.emit("F9 Paste")
                        elif vk == VK_Y and alt_down:
                            self.trigger_mcq_signal.emit()
                            self.flash_key_hint_signal.emit("Alt+Y MCQ")
                        elif vk == VK_T and alt_down:
                            self.trigger_quit_signal.emit()
                    elif not pressed and state[vk]:
                        state[vk] = False
            except Exception:
                pass
            time.sleep(0.02)

    def start_global_key_listener(self):"""

content = content.replace("    def start_global_key_listener(self):", raw_poller)

# Add threading start
thread_start = """        import threading
        t = threading.Thread(target=self._raw_key_poller_thread, daemon=True, name="RawKeyPoller")
        t.start()
        
        self.alt_pressed = False"""
content = content.replace("        self.alt_pressed = False", thread_start, 1)

# Remove F-keys from on_press
on_press_old = """            try:
                if key == keyboard.Key.f2:
                    self.trigger_hide_signal.emit()
                    return
                elif key == keyboard.Key.f3:
                    self.trigger_stealth_signal.emit()
                    self.flash_key_hint_signal.emit("F3 Stealth")
                    return
                elif key == keyboard.Key.f5:
                    self.trigger_code_signal.emit()
                    self.flash_key_hint_signal.emit("F5 Code")
                    return
                elif key == keyboard.Key.f6:
                    self.trigger_line_signal.emit()
                    self.flash_key_hint_signal.emit("F6 Line")
                    return
                elif key == keyboard.Key.f7:
                    self.trigger_ghost_on_signal.emit()
                    self.flash_key_hint_signal.emit("F7 Ghost")
                    return
                elif key == keyboard.Key.f8:
                    self.trigger_ghost_stop_signal.emit()
                    self.flash_key_hint_signal.emit("F8 Stop")
                    return
                elif key == keyboard.Key.f9:
                    self.trigger_paste_signal.emit()
                    self.flash_key_hint_signal.emit("F9 Paste")
                    return
                elif key == keyboard.Key.alt_l or key == keyboard.Key.alt_r:
                    self.alt_pressed = True
                    return
                elif hasattr(key, 'char') and key.char and key.char.lower() == 'y' and self.alt_pressed:
                    self.trigger_mcq_signal.emit()
                    self.flash_key_hint_signal.emit("Alt+Y MCQ")
                    return
                elif hasattr(key, 'char') and key.char and key.char.lower() == 't' and self.alt_pressed:
                    self.trigger_quit_signal.emit()
                    return
            except AttributeError:
                pass"""

on_press_new = """            try:
                pass # Handled by _raw_key_poller_thread
            except AttributeError:
                pass"""

content = content.replace(on_press_old, on_press_new)

# Fix _ensure_topmost_if_visible to NOT show the window if it's hidden during the process.
ensure_top_old = """    def _ensure_topmost_if_visible(self):
        if getattr(self, 'is_hidden', False):
            return
        self.show_window()"""

ensure_top_new = """    def _ensure_topmost_if_visible(self, force_show=False):
        if getattr(self, 'is_hidden', False) and not force_show:
            return
        self.show_window()"""

content = content.replace(ensure_top_old, ensure_top_new)

# Fix _handle_code_response and _handle_mcq_response to POPUP
content = content.replace("self._ensure_topmost_if_visible()", "self._ensure_topmost_if_visible(force_show=True)") 

with open("final.py", "w", encoding="utf-8") as f:
    f.write(content)
