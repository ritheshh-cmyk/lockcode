"""
Launcher GUI — Modern White Theme (PyQt5)
Rounded corners, clean typography, full white design.
"""

import sys
import threading

from PyQt5.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QPushButton, QFrame,
)
from PyQt5.QtCore import Qt, QTimer, pyqtSignal, QObject
from PyQt5.QtGui import QFont, QClipboard

from api_validator import validate_registration
from machine_id import get_machine_id

# ── Stylesheet ─────────────────────────────────────────────────
STYLESHEET = """
QWidget#MainWindow {
    background-color: #f5f5f7;
}
QFrame#Card {
    background-color: #ffffff;
    border: 1px solid #e5e5ea;
    border-radius: 14px;
}
QLabel#Heading {
    color: #1d1d1f;
    font-size: 18px;
    font-weight: 700;
    font-family: "Segoe UI";
}
QLabel#SubLabel {
    color: #6e6e73;
    font-size: 11px;
    font-family: "Segoe UI";
}
QLabel#HintLabel {
    color: #86868b;
    font-size: 10px;
    font-family: "Segoe UI";
}
QLabel#StatusLabel {
    font-size: 10px;
    font-family: "Segoe UI";
}
QLineEdit#DeviceID {
    background-color: #e8f0fe;
    color: #1a5276;
    border: 1px solid #d2d2d7;
    border-radius: 8px;
    padding: 6px 10px;
    font-family: "Consolas";
    font-size: 10px;
}
QLineEdit#KeyInput {
    background-color: #f2f2f7;
    color: #1d1d1f;
    border: 1px solid #d2d2d7;
    border-radius: 10px;
    padding: 10px 16px;
    font-family: "Consolas";
    font-size: 15px;
    qproperty-alignment: AlignCenter;
}
QLineEdit#KeyInput:focus {
    border: 2px solid #0071e3;
}
QPushButton#CopyBtn {
    background-color: #e8e8ed;
    color: #1d1d1f;
    border: none;
    border-radius: 8px;
    padding: 6px 14px;
    font-family: "Segoe UI";
    font-size: 10px;
    font-weight: 600;
}
QPushButton#CopyBtn:hover {
    background-color: #d2d2d7;
}
QPushButton#CopyBtn:pressed {
    background-color: #c7c7cc;
}
QPushButton#ActivateBtn {
    background-color: #1d1d1f;
    color: #ffffff;
    border: none;
    border-radius: 10px;
    padding: 12px;
    font-family: "Segoe UI";
    font-size: 13px;
    font-weight: 700;
}
QPushButton#ActivateBtn:hover {
    background-color: #333336;
}
QPushButton#ActivateBtn:pressed {
    background-color: #48484a;
}
QPushButton#ActivateBtn:disabled {
    background-color: #c7c7cc;
    color: #8e8e93;
}
QFrame#Separator {
    background-color: #e5e5ea;
    max-height: 1px;
}
"""


class ValidationSignals(QObject):
    """Thread-safe signals for validation results."""
    finished = pyqtSignal(dict)


