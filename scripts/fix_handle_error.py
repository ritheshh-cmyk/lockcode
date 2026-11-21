# -*- coding: utf-8 -*-
HEADED_FINAL = r"C:\Users\rithesh\Desktop\lockcodeheaded\lockcode\final.py"

def fix():
    with open(HEADED_FINAL, "r", encoding="utf-8") as f:
        content = f.read()

    target = """    def _handle_error(self, error_text: str):
        try:
            self._processing = False

    # ── MCQ Cursor Movement ──"""

    replacement = """    def _handle_error(self, error_text: str):
        try:
            self._processing = False
            self._typing_in_progress = False
            self._ensure_topmost_if_visible()
            display = f"⚠ {error_text}" if error_text else "⚠ Unknown error — please retry."
            self.output.setText(display)
            self.text_input.setDisabled(False)
        except Exception:
            self._processing = False

    # ── MCQ Cursor Movement ──"""

    if target in content:
        content = content.replace(target, replacement)
        with open(HEADED_FINAL, "w", encoding="utf-8") as f:
            f.write(content)
        print("Updated _handle_error cleanly.")

        pyx_path = r"C:\Users\rithesh\Desktop\lockcodeheaded\lockcode\titan_engine.pyx"
        with open(pyx_path, "w", encoding="utf-8") as f:
            f.write(content)
        print("Synced to titan_engine.pyx")
    else:
        print("Target not found!")

if __name__ == "__main__":
    fix()
