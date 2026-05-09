"""
API Validator Module
Validates registration keys against the remote license server.
"""

import os
import requests

from machine_id import get_machine_id

# ============================================================
# CONFIGURATION — Update these before building the EXE
# ============================================================
API_URL = "https://web-phi-taupe-97.vercel.app/api/validate"
# APP_SECRET: read from env at runtime if set, otherwise use the
# embedded fallback. Embedded fallback is acceptable for a PyInstaller
# EXE where env vars are not available, but MUST match APP_SECRET in
# the Vercel .env.local exactly.
APP_SECRET = os.environ.get("APP_SECRET", "lockapp-secret-2026")
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
                "Content-Type": "application/json",
                "X-App-Secret": APP_SECRET,
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
