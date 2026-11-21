# -*- coding: utf-8 -*-
"""
apply_safeguards.py — Comprehensive crash-proofing for TITAN Headed and Headless
"""
import os
import re

HEADED_FINAL = r"C:\Users\rithesh\Desktop\lockcodeheaded\lockcode\final.py"
HEADLESS_FINAL = r"C:\Users\rithesh\Downloads\lockcode\final.py"

def patch_headed():
    if not os.path.exists(HEADED_FINAL):
        print(f"Skipping {HEADED_FINAL} (not found)")
        return

    with open(HEADED_FINAL, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Add global exception handlers if not present
    if "_global_safeguard_excepthook" not in content:
        hook_code = '''
# ── Global Crash Safeguard Hook ──
def _global_safeguard_excepthook(exctype, value, tb):
    try:
        import traceback
        err = "".join(traceback.format_exception(exctype, value, tb))
        logging.critical(f"[SAFEGUARD CAUGHT EXCEPTION]: {err}")
    except Exception:
        pass

sys.excepthook = _global_safeguard_excepthook
if hasattr(threading, 'excepthook'):
    threading.excepthook = lambda args: _global_safeguard_excepthook(args.exc_type, args.exc_value, args.exc_traceback)
'''
        # Insert after imports
        content = re.sub(r'(from PyQt5\.QtCore import Qt[^\n]*\n)', r'\1' + hook_code, content, count=1)
        print("Added global exception hook")

    # 2. Add hwnd property and thread tracking in UnifiedChatbotUI
    if "@property\n    def hwnd(self):" not in content:
        prop_code = '''
    @property
    def hwnd(self):
        try:
            return getattr(self, '_zorder_hwnd_cache', 0) or int(self.winId())
        except Exception:
            return 0

    def _track_thread(self, th):
        if th:
            if not hasattr(self, '_thread_pool'):
                self._thread_pool = set()
            self._thread_pool.add(th)
            try:
                th.finished.connect(lambda: self._thread_pool.discard(th))
            except Exception:
                pass
'''
        content = content.replace("class UnifiedChatbotUI(QWidget):", "class UnifiedChatbotUI(QWidget):" + prop_code)
        print("Added hwnd property and thread tracking to UnifiedChatbotUI")

    # 3. Replace capture_for_code and MCQ methods with hardened implementations
    old_methods_target = """    # ── CODING MODE (F5) ──
    def capture_for_code(self):
        \"\"\"Run silently — never pops the HUD. Results stored internally.
        Double-trigger guard: if already processing, ignore the second press.
        \"\"\"
        if getattr(self, '_processing', False):
            return
        self._processing = True
        self.mode = 'code'

        fg = win32gui.GetForegroundWindow()
        if fg and fg != self.hwnd and win32gui.IsWindow(fg) and not win32gui.IsIconic(fg):
            target_hwnd = fg
            self._last_target_hwnd = fg
        elif self._last_target_hwnd and win32gui.IsWindow(self._last_target_hwnd):
            target_hwnd = self._last_target_hwnd
        else:
            target_hwnd = 0

        self._ensure_topmost_if_visible()
        self.output.setText("1/3 🔍 Capturing screen for Code AI...")
        self.extract_thread = CodeExtractThread(target_hwnd)
        self.extract_thread.finished.connect(self.extract_done_signal.emit, Qt.QueuedConnection)
        self.extract_thread.error.connect(self.extract_error_signal.emit, Qt.QueuedConnection)
        self.extract_thread.start()

    # ── MCQ MODE (Alt+Y) ──
    def capture_for_mcq(self):
        \"\"\"Run silently — never pops the HUD. 4-Option MCQ mode.\"\"\"
        self._capture_mcq_with_count(4)

    def capture_for_mcq5(self):
        \"\"\"Run silently — never pops the HUD. 5-Option MCQ mode.\"\"\"
        self._capture_mcq_with_count(5)

    def _capture_mcq_with_count(self, count: int = 4):
        if getattr(self, '_processing', False):
            return
        self._processing = True
        self.mode = 'mcq'
        self.options_count = count

        fg = win32gui.GetForegroundWindow()
        if fg and fg != self.hwnd and win32gui.IsWindow(fg) and not win32gui.IsIconic(fg):
            target_hwnd = fg
            self._last_target_hwnd = fg
        elif self._last_target_hwnd and win32gui.IsWindow(self._last_target_hwnd):
            target_hwnd = self._last_target_hwnd
        else:
            target_hwnd = 0

        self._ensure_topmost_if_visible()
        self.output.setText(f"1/3 🔍 Capturing screen for MCQ AI ({count} options)...")
        self.extract_thread = McqExtractThread(target_hwnd)
        self.extract_thread.finished.connect(self.extract_done_signal.emit, Qt.QueuedConnection)
        self.extract_thread.error.connect(self.extract_error_signal.emit, Qt.QueuedConnection)
        self.extract_thread.start()"""

    new_methods_replacement = """    # ── CODING MODE (F5) ──
    def capture_for_code(self):
        try:
            if getattr(self, '_processing', False):
                return
            self._processing = True
            self.mode = 'code'

            our_hwnd = getattr(self, '_zorder_hwnd_cache', 0)
            if not our_hwnd:
                try:
                    our_hwnd = int(self.winId())
                except Exception:
                    our_hwnd = 0

            target_hwnd = 0
            try:
                fg = win32gui.GetForegroundWindow()
                if fg and fg != our_hwnd and win32gui.IsWindow(fg) and not win32gui.IsIconic(fg):
                    target_hwnd = fg
                    self._last_target_hwnd = fg
                elif self._last_target_hwnd and win32gui.IsWindow(self._last_target_hwnd):
                    target_hwnd = self._last_target_hwnd
            except Exception:
                pass

            self._ensure_topmost_if_visible()
            self.output.setText("1/3 🔍 Capturing screen for Code AI...")
            self.extract_thread = CodeExtractThread(target_hwnd)
            self._track_thread(self.extract_thread)
            self.extract_thread.finished.connect(self.extract_done_signal.emit, Qt.QueuedConnection)
            self.extract_thread.error.connect(self.extract_error_signal.emit, Qt.QueuedConnection)
            self.extract_thread.start()
        except Exception as exc:
            self._processing = False
            try:
                self.output.setText(f"⚠ Code capture trigger error: {exc}")
            except Exception:
                pass

    # ── MCQ MODE (Alt+Y) ──
    def capture_for_mcq(self):
        try:
            self._capture_mcq_with_count(4)
        except Exception as exc:
            self._processing = False
            try:
                self.output.setText(f"⚠ MCQ trigger error: {exc}")
            except Exception:
                pass

    def capture_for_mcq5(self):
        try:
            self._capture_mcq_with_count(5)
        except Exception as exc:
            self._processing = False
            try:
                self.output.setText(f"⚠ MCQ5 trigger error: {exc}")
            except Exception:
                pass

    def _capture_mcq_with_count(self, count: int = 4):
        try:
            if getattr(self, '_processing', False):
                return
            self._processing = True
            self.mode = 'mcq'
            self.options_count = count

            our_hwnd = getattr(self, '_zorder_hwnd_cache', 0)
            if not our_hwnd:
                try:
                    our_hwnd = int(self.winId())
                except Exception:
                    our_hwnd = 0

            target_hwnd = 0
            try:
                fg = win32gui.GetForegroundWindow()
                if fg and fg != our_hwnd and win32gui.IsWindow(fg) and not win32gui.IsIconic(fg):
                    target_hwnd = fg
                    self._last_target_hwnd = fg
                elif self._last_target_hwnd and win32gui.IsWindow(self._last_target_hwnd):
                    target_hwnd = self._last_target_hwnd
            except Exception:
                pass

            self._ensure_topmost_if_visible()
            self.output.setText(f"1/3 🔍 Capturing screen for MCQ AI ({count} options)...")
            self.extract_thread = McqExtractThread(target_hwnd)
            self._track_thread(self.extract_thread)
            self.extract_thread.finished.connect(self.extract_done_signal.emit, Qt.QueuedConnection)
            self.extract_thread.error.connect(self.extract_error_signal.emit, Qt.QueuedConnection)
            self.extract_thread.start()
        except Exception as exc:
            self._processing = False
            try:
                self.output.setText(f"⚠ MCQ capture trigger error: {exc}")
            except Exception:
                pass"""

    if old_methods_target in content:
        content = content.replace(old_methods_target, new_methods_replacement)
        print("Replaced capture methods with hardened versions")
    else:
        print("Could not find exact old capture methods, searching alternative pattern...")
        # fallback regex replace
        content = re.sub(
            r'def capture_for_code\(self\):[\s\S]*?self\.extract_thread\.start\(\)',
            new_methods_replacement.split('# ── MCQ MODE')[0].strip(),
            content
        )
        content = re.sub(
            r'def capture_for_mcq\(self\):[\s\S]*?self\.extract_thread\.start\(\)',
            'def capture_for_mcq' + new_methods_replacement.split('def capture_for_mcq')[1].strip(),
            content
        )

    # 4. In _on_capture_done, add track_thread and safety
    old_on_capture_done = """        if self.mode == 'code':
            self.worker = CodeChatbotThread(text_to_send, self.api_keys)
            self.worker.response_ready.connect(self.handle_response_signal.emit, Qt.QueuedConnection)
            self.worker.error_occurred.connect(self.handle_error_signal.emit, Qt.QueuedConnection)
        else:
            opts_count = getattr(self, 'options_count', 4)
            self.worker = McqChatbotThread(text_to_send, self.api_keys, options_count=opts_count)
            self.worker.response_ready.connect(self.handle_mcq_response_signal.emit, Qt.QueuedConnection)
            self.worker.option_ready.connect(self.handle_mcq_option_signal.emit, Qt.QueuedConnection)
            self.worker.error_occurred.connect(self.handle_error_signal.emit, Qt.QueuedConnection)

        self.worker.start()"""

    new_on_capture_done = """        if self.mode == 'code':
            self.worker = CodeChatbotThread(text_to_send, self.api_keys)
            self._track_thread(self.worker)
            self.worker.response_ready.connect(self.handle_response_signal.emit, Qt.QueuedConnection)
            self.worker.error_occurred.connect(self.handle_error_signal.emit, Qt.QueuedConnection)
        else:
            opts_count = getattr(self, 'options_count', 4)
            self.worker = McqChatbotThread(text_to_send, self.api_keys, options_count=opts_count)
            self._track_thread(self.worker)
            self.worker.response_ready.connect(self.handle_mcq_response_signal.emit, Qt.QueuedConnection)
            self.worker.option_ready.connect(self.handle_mcq_option_signal.emit, Qt.QueuedConnection)
            self.worker.error_occurred.connect(self.handle_error_signal.emit, Qt.QueuedConnection)

        self.worker.start()"""

    if old_on_capture_done in content:
        content = content.replace(old_on_capture_done, new_on_capture_done)
        print("Added _track_thread to _on_capture_done")

    with open(HEADED_FINAL, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Headed final.py patched successfully ({len(content)} bytes).")

    # Sync to titan_engine.pyx in headed root
    pyx_path = os.path.join(os.path.dirname(HEADED_FINAL), "titan_engine.pyx")
    with open(pyx_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Synced headed final.py -> titan_engine.pyx")

def patch_headless():
    if not os.path.exists(HEADLESS_FINAL):
        return

    with open(HEADLESS_FINAL, "r", encoding="utf-8") as f:
        content = f.read()

    # In headless, ensure self.hwnd is always 0 and safe
    if "self.hwnd = 0" not in content:
        content = content.replace("class UnifiedChatbotUI:", "class UnifiedChatbotUI:\n    hwnd = 0\n")

    with open(HEADLESS_FINAL, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Headless final.py verified ({len(content)} bytes).")

    # Sync to titan_engine.pyx in headless root
    pyx_path = os.path.join(os.path.dirname(HEADLESS_FINAL), "titan_engine.pyx")
    with open(pyx_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Synced headless final.py -> titan_engine.pyx")

if __name__ == "__main__":
    patch_headed()
    patch_headless()
