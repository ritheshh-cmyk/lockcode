# -*- coding: utf-8 -*-
HEADED_FINAL = r"C:\Users\rithesh\Desktop\lockcodeheaded\lockcode\final.py"

def clean():
    with open(HEADED_FINAL, "r", encoding="utf-8") as f:
        lines = f.readlines()

    # Find the end of the good _handle_error at line ~2234
    # and remove everything up to # ── MCQ Cursor Movement ──
    start_cut = -1
    end_cut = -1

    for i, line in enumerate(lines):
        if "def _handle_error(self, error_text: str):" in line:
            # find where this function ends (self._processing = False)
            for j in range(i, min(i+20, len(lines))):
                if "self._processing = False" in lines[j]:
                    start_cut = j + 1
                    break
            break

    for i, line in enumerate(lines):
        if "# ── MCQ Cursor Movement ──" in line:
            end_cut = i
            break

    print(f"start_cut: {start_cut}, end_cut: {end_cut}")
    if start_cut > 0 and end_cut > start_cut:
        new_lines = lines[:start_cut] + ["\n"] + lines[end_cut:]
        with open(HEADED_FINAL, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
        print(f"Cleaned {end_cut - start_cut} duplicate lines from {HEADED_FINAL}")

        pyx_path = r"C:\Users\rithesh\Desktop\lockcodeheaded\lockcode\titan_engine.pyx"
        with open(pyx_path, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
        print("Synced to titan_engine.pyx")

if __name__ == "__main__":
    clean()
