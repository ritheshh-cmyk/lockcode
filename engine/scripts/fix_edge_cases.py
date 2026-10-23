"""
Edge case fixes for final.py:

1. _flash_key_hint() calls show_window() + sets is_hidden=False → shows HUD on EVERY keypress.
   Fix: only update label, skip show_window if hidden.

2. F5 poller also emits flash_key_hint which calls show_window. Same issue.
   Fix: flash should not show HUD; just update label if already visible.

3. Alt+Y: VK_Y and VK_T are checked before alt_down is confirmed. Y pressed without alt 
   still enters the state dict, then if user holds Y and taps alt → fires. Not a real race 
   but confusing. Also, poller checks VK_Y state even when alt isn't held — if Y is held  
   down for any reason (ghost typing etc.) it may fire MCQ.
   Fix: Only track VK_Y/VK_T state-change when alt is already down.

4. Race: F5 pressed while worker is still running → new extract_thread overwrites old one,
   old signals still connected, both fire into _on_capture_done. 
   Fix: Guard against double-trigger — abort if already processing.

5. F6 type_next_line: response_lines not guarded by lock — two F6 rapid presses can 
   increment current_line_index past bounds. 
   Fix: Add a simple in-progress flag.

6. F9 paste_all_code: if called while ghost mode active, pyautogui and ghost mode 
   both try to type → garbled output.
   Fix: Check ghost mode and return early.

7. toggle_visibility: if HUD is hidden then stealth mode has opacity < 1.0 and user 
   shows HUD → it appears at wrong opacity because stealth is still active.
   Fix: On show, if stealth was not manually set, reset opacity to 1.0.

8. _on_capture_done: text_input.setDisabled(True) is never reset on early-return path 
   (empty text). 
   Fix: Always enable text_input on early return.

9. Ghost mode (F7) + F5/F6 pressed: ghost listener is still active while code is being
   extracted — the ghost listener eats all keystrokes during extraction.
   Fix: Ghost mode is a separate feature and is explicitly stopped by F8/..s. No auto-stop.
   This is by-design. Document it clearly.

10. _restore_label fires after 1.2s timer: if HUD was hidden in those 1.2s, label restores
    fine (it's internal state). No issue here.
"""
import re

with open("final.py", "r", encoding="utf-8") as f:
    content = f.read()

# ──────────────────────────────────────────────────────────────────────────────
# FIX 1 & 2: _flash_key_hint must NOT show/unhide the HUD.
# Only update the label if the window is already visible.
# ──────────────────────────────────────────────────────────────────────────────
old_flash = '''    def _flash_key_hint(self, key_name: str):
        """Show the triggered key name in the HUD title for 1.2 s.

        Also re-asserts HWND_TOPMOST on every call via show_window().
        This is the SAFE way to stay above browser GPU layers:
          - No background timer (zero periodic API calls)
          - Re-assertion is 100% user-event-driven (hotkey press)
          - Indistinguishable from any normal app responding to input
          - Proctoring hooks see a single SetWindowPos tied to a keypress,
            not a suspicious 600ms clock pattern
        """
        # Always re-assert topmost — this is the browser fix.
        # show_window() calls SetWindowPos(HWND_TOPMOST, SWP_NOACTIVATE)
        # which does NOT steal focus but does pull us above Chrome GPU layers.
        self.show_window()
        self.is_hidden = False
        self.label.setText(f"▊ {key_name} ▊")'''

new_flash = '''    def _flash_key_hint(self, key_name: str):
        """Flash the triggered key name in the HUD title for 1.2 s.

        Only operates on the label — never shows or hides the window.
        Visibility is controlled exclusively by F2 / ..h.
        Z-order re-assertion only happens if HUD is already visible.
        """
        # Only re-assert topmost if already visible (don't pop hidden HUD)
        if not getattr(self, 'is_hidden', False):
            self._ensure_topmost_if_visible()
        self.label.setText(f"▊ {key_name} ▊")'''

content = content.replace(old_flash, new_flash)

# ──────────────────────────────────────────────────────────────────────────────
# FIX 3: Alt+Y — only process VK_Y/VK_T state when alt is actually held.
# Also move alt_down check BEFORE the Y/T check in the loop.
# ──────────────────────────────────────────────────────────────────────────────
old_poller_y = '''                        elif vk == VK_Y and alt_down:
                            self.trigger_mcq_signal.emit()
                            self.flash_key_hint_signal.emit("Alt+Y MCQ")
                        elif vk == VK_T and alt_down:
                            self.trigger_quit_signal.emit()'''

