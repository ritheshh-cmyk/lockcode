# -*- coding: utf-8 -*-
"""
apply_all_safeguards.py — Comprehensive crash-proofing for TITAN Headed and Headless
"""
import os
import re

HEADED_FINAL = r"C:\Users\rithesh\Desktop\lockcodeheaded\lockcode\final.py"
HEADLESS_FINAL = r"C:\Users\rithesh\Downloads\lockcode\final.py"

def harden_headed():
    if not os.path.exists(HEADED_FINAL):
        print(f"Skipping {HEADED_FINAL} (not found)")
        return

    with open(HEADED_FINAL, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Guard _handle_code_response, _handle_mcq_response, _on_extract_error, _handle_error with safe triple quotes
    handlers_pat = r'def _handle_code_response\(self, response\):[\s\S]*?self\.text_input\.setDisabled\(False\)\s*\n\s*except Exception:\s*\n\s*self\._processing = False'
    new_handlers = '''def _handle_code_response(self, response):
        try:
            self._processing = False
            self._ensure_topmost_if_visible()
            clean = (response or "").strip()
            msg = f"3/3 ✅ AI Response Ready — press F2 to view:\\n\\n{clean}" if clean else "❌ No response received."
            self.output.setText(msg)
            self.text_input.setDisabled(False)
            self.response_lines = self._extract_code_for_typing(clean).splitlines()
            self.current_line_index = 0
            self._typing_in_progress = False
        except Exception:
            self._processing = False

    def _handle_mcq_response(self, answer_text, digit):
        try:
            self._processing = False
            self._ensure_topmost_if_visible()
            opt_str = f"Option {digit}" if digit and str(digit).strip() not in ("", "?") else "See explanation"
            display = f"3/3 MCQ Answer Ready - press F2 to view:\\n\\n{answer_text}\\n\\nSelected: {opt_str}"
            self.output.setText(display)
            self.text_input.clear()
            self.text_input.setDisabled(False)
        except Exception:
            self._processing = False

    def _on_extract_error(self, error_text: str):
        try:
            self._processing = False
            self.output.setText(f"⚠ Capture failed: {error_text}\\nEnsure the target window is active.")
            self.text_input.setDisabled(False)
        except Exception:
            self._processing = False

    def _handle_error(self, error_text: str):
        try:
            self._processing = False
            self._typing_in_progress = False
            self._ensure_topmost_if_visible()
            display = f"⚠ {error_text}" if error_text else "⚠ Unknown error — please retry."
            self.output.setText(display)
            self.text_input.setDisabled(False)
        except Exception:
            self._processing = False'''

    content = re.sub(handlers_pat, new_handlers, content)

    # Let's write the fixed content
    with open(HEADED_FINAL, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Hardened headed final.py successfully ({len(content)} bytes).")

    # Sync to titan_engine.pyx in headed root
    pyx_path = os.path.join(os.path.dirname(HEADED_FINAL), "titan_engine.pyx")
    with open(pyx_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Synced headed final.py -> titan_engine.pyx")

if __name__ == "__main__":
    harden_headed()
