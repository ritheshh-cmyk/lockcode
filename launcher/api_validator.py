"""
API Validator Module
Validates registration keys against the remote license server.
"""

import os
import requests

from machine_id import get_machine_id

import base64
def _D(s: str) -> str:
    """De-obfuscate string at runtime."""
    try:
        return base64.b64decode(s).decode("utf-8")[::-1]
    except Exception:
        return ""

# ============================================================
# CONFIGURATION — Obfuscated logic 
# ============================================================
API_URL = _D("ZXRhZGlsYXYvaXBhL3BwYS5sZWNyZXYuNzktZXB1YXQtaWhwLWJldy8vOnNwdHRo")
APP_SECRET = os.environ.get(_D("VEVSQ0VTX1BQQQ=="), _D("NjIwMi10ZXJjZXMtcHBha2NvbA=="))
# ============================================================


def validate_registration(reg_key: str) -> dict:
    """
    Validate an 8-digit registration key against the license server.

    Args:
        reg_key: 8-digit numeric license key (e.g. "12402879").

    Returns:
        dict with at least { valid: bool, message: str }.
        On success also includes { days_remaining, gemini_key, language }.
        Never raises exceptions — always returns a dict.
    """
    try:
        machine_id = get_machine_id()

        response = requests.post(
            API_URL,
            json={
                "reg_key": reg_key.strip(),
                "machine_id": machine_id,
            },
            headers={
                _D("ZXB5VC10bmV0bm9D"): _D("bm9zai9ub2l0YWNpbHBwYQ=="), # Content-Type: application/json
                _D("dGVyY2VTLXBwQS1Y"): APP_SECRET,
            },
            timeout=30,
        )

        # Try to parse JSON regardless of status code
        try:
            data = response.json()
        except (ValueError, requests.exceptions.JSONDecodeError):
            return {
                "valid": False,
                "message": "Invalid response from license server.",
            }

        # Ensure response always has 'valid' key
        if "valid" not in data:
            return {
                "valid": False,
                "message": data.get("message", "Unexpected response from license server."),
            }

        return data

    except requests.exceptions.Timeout:
        return {
            "valid": False,
            "message": "License server timed out. Check your internet connection.",
        }
    except requests.exceptions.ConnectionError:
        return {
            "valid": False,
            "message": "Cannot connect to license server. Check your internet connection.",
        }
    except Exception:
        return {
            "valid": False,
            "message": "Cannot connect to license server. Check your internet connection.",
        }
