# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['titan_stub.py'],
    pathex=[],
    binaries=[],
    datas=[('titan_engine.cp314-win_amd64.pyd', '.')],
    hiddenimports=['PyQt5', 'PyQt5.QtWidgets', 'PyQt5.QtCore', 'PyQt5.QtGui', 'pynput', 'pynput.keyboard', 'pynput.mouse', 'pyautogui', 'requests', 'urllib3', 'win32gui', 'win32con', 'win32api', 'win32process', 'pythoncom', 'pywintypes', 'win32com', 'win32com.client', 'pywinauto', 'pywinauto.application', 'pywinauto.controls', 'configparser', 'ctypes', 'ctypes.wintypes'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
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
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
