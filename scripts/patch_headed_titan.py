import os

# 1. Patch text_extractor.py in both places
text_extractor_paths = [
    os.path.abspath("text_extractor.py"),
    r"C:\Users\rithesh\Desktop\lockcodeheaded\lockcode\text_extractor.py"
]

for te_path in text_extractor_paths:
    if not os.path.exists(te_path):
        continue
    with open(te_path, "r", encoding="utf-8") as f:
        te_code = f.read()

    is_crlf = "\r\n" in te_code
    norm_te = te_code.replace("\r\n", "\n")

    old_msaa_retry = '''            if not docs:
                for backoff in (0.06, 0.12, 0.18):
                    time.sleep(backoff)
                    docs = _find_content_nodes(pAcc)
                    if docs:
                        break'''

    new_msaa_retry = '''            if not docs:
                for backoff in (0.06, 0.12, 0.18):
                    time.sleep(backoff)
                    try:
                        pAccNew = ctypes.POINTER(_IAccessible)()
                        if ctypes.windll.oleacc.AccessibleObjectFromWindow(
                            hwnd, OBJID_CLIENT, ctypes.byref(_IAccessible._iid_), ctypes.byref(pAccNew)
                        ) == 0 and pAccNew:
                            pAcc = pAccNew
                    except Exception:
                        pass
                    docs = _find_content_nodes(pAcc)
                    if docs:
                        break'''

    if old_msaa_retry in norm_te:
        norm_te = norm_te.replace(old_msaa_retry, new_msaa_retry)
        print(f"Patched Chromium retry in {te_path}")

    # Standardize regex to [.,]*$
    norm_te = norm_te.replace(r"^AQ\.[A-Za-z0-9_-]+[.,]?$", r"^AQ\.[A-Za-z0-9_-]+[.,]*$")

    out_te = norm_te.replace("\n", "\r\n") if is_crlf else norm_te
    with open(te_path, "w", encoding="utf-8") as f:
        f.write(out_te)
    print(f"Updated {te_path}")

# 2. Patch headed final.py and titan_engine.pyx
headed_targets = [
    r"C:\Users\rithesh\Desktop\lockcodeheaded\lockcode\final.py",
    r"C:\Users\rithesh\Desktop\lockcodeheaded\lockcode\titan_engine.pyx",
]

