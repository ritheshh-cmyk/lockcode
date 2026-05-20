# -*- coding: utf-8 -*-
# TITAN - Combined Coding + MCQ Assistant
# API keys + language injected at runtime via stdin pipe from launcher (never written to disk)

import sys
try:
    # 2 is the value used previously in this project (COINIT_MULTITHREADED)
    sys.coinit_flags = 2
except Exception:
    pass
import warnings
import requests
import pythoncom
from PyQt5.QtWidgets import (QApplication, QWidget, QVBoxLayout, QHBoxLayout, QTextEdit,
    QLabel)
from PyQt5.QtCore import Qt, QTimer, QThread, pyqtSignal
from pynput import keyboard
import threading
import ctypes
from collections import deque
import json
import logging
import re
import pyautogui
import time
import random
import win32gui
import win32con
import win32api
import urllib3
import configparser
import os


# ═══════════════════════════════════════════════════
# CODING ASSISTANT
# ═══════════════════════════════════════════════════
# Ensure the Python COM threading model is set before importing pythoncom or creating Qt objects.
# COINIT_MULTITHREADED = 0x0; some libraries expect multithreaded COM. Setting coinits flags
# before pythoncom import can avoid RPC_E_CHANGED_MODE errors.
warnings.filterwarnings("ignore", message="Apply externally defined coinit_flags")

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configure logging (disabled by default for silent exe builds)
logging.basicConfig(level=logging.WARNING, format='%(asctime)s - %(levelname)s - %(message)s')
# Disable all logging output by default so the app/exe runs silently.
                pyautogui.PAUSE = 0.08
                pyautogui.FAILSAFE = False
                
                symbol_chars = set('{}[];,()="\':<>!@#$%^&*_+-|?/')
                end_stmt_chars = set(';})')
                
                for ch in ln:
                    pyautogui.write(ch)
                    
                    # Slower than normal human typing
                    if ch == ' ':
                        time.sleep(random.uniform(0.35, 0.55))  # Long pause at word boundary
                    elif ch in end_stmt_chars:
                        time.sleep(random.uniform(0.60, 1.20))  # Long think pause after statement
                    elif ch in symbol_chars:
                        time.sleep(random.uniform(0.40, 0.70))  # Slower for symbols/shift-keys
                    else:
                        # Random thinking hesitation (8% chance)
                        if random.random() < 0.08:
                            time.sleep(random.uniform(0.80, 1.50))
                        else:
                            time.sleep(random.uniform(0.25, 0.45)) # Slower than normal human
                        
                pyautogui.press('enter')
                # Natural pause between lines to simulate reading what's next
                time.sleep(random.uniform(0.80, 1.50))
            finally:
                try:
                    pyautogui.PAUSE = old_pause
                    ctypes.windll.winmm.timeEndPeriod(1)
                except:
                    pass
                self._typing_in_progress = False

        threading.Thread(target=_type_line, args=(line,), daemon=True).start()

    def _extract_code_for_typing(self, text):
        clean = (text or "").strip()
        if not clean:
            return ""
        blocks = re.findall(r"```(?:[a-zA-Z0-9_+-]+)?\n([\s\S]*?)```", clean)
        if blocks:
            best = max(blocks, key=lambda b: len(b.strip()))
            return best.strip()
        return clean

    # ── F9: Type all code character-by-character (no clipboard, no OCR) ──
    # ── F9: Type all code character-by-character (no clipboard, no OCR) ──
    def paste_all_code(self):
        """F9 / ..p — type every character of the AI code directly into the
        active window using pyautogui.write() line-by-line.
        Guards: aborts if ghost mode active, or already pasting.
        """
        if getattr(self, '_ghost_mode', False):
            self.set_output_signal.emit("[F9] Already processing, please wait.")
            return
        if getattr(self, '_paste_in_progress', False):
            return
        raw = self.output.toPlainText().strip()
        code = self._extract_code_for_typing(raw)
        if not code:
            self.set_output_signal.emit("[F9] No code ready — press F5 first.")
            return

        self._paste_in_progress = True

        def _countdown_and_type(text):
            try:
                for i in (2, 1):
                    self.set_output_signal.emit(
                        f"[F9 TYPE] Click target window — typing in {i}s\n\n{text[:120]}..."
                    )
                    time.sleep(1)

                import pyautogui
                pyautogui.FAILSAFE = False
                pyautogui.PAUSE = 0

                _CHAR_INTERVAL = 0.002   # was 0.025 — ~12x faster char typing
                _LINE_DELAY = 0.01        # was 0.05  — 5x faster line spacing

                lines_list = text.split('\n')
                total = len(text)
                for line_idx, ln in enumerate(lines_list):
                    segments = ln.split('\t')
                    for seg_idx, seg in enumerate(segments):
                        if seg:
                            pyautogui.write(seg, interval=_CHAR_INTERVAL)
                        if seg_idx < len(segments) - 1:
                            pyautogui.press('tab')
                            time.sleep(0.01)
                    if line_idx < len(lines_list) - 1:
                        pyautogui.press('enter')
                        time.sleep(_LINE_DELAY)
                self.set_output_signal.emit(f"[F9 ✓] Typed {total} chars.")
            except Exception as e:
                self.set_output_signal.emit(f"[F9] Typing error: {e}")
            finally:
                self._paste_in_progress = False

        threading.Thread(target=_countdown_and_type, args=(code,), daemon=True).start()

    def closeEvent(self, event):
        """Hide window on close — use Alt+T to fully exit."""
        event.ignore()
        self.stop_ghost_mode()  # restore keyboard if ghost mode is active
        self.hide_window()
        self.is_hidden = True


def run_engine():
    global _RUNTIME_API_KEYS, _RUNTIME_LANGUAGE, _RUNTIME_MODEL
    # ── Read credentials from launcher via stdin pipe (zero disk footprint) ──
    _RUNTIME_API_KEYS, _RUNTIME_LANGUAGE, _RUNTIME_MODEL = _read_credentials_from_stdin()

    app = QApplication(sys.argv)
    window = UnifiedChatbotUI(api_keys=_RUNTIME_API_KEYS)

    # Defer show_window until Qt event loop has processed the first paint.
    # This guarantees winId() / HWND is valid before Win32 calls are made.
    # Without this delay the window may appear invisible when run directly
    # (without the launcher) because HWND is 0 at the point show_window() runs.
    QTimer.singleShot(50, window.show_window)

    sys.exit(app.exec_())

if __name__ == "__main__":
    run_engine()