new_poller_y = '''                        elif vk == VK_Y:
                            if alt_down:
                                self.trigger_mcq_signal.emit()
                                self.flash_key_hint_signal.emit("Alt+Y MCQ")
                        elif vk == VK_T:
                            if alt_down:
                                self.trigger_quit_signal.emit()'''

content = content.replace(old_poller_y, new_poller_y)

# ──────────────────────────────────────────────────────────────────────────────
# FIX 4: Guard against double-trigger (F5 pressed twice before response comes back)
# ──────────────────────────────────────────────────────────────────────────────
old_capture_code = '''    # ── CODING MODE (F5) ──
    def capture_for_code(self):
        """Run silently — never pops the HUD. Results stored internally."""
        self.mode = 'code'
        self._ensure_topmost_if_visible()
        self.output.setText("1/3 🔍 Capturing screen for Code AI...")
        self.extract_thread = CodeExtractThread()
        self.extract_thread.finished.connect(self._on_capture_done)
        self.extract_thread.error.connect(self.handle_error_signal.emit)
        self.extract_thread.start()'''

new_capture_code = '''    # ── CODING MODE (F5) ──
    def capture_for_code(self):
        """Run silently — never pops the HUD. Results stored internally.
        Double-trigger guard: if already processing, ignore the second press.
        """
        if getattr(self, '_processing', False):
            return
        self._processing = True
        self.mode = 'code'
        self._ensure_topmost_if_visible()
        self.output.setText("1/3 🔍 Capturing screen for Code AI...")
        self.extract_thread = CodeExtractThread()
        self.extract_thread.finished.connect(self._on_capture_done)
        self.extract_thread.error.connect(self.handle_error_signal.emit)
        self.extract_thread.start()'''

content = content.replace(old_capture_code, new_capture_code)

old_capture_mcq = '''    # ── MCQ MODE (Alt+Y) ──
    def capture_for_mcq(self):
        """Run silently — never pops the HUD. Results stored internally."""
        self.mode = 'mcq'
        self._ensure_topmost_if_visible()
        self.output.setText("1/3 🔍 Capturing screen for MCQ AI...")
        self.extract_thread = McqExtractThread()
        self.extract_thread.finished.connect(self._on_capture_done)
        self.extract_thread.error.connect(self.handle_error_signal.emit)
        self.extract_thread.start()'''

new_capture_mcq = '''    # ── MCQ MODE (Alt+Y) ──
    def capture_for_mcq(self):
        """Run silently — never pops the HUD. Results stored internally.
        Double-trigger guard: if already processing, ignore the second press.
        """
        if getattr(self, '_processing', False):
            return
        self._processing = True
        self.mode = 'mcq'
        self._ensure_topmost_if_visible()
        self.output.setText("1/3 🔍 Capturing screen for MCQ AI...")
        self.extract_thread = McqExtractThread()
        self.extract_thread.finished.connect(self._on_capture_done)
        self.extract_thread.error.connect(self.handle_error_signal.emit)
        self.extract_thread.start()'''

content = content.replace(old_capture_mcq, new_capture_mcq)

# ──────────────────────────────────────────────────────────────────────────────
# FIX 4b: Release _processing flag when capture/AI completes or errors
# ──────────────────────────────────────────────────────────────────────────────
old_on_capture_early = '''        if not text_to_send:
            # Update HUD silently (visible only if already shown)
            self._ensure_topmost_if_visible()
            self.output.setText("❌ Nothing captured. Ensure the target window is active and contains text.")
            return'''

new_on_capture_early = '''        if not text_to_send:
            # Update HUD silently (visible only if already shown)
            self._processing = False
            self.text_input.setDisabled(False)
            self._ensure_topmost_if_visible()
            self.output.setText("❌ Nothing captured. Ensure the target window is active and contains text.")
            return'''

content = content.replace(old_on_capture_early, new_on_capture_early)

# Release _processing on code response
old_code_resp = '''    def _handle_code_response(self, response):
        """Store AI response silently. HUD shows it when user presses F2."""
        self._ensure_topmost_if_visible()
        clean = (response or "").strip()
        self.output.setText(f"3/3 ✅ AI Response Ready — press F2 to view:\\n\\n{clean}" if clean else "❌ No response received.")
        self.text_input.setDisabled(False)
        self.response_lines = self._extract_code_for_typing(clean).splitlines()
        self.current_line_index = 0'''

new_code_resp = '''    def _handle_code_response(self, response):
        """Store AI response silently. HUD shows it when user presses F2."""
        self._processing = False
        self._ensure_topmost_if_visible()
        clean = (response or "").strip()
        self.output.setText(f"3/3 ✅ AI Response Ready — press F2 to view:\\n\\n{clean}" if clean else "❌ No response received.")
        self.text_input.setDisabled(False)
        self.response_lines = self._extract_code_for_typing(clean).splitlines()
        self.current_line_index = 0
        self._typing_in_progress = False  # reset F6 guard'''

