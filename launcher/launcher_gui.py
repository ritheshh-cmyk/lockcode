"""
Launcher GUI — Compact Authorization Window
"""

import threading
import tkinter as tk
from tkinter import font as tkfont

from api_validator import validate_registration
from machine_id import get_machine_id

# ── Color Palette ──────────────────────────────────────────────
BG        = "#2b2b2b"
BG_INPUT  = "#ffffff"
FG        = "#ffffff"
FG_DARK   = "#1a1a1a"
FG_DIM    = "#999999"
FG_LABEL  = "#cccccc"
ACCENT    = "#4a9eff"
SUCCESS   = "#4caf50"
ERROR     = "#f44336"
BTN_BG    = "#484848"
BTN_HOVER = "#555555"
BORDER    = "#505050"
DEVICE_BG = "#e8f0fe"
DEVICE_FG = "#1a5276"

# Guard against concurrent activation submissions
_validating = False


class RegistrationWindow:
    """Compact authorization window with hardware-locked license validation."""

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

        # Reduced window size
        w, h = 380, 345
        sx = (self.root.winfo_screenwidth()  - w) // 2
        sy = (self.root.winfo_screenheight() - h) // 2
        self.root.geometry(f"{w}x{h}+{sx}+{sy}")

        try:
            self.root.iconbitmap(default="")
        except Exception:
            pass

        container = tk.Frame(self.root, bg=BG)
        container.pack(fill="both", expand=True, padx=20, pady=12)

        # ── Heading ──
        heading_font = tkfont.Font(family="Segoe UI", size=14, weight="bold")
        tk.Label(
            container, text="Device Not Authorized",
            fg=FG, bg=BG, font=heading_font,
        ).pack(anchor="w", pady=(4, 10))

        # ── Device ID ──
        tk.Label(
            container, text="Your Device ID:",
            fg=FG_LABEL, bg=BG, font=("Segoe UI", 9),
        ).pack(anchor="w", pady=(0, 4))

        id_frame = tk.Frame(container, bg=BG)
        id_frame.pack(fill="x", pady=(0, 2))

        # Show up to 40 chars but copy full ID
        display_id = self.machine_id if len(self.machine_id) <= 40 else self.machine_id[:40]
        self.device_var = tk.StringVar(value=display_id)
        device_entry = tk.Entry(
            id_frame,
            textvariable=self.device_var,
            font=("Consolas", 8),
            fg=DEVICE_FG, bg=DEVICE_BG,
            relief="flat", state="readonly",
            readonlybackground=DEVICE_BG,
            selectbackground=ACCENT,
        )
        device_entry.pack(side="left", fill="x", expand=True, ipady=5, padx=(0, 6))

        copy_btn = tk.Button(
            id_frame, text="Copy",
            font=("Segoe UI", 8, "bold"),
            fg=FG, bg=BTN_BG,
            activeforeground=FG, activebackground=BTN_HOVER,
            relief="flat", cursor="hand2",
            padx=10, pady=3,
            command=self._copy_device_id,
        )
        copy_btn.pack(side="right")

        self.hint_label = tk.Label(
            container, text="",
            fg=FG_DIM, bg=BG, font=("Segoe UI", 8),
        )
        self.hint_label.pack(anchor="w", pady=(2, 8))

        # Auto-copy on open
        self.root.after(200, self._copy_device_id)

        # ── Separator ──
        tk.Frame(container, bg=BORDER, height=1).pack(fill="x", pady=(0, 10))

        # ── Key Input ──
        tk.Label(
            container, text="Enter Registration Key:",
            fg=FG_LABEL, bg=BG, font=("Segoe UI", 9),
        ).pack(anchor="w", pady=(0, 4))

        self.key_var = tk.StringVar()
        self.key_var.trace_add("write", self._format_key)

        self.key_entry = tk.Entry(
            container,
            textvariable=self.key_var,
            font=("Consolas", 13),
            fg=FG_DARK, bg=BG_INPUT,
            insertbackground=FG_DARK,
            relief="flat",
            justify="center",
        )
        self.key_entry.pack(fill="x", ipady=7)
        self.key_entry.focus_set()

        self.counter_label = tk.Label(
            container, text="0 / 8 digits",
            fg=FG_DIM, bg=BG, font=("Segoe UI", 8),
        )
        self.counter_label.pack(anchor="e", pady=(2, 8))

        # ── Activate Button ──
        self.btn = tk.Button(
            container,
            text="Activate",
            font=("Segoe UI", 10, "bold"),
            fg=FG, bg=BTN_BG,
            activeforeground=FG, activebackground=BTN_HOVER,
            relief="flat", cursor="hand2",
            pady=7,
            command=self._on_activate,
        )
        self.btn.pack(fill="x", pady=(0, 5))

        # ── Status label ──
        self.status_label = tk.Label(
            container, text="",
            fg=FG_DIM, bg=BG,
            font=("Segoe UI", 8), wraplength=340,
        )
        self.status_label.pack(pady=(0, 2))

        self.root.bind("<Return>", lambda e: self._on_activate())
        self._add_hover(copy_btn, BTN_HOVER, BTN_BG)
        self._add_hover(self.btn,  BTN_HOVER, BTN_BG)

    # ── Hover ──────────────────────────────────────────────────
    def _add_hover(self, widget, hover_bg, normal_bg):
        widget.bind("<Enter>", lambda e: widget.config(bg=hover_bg))
        widget.bind("<Leave>", lambda e: widget.config(bg=normal_bg))

    # ── Copy Device ID ─────────────────────────────────────────
    def _copy_device_id(self):
        try:
            self.root.clipboard_clear()
            self.root.clipboard_append(self.machine_id)  # always copy FULL id
            self.hint_label.config(
                text="✓ ID copied! Send to Admin for access", fg=SUCCESS
            )
        except Exception:
            self.hint_label.config(
                text="⚠ Copy failed — select manually", fg=ERROR
            )

    # ── Key formatting ─────────────────────────────────────────
    def _format_key(self, *_args):
        raw    = self.key_var.get()
        digits = "".join(c for c in raw if c.isdigit())[:8]
        if self.key_var.get() != digits:
            self.key_entry.config(state="normal")
            self.key_var.set(digits)
            self.key_entry.icursor(len(digits))
        self.counter_label.config(text=f"{len(digits)} / 8 digits")

    # ── Activate ───────────────────────────────────────────────
    def _on_activate(self):
        global _validating
        if _validating:
            return   # block double-submit

        key = self.key_var.get().strip()
        if len(key) != 8 or not key.isdigit():
            self.status_label.config(text="⚠ Enter a complete 8-digit key.", fg=ERROR)
            return

        _validating = True
        self.btn.config(state="disabled", text="Validating...", bg="#3a3a3a")
        self.status_label.config(text="Connecting to server...", fg=FG_DIM)

        thread = threading.Thread(
            target=self._validate_thread, args=(key,), daemon=True
        )
        thread.start()

    def _validate_thread(self, key: str):
        try:
            result = validate_registration(key)
        except Exception as exc:
            # Network/timeout error — surface clearly instead of crashing
            result = {"valid": False, "message": f"Network error: {exc}"}
        self.root.after(0, self._handle_result, result)

    def _handle_result(self, result: dict):
        global _validating
        _validating = False   # reset guard regardless of outcome

        try:
            if result.get("valid"):
                days  = result.get("days_remaining",  0)
                hours = result.get("hours_remaining", 0)
                parts = []
                if days:
                    parts.append(f"{days} day{'s' if days != 1 else ''}")
                if hours:
                    parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
                time_str = ", ".join(parts) if parts else "< 1 hour"
                self.status_label.config(
                    text=f"✓ {result.get('message', 'Success!')}  •  {time_str} remaining",
                    fg=SUCCESS,
                )
                self.btn.config(text="✓ Launching...", bg=SUCCESS, fg=FG)
                if self.on_success:
                    self.root.after(1200, lambda: (
                        self.root.destroy(),
                        self.on_success(result),
                    ))
            else:
                self.status_label.config(
                    text=f"✗ {result.get('message', 'Validation failed.')}",
                    fg=ERROR,
                )
                self.btn.config(state="normal", text="Activate", bg=BTN_BG)
        except Exception:
            # Failsafe: re-enable button so user isn't locked out
            self.btn.config(state="normal", text="Activate", bg=BTN_BG)
            self.status_label.config(text="Unexpected error. Try again.", fg=ERROR)

    # ── Run ────────────────────────────────────────────────────
    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    def _demo_callback(result):
        print(f"Success callback: {result}")

    win = RegistrationWindow(on_success=_demo_callback)
    win.run()
