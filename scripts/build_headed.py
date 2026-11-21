import os
import subprocess
import shutil
import sys

HEADED_ROOT = r"C:\Users\rithesh\Desktop\lockcodeheaded\lockcode"
LAUNCHER_DIR = os.path.join(HEADED_ROOT, "lock", "launcher")
APP_DIR = os.path.join(HEADED_ROOT, "lock", "app")
DESKTOP_EXE = r"C:\Users\rithesh\Desktop\titan.exe"
VC_VARS = r"C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat"

def run(cmd, cwd):
    print(f"\n[RUN] {cmd} in {cwd}")
    res = subprocess.run(cmd, cwd=cwd, shell=True)
    if res.returncode != 0:
        print(f"[FAIL] Return code: {res.returncode}")
        sys.exit(res.returncode)
    print("[SUCCESS]")

def main():
    print("=== STARTING HEADED TITAN REBUILD ===")

    # 0. Sync final.py -> titan_engine.pyx
    final_path = os.path.join(HEADED_ROOT, "final.py")
    pyx_path = os.path.join(HEADED_ROOT, "titan_engine.pyx")
    shutil.copy2(final_path, pyx_path)
    print("Synced final.py -> titan_engine.pyx")

    # 1. Compile Cython
    cython_cmd = f'call "{VC_VARS}" x64 && set DISTUTILS_USE_SDK=1 && python setup_cython.py build_ext --inplace'
    run(cython_cmd, HEADED_ROOT)

    # 2. Copy pyd
    pyd_src = os.path.join(HEADED_ROOT, "titan_engine.cp314-win_amd64.pyd")
    pyd_dst = os.path.join(HEADED_ROOT, "titan_engine.pyd")
    if os.path.exists(pyd_src):
        shutil.copy2(pyd_src, pyd_dst)
        print(f"Copied {pyd_src} -> {pyd_dst}")

    # 3. Build ctfmon.exe
    run("pyinstaller ctfmon.spec --noconfirm", HEADED_ROOT)

    # 4. Copy ctfmon.exe to lock/app/ctfmon.exe
    ctfmon_src = os.path.join(HEADED_ROOT, "dist", "ctfmon.exe")
    ctfmon_dst = os.path.join(APP_DIR, "ctfmon.exe")
    os.makedirs(APP_DIR, exist_ok=True)
    shutil.copy2(ctfmon_src, ctfmon_dst)
    print(f"Copied {ctfmon_src} -> {ctfmon_dst}")

    # 5. Build titan.exe in lock/launcher
    run("pyinstaller LockApp.spec --noconfirm", LAUNCHER_DIR)

    # 6. Copy titan.exe to Desktop
    titan_src = os.path.join(LAUNCHER_DIR, "dist", "titan.exe")
    if os.path.exists(titan_src):
        shutil.copy2(titan_src, DESKTOP_EXE)
        print(f"DEPLOYED TO DESKTOP: {DESKTOP_EXE} ({os.path.getsize(DESKTOP_EXE) / (1024*1024):.2f} MB)")
        lock_titan = os.path.join(HEADED_ROOT, "lock", "titan.exe")
        shutil.copy2(titan_src, lock_titan)
        print(f"Updated lock/titan.exe: {lock_titan}")

    print("=== HEADED TITAN REBUILD FINISHED ===")

if __name__ == "__main__":
    main()