for target in headed_targets:
    if not os.path.exists(target):
        continue
    with open(target, "r", encoding="utf-8") as f:
        content = f.read()

    is_crlf = "\r\n" in content
    norm = content.replace("\r\n", "\n")

    # Add trigger_stop_ghost_signal definition
    old_signals = '''    trigger_quit_signal = pyqtSignal()
    flash_key_hint_signal = pyqtSignal(str)'''

    new_signals = '''    trigger_quit_signal = pyqtSignal()
    flash_key_hint_signal = pyqtSignal(str)
    trigger_stop_ghost_signal = pyqtSignal()'''

    if old_signals in norm and "trigger_stop_ghost_signal" not in norm:
        norm = norm.replace(old_signals, new_signals)
        print(f"Added trigger_stop_ghost_signal in {target}")

    # Enforce Qt.QueuedConnection across ALL trigger signal connections in setup_ui / __init__
    old_connections = '''        self.window_text_ready.connect(self._on_window_text)
        self.set_output_signal.connect(self.output.setText)
        self.handle_response_signal.connect(self._handle_code_response)
        self.handle_error_signal.connect(self._handle_error)

        # Thread-safe queued connections for worker thread events to main GUI thread
        from PyQt5.QtCore import Qt
        self.extract_done_signal.connect(self._on_capture_done, Qt.QueuedConnection)
        self.extract_error_signal.connect(self._on_extract_error, Qt.QueuedConnection)
        self.handle_mcq_response_signal.connect(self._handle_mcq_response, Qt.QueuedConnection)
        self.handle_mcq_option_signal.connect(self._move_cursor, Qt.QueuedConnection)

        # Connect trigger signals to their handlers
        self.trigger_code_signal.connect(self.capture_for_code)
        self.trigger_mcq_signal.connect(self.capture_for_mcq)
        self.trigger_mcq5_signal.connect(self.capture_for_mcq5)
        self.trigger_line_signal.connect(self.type_next_line)
        self.trigger_paste_signal.connect(self.paste_all_code)
        self.trigger_hide_signal.connect(self.toggle_visibility)
        self.trigger_stealth_signal.connect(self.toggle_stealth_mode)
        self.trigger_quit_signal.connect(self._quit_app)
        self.flash_key_hint_signal.connect(self._flash_key_hint)'''

    new_connections = '''        from PyQt5.QtCore import Qt
        self.window_text_ready.connect(self._on_window_text, Qt.QueuedConnection)
        self.set_output_signal.connect(self.output.setText, Qt.QueuedConnection)
        self.handle_response_signal.connect(self._handle_code_response, Qt.QueuedConnection)
        self.handle_error_signal.connect(self._handle_error, Qt.QueuedConnection)

        # Thread-safe queued connections for worker thread events to main GUI thread
        self.extract_done_signal.connect(self._on_capture_done, Qt.QueuedConnection)
        self.extract_error_signal.connect(self._on_extract_error, Qt.QueuedConnection)
        self.handle_mcq_response_signal.connect(self._handle_mcq_response, Qt.QueuedConnection)
        self.handle_mcq_option_signal.connect(self._move_cursor, Qt.QueuedConnection)

        # Connect trigger signals to their handlers with strict Qt.QueuedConnection to eliminate 0xc0000409 aborts
        self.trigger_code_signal.connect(self.capture_for_code, Qt.QueuedConnection)
        self.trigger_mcq_signal.connect(self.capture_for_mcq, Qt.QueuedConnection)
        self.trigger_mcq5_signal.connect(self.capture_for_mcq5, Qt.QueuedConnection)
        self.trigger_line_signal.connect(self.type_next_line, Qt.QueuedConnection)
        self.trigger_paste_signal.connect(self.paste_all_code, Qt.QueuedConnection)
        self.trigger_hide_signal.connect(self.toggle_visibility, Qt.QueuedConnection)
        self.trigger_stealth_signal.connect(self.toggle_stealth_mode, Qt.QueuedConnection)
        self.trigger_quit_signal.connect(self._quit_app, Qt.QueuedConnection)
        self.flash_key_hint_signal.connect(self._flash_key_hint, Qt.QueuedConnection)
        self.trigger_stop_ghost_signal.connect(self.stop_ghost_mode, Qt.QueuedConnection)'''

    if old_connections in norm:
        norm = norm.replace(old_connections, new_connections)
        print(f"Patched signal connections with Qt.QueuedConnection in {target}")

    # Patch worker and extract thread connections in capture_for_code and _capture_mcq_with_count
    norm = norm.replace(
        "self.extract_thread.finished.connect(self.extract_done_signal.emit)",
        "self.extract_thread.finished.connect(self.extract_done_signal.emit, Qt.QueuedConnection)"
    )
    norm = norm.replace(
        "self.extract_thread.error.connect(self.extract_error_signal.emit)",
        "self.extract_thread.error.connect(self.extract_error_signal.emit, Qt.QueuedConnection)"
    )
    norm = norm.replace(
        "self.worker.response_ready.connect(self.handle_response_signal.emit)",
        "self.worker.response_ready.connect(self.handle_response_signal.emit, Qt.QueuedConnection)"
    )
    norm = norm.replace(
        "self.worker.error_occurred.connect(self.handle_error_signal.emit)",
        "self.worker.error_occurred.connect(self.handle_error_signal.emit, Qt.QueuedConnection)"
    )
    norm = norm.replace(
        "self.worker.response_ready.connect(self.handle_mcq_response_signal.emit)",
        "self.worker.response_ready.connect(self.handle_mcq_response_signal.emit, Qt.QueuedConnection)"
    )
    norm = norm.replace(
        "self.worker.option_ready.connect(self.handle_mcq_option_signal.emit)",
        "self.worker.option_ready.connect(self.handle_mcq_option_signal.emit, Qt.QueuedConnection)"
    )

    # Patch ghost mode QTimer.singleShot from non-Qt thread
    norm = norm.replace(
        "QTimer.singleShot(0, self.stop_ghost_mode)",
        "self.trigger_stop_ghost_signal.emit()"
    )

    # Patch null bytes in _quit_app
    norm = norm.replace(
        '_RUNTIME_API_KEYS[i] = "\\x00" * 64',
        '_RUNTIME_API_KEYS[i] = " " * 64'
    )

    out_content = norm.replace("\n", "\r\n") if is_crlf else norm
    with open(target, "w", encoding="utf-8") as f:
        f.write(out_content)
    print(f"Updated {target}")

print("All headed Titan patches applied successfully!")
