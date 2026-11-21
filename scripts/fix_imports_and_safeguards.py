# -*- coding: utf-8 -*-
import os
import re

HEADED_FINAL = r"C:\Users\rithesh\Desktop\lockcodeheaded\lockcode\final.py"

def fix():
    with open(HEADED_FINAL, "r", encoding="utf-8") as f:
        content = f.read()

    # Match the entire block from # ── Global Crash Safeguard Hook ── down to os
    pattern = r'# ── Global Crash Safeguard Hook ──[\s\S]*?import os\s*\n'
    
    clean_replacement = '''import threading
import logging
import traceback
import ctypes
from collections import deque
import json
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
from pynput import keyboard

# ── Global Crash Safeguard Hook ──
def _global_safeguard_excepthook(exctype, value, tb):
    try:
        err = "".join(traceback.format_exception(exctype, value, tb))
        logging.critical(f"[SAFEGUARD CAUGHT EXCEPTION]: {err}")
    except Exception:
        pass

sys.excepthook = _global_safeguard_excepthook
if hasattr(threading, 'excepthook'):
    threading.excepthook = lambda args: _global_safeguard_excepthook(args.exc_type, args.exc_value, args.exc_traceback)
'''

    new_content = re.sub(pattern, clean_replacement, content, count=1)
    if new_content != content:
        with open(HEADED_FINAL, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("Updated headed final.py successfully.")
    else:
        print("Pattern did not match in headed final.py")

if __name__ == "__main__":
    fix()
