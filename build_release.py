import os
import subprocess
import sys
import shutil

ENGINE_DIR = r"C:\Users\rithesh\Downloads\lockcode"
LAUNCHER_DIR = r"C:\Users\rithesh\Desktop\lock\launcher"

def run_cmd(cmd, cwd):
    print(f"\n\033[96m>>> Running:\033[0m {cmd}")
    print(f"    in directory: {cwd}")
    result = subprocess.run(cmd, cwd=cwd, shell=True)
    if result.returncode != 0:
        print(f"\n\033[91m!!! ERROR: Command failed with code {result.returncode}\033[0m")
        sys.exit(1)

def main():
    print("========================================")
    print(" TITAN & LAUNCHER - BUILD AUTOMATION    ")
    print("========================================")
    
    version = input("\nEnter the new release version (e.g., 1.0.1): ").strip()
    if not version:
        print("\033[91mVersion is required. Aborting.\033[0m")
        return

    print(f"\nStarting build process for version: {version}")

    # STEP 1: Build Engine
    print("\n\033[93m--- STEP 1: Building TITAN Engine (Cython) ---\033[0m")
    final_py = os.path.join(ENGINE_DIR, "final.py")
    pyx_file = os.path.join(ENGINE_DIR, "titan_engine.pyx")
    
    print(f"Copying {final_py} -> {pyx_file}")
    shutil.copyfile(final_py, pyx_file)
    
    run_cmd(f'"{sys.executable}" setup_cython.py build_ext --inplace', cwd=ENGINE_DIR)

    # STEP 2: Build Launcher
    print("\n\033[93m--- STEP 2: Building Launcher (PyInstaller) ---\033[0m")
    run_cmd("pyinstaller LockApp.spec --clean", cwd=LAUNCHER_DIR)

    # STEP 3: Generate Manifest
    print("\n\033[93m--- STEP 3: Generating version.json ---\033[0m")
    run_cmd(f'"{sys.executable}" make_release.py dist\\titan.exe {version}', cwd=LAUNCHER_DIR)

    # DONE
    print("\n\033[92m=======================================================\033[0m")
    print("\033[92m✅ BUILD COMPLETED SUCCESSFULLY!\033[0m")
    print("\033[92m=======================================================\033[0m")
    print("\n\033[96m🎯 DEPLOYMENT INSTRUCTIONS:\033[0m")
    print(f"1. Open your Cloudflare R2 bucket dashboard.")
    print(f"2. Upload \033[93m{os.path.join(LAUNCHER_DIR, 'dist', 'titan.exe')}\033[0m")
    print(f"3. Upload \033[93m{os.path.join(LAUNCHER_DIR, 'dist', 'version.json')}\033[0m")
    print(f"\n\033[96m🔧 DEVELOPMENT CLEANUP:\033[0m")
    print(f"4. Before continuing local development, update \033[93mLOCAL_VERSION\033[0m in:")
    print(f"   {os.path.join(LAUNCHER_DIR, 'auto_updater.py')}")
    print(f"   Set it to the new version: '{version}'")
    print("\n=======================================================\n")

if __name__ == "__main__":
    main()
