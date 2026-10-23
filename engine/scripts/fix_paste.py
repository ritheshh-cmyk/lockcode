with open("final.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the paste_all_code function range
start_line = None
end_line = None
for i, line in enumerate(lines):
    if "def paste_all_code(self):" in line:
        start_line = i
    if start_line is not None and i > start_line:
        # Find next method def at same indent level
        if line.startswith("    def ") and i > start_line + 2:
            end_line = i
            break

if start_line is None or end_line is None:
    print(f"Could not find paste_all_code: start={start_line}, end={end_line}")
    exit(1)

print(f"Replacing lines {start_line+1} to {end_line} (paste_all_code)")

new_func = '''    # \u2500\u2500 F9: Type all code character-by-character (no clipboard, no OCR) \u2500\u2500
    def paste_all_code(self):
        """F9 / ..p \u2014 type every character of the AI code directly into the
        active window using pyautogui.write() line-by-line.
        Guards: aborts if ghost mode active, or already pasting.
        """
        if getattr(self, '_ghost_mode', False):
            self.set_output_signal.emit("[F9] Stop Ghost mode first (F8 / ..s).")
            return
        if getattr(self, '_paste_in_progress', False):
            return
        raw = self.output.toPlainText().strip()
        code = self._extract_code_for_typing(raw)
        if not code:
            self.set_output_signal.emit("[F9] No code ready \u2014 press F5 first.")
            return

        self._paste_in_progress = True

        def _countdown_and_type(text):
            try:
                for i in (2, 1):
                    self.set_output_signal.emit(
                        f"[F9 TYPE] Click target window \u2014 typing in {i}s\\n\\n{text[:120]}..."
                    )
                    time.sleep(1)

                import pyautogui
                pyautogui.FAILSAFE = False
                pyautogui.PAUSE = 0

                _CHAR_INTERVAL = 0.025
                _LINE_DELAY = 0.05

                lines_list = text.split('\\n')
                total = len(text)
                for line_idx, ln in enumerate(lines_list):
                    segments = ln.split('\\t')
                    for seg_idx, seg in enumerate(segments):
                        if seg:
                            pyautogui.write(seg, interval=_CHAR_INTERVAL)
                        if seg_idx < len(segments) - 1:
                            pyautogui.press('tab')
                            time.sleep(0.01)
                    if line_idx < len(lines_list) - 1:
                        pyautogui.press('enter')
                        time.sleep(_LINE_DELAY)
                self.set_output_signal.emit(f"[F9 \u2713] Typed {total} chars.")
            except Exception as e:
                self.set_output_signal.emit(f"[F9] Typing error: {e}")
            finally:
                self._paste_in_progress = False

        threading.Thread(target=_countdown_and_type, args=(code,), daemon=True).start()

'''

# Replace the old function
new_lines = lines[:start_line] + [new_func] + lines[end_line:]

with open("final.py", "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print(f"paste_all_code replaced successfully (was lines {start_line+1}-{end_line})")
