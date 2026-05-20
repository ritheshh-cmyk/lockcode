import os
import sys
import shutil
import subprocess

def main():
    print("Starting full build pipeline...")

    # Step 1: Copy final.py to titan_engine.pyx
    print("\n[1/3] Copying final.py to titan_engine.pyx...")
    if not os.path.exists("final.py"):
        print("Error: final.py not found.")
        sys.exit(1)
    
    shutil.copy("final.py", "titan_engine.pyx")
    print("Copy successful.")

    # Step 2: Cythonize
    print("\n[2/3] Cythonizing using setup_cython.py...")
    try:
        subprocess.check_call([sys.executable, "setup_cython.py", "build_ext", "--inplace"])
        print("Cython build successful.")
    except subprocess.CalledProcessError as e:
        print(f"Error during Cython build: {e}")
        sys.exit(1)

    # Rename the output .pyd to titan_engine.pyd if it has a version tag
    pyd_files = [f for f in os.listdir() if f.startswith("titan_engine.") and f.endswith(".pyd")]
    if not pyd_files:
        print("Error: No compiled .pyd found.")
        sys.exit(1)
    
    # We want titan_engine.pyd for PyInstaller
    found_generic = False
    for pyd in pyd_files:
        if pyd == "titan_engine.pyd":
            found_generic = True
            break
    
    if not found_generic:
        # rename the first one
        src_pyd = pyd_files[0]
        print(f"Renaming {src_pyd} to titan_engine.pyd...")
        if os.path.exists("titan_engine.pyd"):
            os.remove("titan_engine.pyd")
        os.rename(src_pyd, "titan_engine.pyd")
    else:
        print("titan_engine.pyd is ready.")

    # Step 3: PyInstaller Build
    print("\n[3/3] Running PyInstaller with TITAN.spec...")
    try:
        # use the pyinstaller associated with the current python environment
        subprocess.check_call([sys.executable, "-m", "PyInstaller", "--clean", "TITAN.spec"])
        print("PyInstaller build successful.")
    except subprocess.CalledProcessError as e:
        print(f"Error during PyInstaller build: {e}")
        sys.exit(1)

    print("\nAll steps completed successfully! Find your executable in the 'dist' directory.")

if __name__ == "__main__":
    main()
