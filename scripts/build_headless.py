import os
import subprocess
import shutil
import sys

HEADLESS_ROOT = r"C:\Users\rithesh\Downloads\lockcode"
APP_DIR = os.path.join(HEADLESS_ROOT, "app")
VC_VARS = r"C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat"

def run(cmd, cwd):
    print(f"\n[RUN] {cmd} in {cwd}")
    res = subprocess.run(cmd, cwd=cwd, shell=True)
    if res.returncode != 0:
        print(f"[FAIL] Return code: {res.returncode}")
        sys.exit(res.returncode)
    print("[SUCCESS]")

def main():
    print("=== STARTING HEADLESS TITAN REBUILD ===")

    # 1. Sync final.py -> titan_engine.pyx
    final_path = os.path.join(HEADLESS_ROOT, "final.py")
    pyx_path = os.path.join(HEADLESS_ROOT, "titan_engine.pyx")
    shutil.copy2(final_path, pyx_path)
    print("Synced final.py -> titan_engine.pyx")

    # 2. Compile Cython
    cython_cmd = f'call "{VC_VARS}" x64 && set DISTUTILS_USE_SDK=1 && python setup_cython.py build_ext --inplace'
    run(cython_cmd, HEADLESS_ROOT)

    # 3. Copy pyd
    pyd_src = os.path.join(HEADLESS_ROOT, "titan_engine.cp314-win_amd64.pyd")
    pyd_dst = os.path.join(HEADLESS_ROOT, "titan_engine.pyd")
    if os.path.exists(pyd_src):
        shutil.copy2(pyd_src, pyd_dst)
        print(f"Copied {pyd_src} -> {pyd_dst}")

    # Copy to app/
    pyd_app = os.path.join(APP_DIR, "titan_engine.pyd")
    if os.path.exists(pyd_src):
        shutil.copy2(pyd_src, pyd_app)
        print(f"Copied {pyd_src} -> {pyd_app}")

    # 4. Build ctfmon.exe
    run("pyinstaller ctfmon.spec --noconfirm", HEADLESS_ROOT)

    # 5. Copy ctfmon.exe to app/ctfmon.exe
    ctfmon_src = os.path.join(HEADLESS_ROOT, "dist", "ctfmon.exe")
    ctfmon_dst = os.path.join(APP_DIR, "ctfmon.exe")
    os.makedirs(APP_DIR, exist_ok=True)
    shutil.copy2(ctfmon_src, ctfmon_dst)
    print(f"Copied {ctfmon_src} -> {ctfmon_dst}")

    print("=== HEADLESS TITAN REBUILD COMPLETE ===")

if __name__ == "__main__":
    main()