content = content.replace(old_code_resp, new_code_resp)

# Release _processing on MCQ response
old_mcq_resp = '''    def _handle_mcq_response(self, answer_text, digit):
        """Store MCQ answer silently. HUD shows it when user presses F2."""
        self._ensure_topmost_if_visible()
        display = f"3/3 ✅ MCQ Answer Ready — press F2 to view:\\n\\n{answer_text}\\n\\n✓ Selected: Option {digit}"
        self.output.setText(display)
        self.text_input.clear()
        self.text_input.setDisabled(False)'''

new_mcq_resp = '''    def _handle_mcq_response(self, answer_text, digit):
        """Store MCQ answer silently. HUD shows it when user presses F2."""
        self._processing = False
        self._ensure_topmost_if_visible()
        display = f"3/3 ✅ MCQ Answer Ready — press F2 to view:\\n\\n{answer_text}\\n\\n✓ Selected: Option {digit}"
        self.output.setText(display)
        self.text_input.clear()
        self.text_input.setDisabled(False)'''

content = content.replace(old_mcq_resp, new_mcq_resp)

# Release _processing on error
old_error_handler = '''    def _handle_error(self, error_text: str):
        # Store error silently — user sees it when they open the HUD.
        self._ensure_topmost_if_visible()
        display = f"⚠ {error_text}" if error_text else "⚠ Unknown error — please retry."
        self.output.setText(display)
        self.text_input.setDisabled(False)'''

new_error_handler = '''    def _handle_error(self, error_text: str):
        # Store error silently — user sees it when they open the HUD.
        self._processing = False
        self._typing_in_progress = False
        self._ensure_topmost_if_visible()
        display = f"⚠ {error_text}" if error_text else "⚠ Unknown error — please retry."
        self.output.setText(display)
        self.text_input.setDisabled(False)'''

content = content.replace(old_error_handler, new_error_handler)

# ──────────────────────────────────────────────────────────────────────────────
# FIX 5: F6 type_next_line — guard against rapid double-press
# ──────────────────────────────────────────────────────────────────────────────
old_type_next = '''    def type_next_line(self):
        """Type one response line per F6 press - runs on background thread so HUD stays responsive."""
        if not self.response_lines:
            current = self._extract_code_for_typing(self.output.toPlainText())
            if not current:
                return
            self.response_lines = current.splitlines()
            self.current_line_index = 0

        if self.current_line_index >= len(self.response_lines):
            return

        # Snapshot index + line before spawning thread (avoid race)
        line = self.response_lines[self.current_line_index]
        self.current_line_index += 1

        def _type_line(ln):
            for ch in ln:
                pyautogui.write(ch)
                if ch == ' ':
                    time.sleep(random.uniform(0.08, 0.18))
                elif random.random() < 0.08:
                    time.sleep(random.uniform(0.4, 0.9))
                else:
                    time.sleep(random.uniform(0.15, 0.35))
            pyautogui.press('enter')

        threading.Thread(target=_type_line, args=(line,), daemon=True).start()'''

new_type_next = '''    def type_next_line(self):
        """Type one response line per F6 press - runs on background thread so HUD stays responsive.
        Guard: if previous line is still typing, ignore the press.
        """
        if getattr(self, '_typing_in_progress', False):
            return

        if not self.response_lines:
            current = self._extract_code_for_typing(self.output.toPlainText())
            if not current:
                return
            self.response_lines = current.splitlines()
            self.current_line_index = 0

        if self.current_line_index >= len(self.response_lines):
            self._ensure_topmost_if_visible()
            self.output.setText(self.output.toPlainText() + "\\n\\n[F6] All lines typed.")
            return

        # Snapshot index + line before spawning thread (avoid race)
        line = self.response_lines[self.current_line_index]
        self.current_line_index += 1
        self._typing_in_progress = True

        def _type_line(ln):
            try:
                for ch in ln:
                    pyautogui.write(ch)
                    if ch == ' ':
                        time.sleep(random.uniform(0.08, 0.18))
                    elif random.random() < 0.08:
                        time.sleep(random.uniform(0.4, 0.9))
                    else:
                        time.sleep(random.uniform(0.15, 0.35))
                pyautogui.press('enter')
            finally:
                self._typing_in_progress = False

        threading.Thread(target=_type_line, args=(line,), daemon=True).start()'''

content = content.replace(old_type_next, new_type_next)

