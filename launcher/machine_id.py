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

    Strategy (tries in order):
      1. wmic csproduct UUID + wmic MAC address (Windows 7-11 23H2)
      2. PowerShell Get-CimInstance (Windows 11 24H2+ where wmic is removed)
      3. uuid.getnode() fallback (MAC-address based)

    Returns:
        str: 32-character hex string, stable across reboots on the same machine.
    """
    try:
        cpu_uuid = _get_cpu_uuid()
        mac_address = _get_primary_mac()
        raw = f"{cpu_uuid}:{mac_address}"
    except Exception:
        # Fallback: PowerShell CIM (Windows 11 24H2+)
        try:
            raw = _get_ids_via_powershell()
        except Exception:
            # Last resort: MAC address only via Python stdlib
            raw = str(uuid.getnode())

    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def _run(cmd: list[str], timeout: int = 10) -> str:
    """Run a command silently and return stripped stdout."""
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=timeout,
        creationflags=subprocess.CREATE_NO_WINDOW,
    )
    return result.stdout.strip()


def _get_cpu_uuid() -> str:
    """Extract product UUID via wmic (Windows 7–11 23H2)."""
    out = _run(["wmic", "csproduct", "get", "uuid"])
    lines = [ln.strip() for ln in out.splitlines() if ln.strip()]
    # First line is header "UUID", second is the value
    if len(lines) >= 2:
        return lines[1]
    raise ValueError("wmic csproduct returned no UUID")


def _get_primary_mac() -> str:
    """Extract the first non-empty MAC address via wmic."""
    out = _run(["wmic", "nic", "get", "MACAddress"])
    for line in out.splitlines():
        line = line.strip()
        if line and line != "MACAddress" and ":" in line:
            return line
    raise ValueError("wmic nic returned no MAC address")


def _get_ids_via_powershell() -> str:
    """
    PowerShell-based fallback for Windows 11 24H2+ (wmic removed).
    Uses Get-CimInstance which is the modern replacement for wmic.
    """
    ps_cmd = (
        "(Get-CimInstance Win32_ComputerSystemProduct).UUID + ':' + "
        "((Get-CimInstance Win32_NetworkAdapter | "
        "Where-Object { $_.MACAddress -ne $null } | "
        "Select-Object -First 1).MACAddress)"
    )
    out = _run(["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_cmd])
    if ":" in out and len(out) > 10:
        return out
    raise ValueError(f"PowerShell returned unexpected output: {out!r}")


if __name__ == "__main__":
    mid = get_machine_id()
    print(f"Machine ID: {mid}")
    print(f"Length: {len(mid)}")
