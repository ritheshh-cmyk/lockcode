"""
Build script: Cython-compile final.py → titan_engine.pyd using ziglang as the C compiler.
Run with: python setup_cython.py build_ext --inplace
"""
import os
import sys
import ziglang
from setuptools import setup, Extension
from Cython.Build import cythonize

# Locate zig.exe directly inside the ziglang package directory
# (ziglang dropped get_zig_exe() in newer versions)
_zig_exe = os.path.join(os.path.dirname(ziglang.__file__), "zig.exe")
if not os.path.exists(_zig_exe):
    raise FileNotFoundError(f"zig.exe not found at {_zig_exe}")

os.environ["CC"]       = f"{_zig_exe} cc"
os.environ["LDSHARED"] = f"{_zig_exe} cc -shared"
os.environ["CFLAGS"]   = "-O2"

ext = Extension(
    name="titan_engine",
    sources=["titan_engine.pyx"],   # copy of final.py
    include_dirs=[],
    extra_compile_args=["-O2"],
)

setup(
    name="titan_engine",
    ext_modules=cythonize(
        ext,
        compiler_directives={
            "language_level": "3",
            "boundscheck": False,
            "wraparound": False,
        },
        quiet=False,
    ),
)
