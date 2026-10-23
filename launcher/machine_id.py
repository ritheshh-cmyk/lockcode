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
      1. BIOS UUID via PowerShell (most stable, works on all Windows 10/11)
      2. BIOS UUID via wmic (legacy fallback for Win7-10)
      3. uuid.getnode() (MAC-based, last resort)

    The BIOS UUID is tied to the motherboard and never changes unless
    the BIOS is re-flashed. MAC addresses are deliberately excluded
    from the primary hash because they shift when VPN/Docker/virtual
    adapters are added or removed.

    Returns:
        str: 32-character hex string, stable across reboots on the same machine.
    """
    bios_uuid = ""

    # Try PowerShell first (works on Win10+ including 24H2)
    try:
        bios_uuid = _get_bios_uuid_powershell()
    except Exception:
        pass

    # Fallback to wmic (Win7-11 23H2)
    if not bios_uuid:
        try:
            bios_uuid = _get_cpu_uuid()
        except Exception:
            pass

    if bios_uuid:
        raw = f"BIOS:{bios_uuid}"
    else:
        # Last resort: MAC address only
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


def _get_bios_uuid_powershell() -> str:
    """Extract BIOS UUID via PowerShell (Win10+ including 24H2)."""
    ps_cmd = "(Get-CimInstance Win32_ComputerSystemProduct).UUID"
    out = _run(["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_cmd])
    if out and len(out) >= 16:
        return out
    raise ValueError(f"PowerShell returned unexpected UUID: {out!r}")


if __name__ == "__main__":
    mid = get_machine_id()
    print(f"Machine ID: {mid}")
    print(f"Length: {len(mid)}")