class RegistrationWindow(QWidget):
    """Modern authorization window with hardware-locked license validation."""

    def __init__(self, on_success=None):
        super().__init__()
        self.on_success = on_success
        self.machine_id = get_machine_id()
        self._validating = False
        self._signals = ValidationSignals()
        self._signals.finished.connect(self._handle_result)
        self._build_window()

    def _build_window(self):
        self.setObjectName("MainWindow")
        self.setWindowTitle("Authorization Required")
        self.setFixedSize(420, 400)
        self.setWindowFlags(Qt.Window | Qt.WindowCloseButtonHint)
        self.setStyleSheet(STYLESHEET)

        # Center on screen
        screen = QApplication.primaryScreen().geometry()
        x = (screen.width() - 420) // 2
        y = (screen.height() - 400) // 2
        self.move(x, y)

        # ── Main layout ──
        outer = QVBoxLayout(self)
        outer.setContentsMargins(16, 12, 16, 12)

        # ── Card ──
        card = QFrame()
        card.setObjectName("Card")
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(28, 24, 28, 20)
        card_layout.setSpacing(0)

        # ── Heading ──
        heading = QLabel("Device Not Authorized")
        heading.setObjectName("Heading")
        heading.setAlignment(Qt.AlignCenter)
        card_layout.addWidget(heading)
        card_layout.addSpacing(18)

        # ── Device ID label ──
        id_label = QLabel("Your Device ID:")
        id_label.setObjectName("SubLabel")
        card_layout.addWidget(id_label)
        card_layout.addSpacing(5)

        # ── Device ID row ──
        id_row = QHBoxLayout()
        id_row.setSpacing(8)

        half = len(self.machine_id) // 2
        display_id = self.machine_id[:half] + "••••••••"

        self.device_field = QLineEdit(display_id)
        self.device_field.setObjectName("DeviceID")
        self.device_field.setReadOnly(True)
        id_row.addWidget(self.device_field, 1)

        copy_btn = QPushButton("Copy")
        copy_btn.setObjectName("CopyBtn")
        copy_btn.setCursor(Qt.PointingHandCursor)
        copy_btn.clicked.connect(self._copy_device_id)
        id_row.addWidget(copy_btn)

        card_layout.addLayout(id_row)
        card_layout.addSpacing(4)

        # ── Hint ──
        self.hint_label = QLabel("")
        self.hint_label.setObjectName("HintLabel")
        self.hint_label.setAlignment(Qt.AlignCenter)
        card_layout.addWidget(self.hint_label)
        card_layout.addSpacing(10)

        # Auto-copy
        QTimer.singleShot(200, self._copy_device_id)

        # ── Separator ──
        sep = QFrame()
        sep.setObjectName("Separator")
        sep.setFrameShape(QFrame.HLine)
        card_layout.addWidget(sep)
        card_layout.addSpacing(14)

        # ── Key input label ──
        key_label = QLabel("Enter Registration Key:")
        key_label.setObjectName("SubLabel")
        card_layout.addWidget(key_label)
        card_layout.addSpacing(5)

        # ── Key input ──
        self.key_input = QLineEdit()
        self.key_input.setObjectName("KeyInput")
        self.key_input.setMaxLength(8)
        self.key_input.setPlaceholderText("8-digit key")
        self.key_input.textChanged.connect(self._format_key)
        self.key_input.returnPressed.connect(self._on_activate)
        card_layout.addWidget(self.key_input)
        card_layout.addSpacing(14)

        # ── Activate button ──
        self.btn = QPushButton("Activate")
        self.btn.setObjectName("ActivateBtn")
        self.btn.setCursor(Qt.PointingHandCursor)
        self.btn.clicked.connect(self._on_activate)
        card_layout.addWidget(self.btn)
        card_layout.addSpacing(6)

        # ── Status ──
        self.status_label = QLabel("")
        self.status_label.setObjectName("StatusLabel")
        self.status_label.setAlignment(Qt.AlignCenter)
        self.status_label.setWordWrap(True)
        card_layout.addWidget(self.status_label)

        card_layout.addStretch()
        outer.addWidget(card)

        # Focus key input
        QTimer.singleShot(300, self.key_input.setFocus)

    # ── Copy Device ID ─────────────────────────────────────────
    def _copy_device_id(self):
        clipboard = QApplication.clipboard()
        clipboard.setText(self.machine_id)
        self.hint_label.setText("ID auto-copied! Send to Admin for access")
        self.hint_label.setStyleSheet("color: #86868b;")

    # ── Key formatting ─────────────────────────────────────────
    def _format_key(self, text):
        digits = "".join(c for c in text if c.isdigit())[:8]
        if text != digits:
            self.key_input.blockSignals(True)
            self.key_input.setText(digits)
            self.key_input.blockSignals(False)

    # ── Activate ───────────────────────────────────────────────
    def _on_activate(self):
        if self._validating:
            return

        key = self.key_input.text().strip()
        if len(key) != 8 or not key.isdigit():
            self.status_label.setText("⚠ Enter a complete 8-digit key.")
            self.status_label.setStyleSheet("color: #ff3b30;")
            return

        self._validating = True
        self.btn.setEnabled(False)
        self.btn.setText("Verifying...")
        self.status_label.setText("")

        thread = threading.Thread(
            target=self._validate_thread, args=(key,), daemon=True
        )
        thread.start()

    def _validate_thread(self, key: str):
        try:
            result = validate_registration(key)
        except Exception as exc:
            result = {"valid": False, "message": f"Network error: {exc}"}
        self._signals.finished.emit(result)

    def _handle_result(self, result: dict):
        self._validating = False

        if result.get("valid"):
            days = result.get("days_remaining", 0)
            hours = result.get("hours_remaining", 0)
            parts = []
            if days:
                parts.append(f"{days} day{'s' if days != 1 else ''}")
            if hours:
                parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
            time_str = ", ".join(parts) if parts else "< 1 hour"

            self.status_label.setText(
                f"✓ {result.get('message', 'Success!')}  •  {time_str} remaining"
            )
            self.status_label.setStyleSheet("color: #34c759;")
            self.btn.setText("✓ Launching...")
            self.btn.setStyleSheet(
                "QPushButton#ActivateBtn { background-color: #34c759; color: #fff; "
                "border: none; border-radius: 10px; padding: 12px; "
                "font-size: 13px; font-weight: 700; }"
            )

            if self.on_success:
                QTimer.singleShot(1200, lambda: (
                    self.close(),
                    self.on_success(result),
                ))
        else:
            self.status_label.setText(
                f"✗ {result.get('message', 'Validation failed.')}"
            )
            self.status_label.setStyleSheet("color: #ff3b30;")
            self.btn.setEnabled(True)
            self.btn.setText("Activate")

    # ── Run ────────────────────────────────────────────────────
    def run(self):
        self.show()


def create_and_run(on_success=None):
    """Entry point — creates QApplication if needed and runs the window."""
    app = QApplication.instance()
    own_app = False
    if app is None:
        app = QApplication(sys.argv)
        own_app = True

    win = RegistrationWindow(on_success=on_success)
    win.run()

    if own_app:
        sys.exit(app.exec_())
    return win


if __name__ == "__main__":
    def _demo_callback(result):
        print(f"Success callback: {result}")

    create_and_run(on_success=_demo_callback)
