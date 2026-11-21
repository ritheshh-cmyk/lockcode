import os

headed_files = [
    r"C:\Users\rithesh\Desktop\lockcodeheaded\lockcode\final.py",
    r"C:\Users\rithesh\Desktop\lockcodeheaded\lockcode\titan_engine.pyx",
]

old_block = '''            if not api_keys:
                self.error_occurred.emit(
                    f"No API keys found. Contact admin to verify your license is active."
                )
                return'''

new_block = '''            if not api_keys:
                fallback = _LAST_BRIDGE_ERROR if _LAST_BRIDGE_ERROR else "No API keys found. Contact admin to verify your license is active."
                self.error_occurred.emit(fallback)
                return'''

for path in headed_files:
    if not os.path.exists(path):
        continue
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    is_crlf = "\r\n" in content
    norm = content.replace("\r\n", "\n")
    if old_block in norm:
        norm = norm.replace(old_block, new_block)
        out = norm.replace("\n", "\r\n") if is_crlf else norm
        with open(path, "w", encoding="utf-8") as f:
            f.write(out)
        print(f"Patched MCQ fallback in {path}")
    else:
        print(f"Old block not matched in {path}")
