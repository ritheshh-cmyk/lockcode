# -*- mode: python ; coding: utf-8 -*-
# TITAN_launcher.spec — Builds TITAN.exe (the launcher that spawns ctfmon.exe)
# Entry: new_launcher.py
# Reads gemini.ini, pipes credentials to ctfmon.exe engine process

a = Analysis(
    ['new_launcher.py'],
    pathex=['.'],
    binaries=[],
    datas=[
        ('gemini.ini', '.'),   # launcher reads API keys & settings from here
    ],
    hiddenimports=[
        'json', 'subprocess', 'argparse', 'configparser', 'os', 'sys',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter', 'numpy', 'matplotlib', 'scipy', 'unittest', 'test',
        'PyQt5', 'win32gui', 'win32con', 'win32api', 'pynput', 'pyautogui',
        'PIL', 'google', 'requests', 'urllib3', 'cryptography',
    ],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='TITAN',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,          # UPX disabled — avoids AV heuristics
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,       # Show console so user sees "Starting TITAN engine..." status
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='lockapp.ico',
    uac_admin=False,
)
