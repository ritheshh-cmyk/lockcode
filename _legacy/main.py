import sys
from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QLabel, QPushButton
from PyQt5.QtCore import Qt

class TestGUI(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("GUI Test")
        self.setGeometry(200, 200, 300, 150)

        # Always on top + no taskbar issues
        self.setWindowFlags(
            Qt.WindowStaysOnTopHint |
            Qt.Tool
        )

        layout = QVBoxLayout()

        self.label = QLabel("GUI is working ✅")
        self.label.setAlignment(Qt.AlignCenter)

        btn = QPushButton("Click Me")
        btn.clicked.connect(lambda: self.label.setText("Button Clicked 🚀"))

        layout.addWidget(self.label)
        layout.addWidget(btn)

        self.setLayout(layout)

        self.show()
        self.raise_()
        self.activateWindow()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = TestGUI()
    sys.exit(app.exec_())