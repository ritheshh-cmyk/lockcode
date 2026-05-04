"""
Launcher GUI — Modern Authorization Window
Matches the dark, clean "Authorization Required" design.
"""

import threading
import tkinter as tk
from tkinter import font as tkfont

from api_validator import validate_registration
from machine_id import get_machine_id

# ── Color Palette ──────────────────────────────────────────────
BG           = "#2b2b2b"
BG_CARD      = "#363636"
BG_INPUT     = "#ffffff"
FG           = "#ffffff"
FG_DARK      = "#1a1a1a"
FG_DIM       = "#999999"
FG_LABEL     = "#cccccc"
ACCENT       = "#4a9eff"
SUCCESS      = "#4caf50"
ERROR        = "#f44336"
BTN_BG       = "#484848"
BTN_HOVER    = "#555555"
BORDER       = "#505050"
DEVICE_BG    = "#e8f0fe"
DEVICE_FG    = "#1a5276"


class RegistrationWindow:
    """Modern authorization window with hardware-locked license validation."""

    def __init__(self, on_success=None):
        self.on_success = on_success
        self.machine_id = get_machine_id()
        self._build_window()

    # ── Window Construction ────────────────────────────────────
    def _build_window(self):
        self.root = tk.Tk()
        self.root.title("Authorization Required")
        self.root.configure(bg=BG)
        self.root.resizable(False, False)

        # Window size and center
        w, h = 440, 420
        sx = (self.root.winfo_screenwidth() - w) // 2
        sy = (self.root.winfo_screenheight() - h) // 2
        self.root.geometry(f"{w}x{h}+{sx}+{sy}")

        # Icon in title bar
        try:
            self.root.iconbitmap(default="")
        except Exception:
            pass

        # ── Main container with padding ──
        container = tk.Frame(self.root, bg=BG)
        container.pack(fill="both", expand=True, padx=28, pady=20)

        # ── Heading ──
        heading_font = tkfont.Font(family="Segoe UI", size=18, weight="bold")
        tk.Label(
            container, text="Device Not Authorized",
            fg=FG, bg=BG, font=heading_font,
        ).pack(anchor="w", pady=(10, 16))

        # ── Device ID Section ──
        tk.Label(
            container, text="Your Device ID:",
            fg=FG_LABEL, bg=BG, font=("Segoe UI", 10),
        ).pack(anchor="w", pady=(0, 6))

        id_frame = tk.Frame(container, bg=BG)
        id_frame.pack(fill="x", pady=(0, 4))

        # Device ID display field
        self.device_var = tk.StringVar(value=self.machine_id[:40])
        device_entry = tk.Entry(
            id_frame,
            textvariable=self.device_var,
            font=("Consolas", 9),
            fg=DEVICE_FG, bg=DEVICE_BG,
            relief="flat", state="readonly",
            readonlybackground=DEVICE_BG,
            selectbackground=ACCENT,
        )
        device_entry.pack(side="left", fill="x", expand=True, ipady=6, padx=(0, 8))
        device_entry.select_range(0, "end")

        # Copy button
        copy_btn = tk.Button(
            id_frame, text="Copy",
            font=("Segoe UI", 9, "bold"),
            fg=FG, bg=BTN_BG,
            activeforeground=FG, activebackground=BTN_HOVER,
            relief="flat", cursor="hand2",
            padx=14, pady=4,
            command=self._copy_device_id,
        )
        copy_btn.pack(side="right")

        # Auto-copy hint
        self.hint_label = tk.Label(
            container, text="ID auto-copied! Send to Admin for access",
            fg=FG_DIM, bg=BG, font=("Segoe UI", 9),
        )
        self.hint_label.pack(anchor="center", pady=(4, 16))

        # Auto-copy to clipboard
        self.root.after(200, self._copy_device_id)

        # ── Separator ──
        sep = tk.Frame(container, bg=BORDER, height=1)
        sep.pack(fill="x", pady=(0, 16))

        # ── Registration Key Input ──
        tk.Label(
            container, text="Enter Registration Key:",
            fg=FG_LABEL, bg=BG, font=("Segoe UI", 10),
        ).pack(anchor="w", pady=(0, 6))

        key_frame = tk.Frame(container, bg=BG)
        key_frame.pack(fill="x", pady=(0, 6))

        self.key_var = tk.StringVar()
        self.key_var.trace_add("write", self._format_key)

        self.key_entry = tk.Entry(
            key_frame,
            textvariable=self.key_var,
            font=("Consolas", 14),
            fg=FG_DARK, bg=BG_INPUT,
            insertbackground=FG_DARK,
            relief="flat",
            justify="center",
        )
        self.key_entry.pack(fill="x", ipady=8)
        self.key_entry.focus_set()

        # Digit counter
        self.counter_label = tk.Label(
            container, text="0 / 8 digits",
            fg=FG_DIM, bg=BG, font=("Segoe UI", 8),
        )
        self.counter_label.pack(anchor="e", pady=(2, 10))

        # ── Activate / Check Status Button ──
        self.btn = tk.Button(
            container,
            text="Activate",
            font=("Segoe UI", 11, "bold"),
            fg=FG, bg=BTN_BG,
            activeforeground=FG, activebackground=BTN_HOVER,
            relief="flat",
            cursor="hand2",
            pady=8,
            command=self._on_activate,
        )
        self.btn.pack(fill="x", pady=(0, 6))

        # ── Status label ──
        self.status_label = tk.Label(
            container, text="",
            fg=FG_DIM, bg=BG,
            font=("Segoe UI", 9), wraplength=380,
        )
        self.status_label.pack(pady=(0, 4))

        # Bind Enter key
        self.root.bind("<Return>", lambda e: self._on_activate())

        # ── Hover effects ──
        self._add_hover(copy_btn, BTN_HOVER, BTN_BG)
        self._add_hover(self.btn, BTN_HOVER, BTN_BG)

    # ── Hover helper ──────────────────────────────────────────
    def _add_hover(self, widget, hover_bg, normal_bg):
        widget.bind("<Enter>", lambda e: widget.config(bg=hover_bg))
        widget.bind("<Leave>", lambda e: widget.config(bg=normal_bg))

    # ── Copy Device ID ────────────────────────────────────────
    def _copy_device_id(self):
        self.root.clipboard_clear()
        self.root.clipboard_append(self.machine_id)
        self.hint_label.config(text="✓ ID copied! Send to Admin for access", fg=SUCCESS)

    # ── Key formatting (8 digits only) ────────────────────────
    def _format_key(self, *_args):
        raw = self.key_var.get()
        digits = "".join(c for c in raw if c.isdigit())[:8]
        if self.key_var.get() != digits:
            self.key_entry.config(state="normal")
            self.key_var.set(digits)
            self.key_entry.icursor(len(digits))
        self.counter_label.config(text=f"{len(digits)} / 8 digits")

    # ── Activate handler ──────────────────────────────────────
    def _on_activate(self):
        key = self.key_var.get().strip()
        if len(key) != 8 or not key.isdigit():
            self.status_label.config(text="⚠ Enter a complete 8-digit key.", fg=ERROR)
            return

        self.btn.config(state="disabled", text="Validating...", bg="#3a3a3a")
        self.status_label.config(text="Connecting to server...", fg=FG_DIM)

        thread = threading.Thread(target=self._validate_thread, args=(key,), daemon=True)
        thread.start()

    def _validate_thread(self, key: str):
        result = validate_registration(key)
        self.root.after(0, self._handle_result, result)

    def _handle_result(self, result: dict):
        if result.get("valid"):
            days = result.get("days_remaining", 0)
            hours = result.get("hours_remaining", 0)
            parts = []
            if days > 0:
                parts.append(f"{days} day{'s' if days != 1 else ''}")
            if hours > 0:
                parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
            time_str = ", ".join(parts) if parts else "< 1 hour"
            self.status_label.config(
                text=f"✓ {result.get('message', 'Success!')}  •  {time_str} remaining",
                fg=SUCCESS,
            )
            self.btn.config(text="✓ Launching...", bg=SUCCESS, fg=FG)
            if self.on_success:
                self.root.after(1200, lambda: self.on_success(result))
        else:
            self.status_label.config(
                text=f"✗ {result.get('message', 'Validation failed.')}",
                fg=ERROR,
            )
            self.btn.config(state="normal", text="Activate", bg=BTN_BG)

    # ── Run ────────────────────────────────────────────────────
    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    def _demo_callback(result):
        print(f"Success callback: {result}")

    win = RegistrationWindow(on_success=_demo_callback)
    win.run()
