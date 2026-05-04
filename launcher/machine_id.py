"""
Machine Fingerprint Module
Generates a unique, deterministic machine identifier for Windows.
"""

import hashlib
import subprocess
import uuid


def get_machine_id() -> str:
    """
    Generate a deterministic machine ID by hashing hardware identifiers.
    
    On Windows:
      1. Reads CPU/product UUID via `wmic csproduct get uuid`
      2. Reads primary MAC address via `wmic nic get MACAddress`
      3. Concatenates and SHA-256 hashes both → returns first 32 hex chars
    
    Fallback: uses uuid.getnode() (MAC-based) if wmic fails.
    
    Returns:
        str: 32-character hex string, stable across reboots on the same machine.
    """
    try:
        cpu_uuid = _get_cpu_uuid()
        mac_address = _get_primary_mac()
        raw = f"{cpu_uuid}:{mac_address}"
    except Exception:
        # Fallback: MAC address only via Python stdlib
        raw = str(uuid.getnode())

    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def _get_cpu_uuid() -> str:
    """Extract product UUID via wmic."""
    result = subprocess.run(
        ["wmic", "csproduct", "get", "uuid"],
        capture_output=True,
        text=True,
        timeout=10,
        creationflags=subprocess.CREATE_NO_WINDOW,
    )
    lines = [line.strip() for line in result.stdout.strip().splitlines() if line.strip()]
    # First line is header "UUID", second is the value
    if len(lines) >= 2:
        return lines[1]
    raise ValueError("Could not parse CPU UUID from wmic output")


def _get_primary_mac() -> str:
    """Extract the first non-empty MAC address via wmic."""
    result = subprocess.run(
        ["wmic", "nic", "get", "MACAddress"],
        capture_output=True,
        text=True,
        timeout=10,
        creationflags=subprocess.CREATE_NO_WINDOW,
    )
    for line in result.stdout.strip().splitlines():
        line = line.strip()
        if line and line != "MACAddress" and ":" in line:
            return line
    raise ValueError("Could not parse MAC address from wmic output")


if __name__ == "__main__":
    mid = get_machine_id()
    print(f"Machine ID: {mid}")
    print(f"Length: {len(mid)}")
