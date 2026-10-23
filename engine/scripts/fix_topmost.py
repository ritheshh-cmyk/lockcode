with open("final.py", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("    def capture_for_code(self):\n        self.mode = 'code'\n        self._ensure_topmost_if_visible(force_show=True)", "    def capture_for_code(self):\n        self.mode = 'code'\n        self._ensure_topmost_if_visible()")

content = content.replace("    def capture_for_mcq(self):\n        self.mode = 'mcq'\n        self._ensure_topmost_if_visible(force_show=True)", "    def capture_for_mcq(self):\n        self.mode = 'mcq'\n        self._ensure_topmost_if_visible()")

content = content.replace("        self._ensure_topmost_if_visible(force_show=True)\n        self.output.setText(\"2/3", "        self._ensure_topmost_if_visible()\n        self.output.setText(\"2/3")

with open("final.py", "w", encoding="utf-8") as f:
    f.write(content)
