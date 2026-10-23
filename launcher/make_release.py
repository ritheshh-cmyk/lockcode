"""
make_release.py — Release helper for LockApp auto-updater

Usage (from the launcher directory):
    python make_release.py <path_to_titan.exe> <new_version>

Example:
    python make_release.py dist\\titan.exe 1.1.0

What it does:
  1. Computes SHA-256 of the EXE
  2. Gets file size
  3. Prints the updated version.json to stdout
  4. Optionally writes version.json to the current directory

Then you upload both titan.exe AND version.json to your R2 bucket:
    - https://pub-a6aee813155645ffb8a3c6a40166b628.r2.dev/titan.exe
    - https://pub-a6aee813155645ffb8a3c6a40166b628.r2.dev/version.json
"""

import hashlib
import json
import os
import sys

R2_EXE_URL = "https://pub-a6aee813155645ffb8a3c6a40166b628.r2.dev/titan.exe"


def sha256_of(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    if len(sys.argv) < 3:
        print("Usage: python make_release.py <exe_path> <new_version>")
        print("Example: python make_release.py dist\\titan.exe 1.1.0")
        sys.exit(1)

    exe_path = sys.argv[1]
    new_version = sys.argv[2]

    if not os.path.isfile(exe_path):
        print(f"ERROR: File not found: {exe_path}")
        sys.exit(1)

    print(f"Computing SHA-256 of {exe_path} …")
    digest = sha256_of(exe_path)
    size   = os.path.getsize(exe_path)

    manifest = {
        "version":   new_version,
        "url":       R2_EXE_URL,
        "sha256":    digest,
        "size":      size,
        "changelog": f"v{new_version} release",
    }

    json_str = json.dumps(manifest, indent=2)
    print("\n─── version.json ───────────────────────────────────────")
    print(json_str)
    print("────────────────────────────────────────────────────────\n")

    out = os.path.join(os.path.dirname(exe_path), "version.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"Written to: {out}")
    print()
    print("Next steps:")
    print(f"  1. Upload titan.exe  → {R2_EXE_URL}")
    print(f"  2. Upload version.json → https://pub-a6aee813155645ffb8a3c6a40166b628.r2.dev/version.json")
    print(f"  3. Bump LOCAL_VERSION in auto_updater.py to '{new_version}' for the next build.")


if __name__ == "__main__":
    main()
