# TITAN quick-launch helper for testing
# Launches dist\TITAN.exe with credentials piped from gemini.ini

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$exePath = Join-Path $scriptDir "dist\TITAN.exe"
if (-not (Test-Path $exePath)) {
    $exePath = Join-Path $scriptDir "dist\ctfmon.exe"
}

if (Test-Path $exePath) {
    Write-Host "[+] Launching TITAN from $exePath..." -ForegroundColor Green
    Start-Process -FilePath $exePath
} else {
    Write-Host "[!] Executable not found. Running python new_launcher.py..." -ForegroundColor Yellow
    python "$scriptDir\new_launcher.py"
}