# ──────────────────────────────────────────────────────────────────────────────
# FIX 6: F9 paste_all_code — abort if ghost mode active or already pasting
# ──────────────────────────────────────────────────────────────────────────────
old_paste = '''    def paste_all_code(self):
        """F9 / ..p - type every character of the AI code directly into the
        active window using pyautogui.write() line-by-line.

        Design:
          - Zero clipboard usage - nothing is copied or pasted.
          - Zero OCR - code comes from the HUD output widget only.
          - 2-second countdown so the user can click the target window.
          - pyautogui interval of 25ms handles Shift modifier keys reliably
            without dropping them (fixes S->s, )->0, *->8 issues).
        """
        raw = self.output.toPlainText().strip()
        code = self._extract_code_for_typing(raw)
        if not code:
            self.set_output_signal.emit("[F9] No code ready - press F5 first.")
            return'''

new_paste = '''    def paste_all_code(self):
        """F9 / ..p - type every character of the AI code directly into the
        active window using pyautogui.write() line-by-line.

        Design:
          - Zero clipboard usage - nothing is copied or pasted.
          - Zero OCR - code comes from the HUD output widget only.
          - 2-second countdown so the user can click the target window.
          - Guard: aborts if ghost mode is active (avoids input conflict).
          - Guard: aborts if already pasting (prevents double-paste).
        """
        if getattr(self, '_ghost_mode', False):
            self.set_output_signal.emit("[F9] Stop Ghost mode first (F8 / ..s).")
            return
        if getattr(self, '_paste_in_progress', False):
            return
        raw = self.output.toPlainText().strip()
        code = self._extract_code_for_typing(raw)
        if not code:
            self.set_output_signal.emit("[F9] No code ready — press F5 first.")
            return'''

content = content.replace(old_paste, new_paste)

# Also wrap the _countdown_and_type with _paste_in_progress
old_countdown = '''        def _countdown_and_type(text):
            for i in (2, 1):
                self.set_output_signal.emit(
                    f"[F9 TYPE] Click target window. typing in {i}s\\n\\n{text[:120]}."
                )
                time.sleep(1)'''

new_countdown = '''        self._paste_in_progress = True

        def _countdown_and_type(text):
            try:
              for i in (2, 1):
                self.set_output_signal.emit(
                    f"[F9 TYPE] Click target window — typing in {i}s\\n\\n{text[:120]}..."
                )
                time.sleep(1)'''

content = content.replace(old_countdown, new_countdown)

# Fix the end of _countdown_and_type to release _paste_in_progress
old_paste_end = '''            self.set_output_signal.emit(
                f"[F9 ✓] Typed {total} chars.\\n\\n{raw}"
            )

        threading.Thread(target=_countdown_and_type, args=(code,), daemon=True).start()'''

new_paste_end = '''              self.set_output_signal.emit(
                  f"[F9 ✓] Typed {total} chars."
              )
            finally:
              self._paste_in_progress = False

        threading.Thread(target=_countdown_and_type, args=(code,), daemon=True).start()'''

content = content.replace(old_paste_end, new_paste_end)

# ──────────────────────────────────────────────────────────────────────────────
# FIX 7: toggle_visibility — reset opacity if stealth is at a low level when showing
# ──────────────────────────────────────────────────────────────────────────────
old_toggle = '''    def toggle_visibility(self):
        if self.is_hidden:
            self.show_window()
            self.is_hidden = False
        else:
            self.hide_window()
            self.is_hidden = True'''

new_toggle = '''    def toggle_visibility(self):
        if self.is_hidden:
            self.show_window()
            self.is_hidden = False
            # If stealth fully hid it (opacity near zero) bring it back readable
            if self.windowOpacity() < 0.15:
                self.setWindowOpacity(1.0)
                self._stealth_level = 0
                self.is_stealth = False
        else:
            self.hide_window()
            self.is_hidden = True'''

content = content.replace(old_toggle, new_toggle)

# ──────────────────────────────────────────────────────────────────────────────
# FIX 8: Init _processing and _typing_in_progress and _paste_in_progress flags
# ──────────────────────────────────────────────────────────────────────────────
old_init_flags = '''        self.accumulated_text = ""
        self.setup_ui()'''

new_init_flags = '''        self.accumulated_text = ""
        self._processing = False        # True while extract+AI cycle is running
        self._typing_in_progress = False # True while F6 line is being typed
        self._paste_in_progress = False  # True while F9 paste is running
        self.setup_ui()'''

content = content.replace(old_init_flags, new_init_flags)

with open("final.py", "w", encoding="utf-8") as f:
    f.write(content)

print("All edge case fixes applied.")
