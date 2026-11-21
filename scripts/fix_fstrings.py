# -*- coding: utf-8 -*-
HEADED_FINAL = r"C:\Users\rithesh\Desktop\lockcodeheaded\lockcode\final.py"

def fix():
    with open(HEADED_FINAL, "r", encoding="utf-8") as f:
        content = f.read()

    # Replace the f-strings with triple quoted f-strings
    bad_code1 = '''msg = f"3/3 \u2705 AI Response Ready \u2014 press F2 to view:

{clean}" if clean else "\u274c No response received."'''

    good_code1 = '''clean_txt = clean if clean else "\u274c No response received."
            msg = f"""3/3 \u2705 AI Response Ready \u2014 press F2 to view:

{clean_txt}"""'''

    bad_code2 = '''display = f"3/3 MCQ Answer Ready - press F2 to view:

{answer_text}

Selected: {opt_str}"'''

    good_code2 = '''display = f"""3/3 MCQ Answer Ready - press F2 to view:

{answer_text}

Selected: {opt_str}"""'''

    bad_code3 = '''self.output.setText(f"⚠ Capture failed: {error_text}\nEnsure the target window is active.")'''
    good_code3 = '''self.output.setText(f"⚠ Capture failed: {error_text} - Ensure the target window is active.")'''

    content = content.replace(bad_code1, good_code1)
    content = content.replace(bad_code2, good_code2)
    content = content.replace(bad_code3, good_code3)

    with open(HEADED_FINAL, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed f-strings in headed final.py")

    pyx_path = r"C:\Users\rithesh\Desktop\lockcodeheaded\lockcode\titan_engine.pyx"
    with open(pyx_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Synced to titan_engine.pyx")

if __name__ == "__main__":
    fix()
