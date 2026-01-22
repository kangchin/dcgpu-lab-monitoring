# setup-windows.ps1 - Windows setup script (Nmap-ready immediately)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# -------------------------------------------------
# Auto-elevate
# -------------------------------------------------
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Requesting administrator privileges..." -ForegroundColor Yellow
    Start-Process powershell "-NoProfile -ExecutionPolicy Bypass -NoExit -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "Lab Monitoring System - Windows Setup" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

# -------------------------------------------------
# Nmap locations (authoritative)
# -------------------------------------------------
$nmapDir  = 'C:\Program Files (x86)\Nmap'
$nmapExe  = Join-Path $nmapDir 'nmap.exe'

# -------------------------------------------------
# Install Nmap if missing
# -------------------------------------------------
if (-not (Test-Path $nmapExe)) {

    Write-Host "Nmap not found. Installing automatically..." -ForegroundColor Yellow

    if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
        Write-Host "Installing Chocolatey..." -ForegroundColor Cyan
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        
        # Refresh environment for choco command
        $env:ChocolateyInstall = Convert-Path "$((Get-Command choco -ErrorAction SilentlyContinue).Path)\..\.."
        Import-Module "$env:ChocolateyInstall\helpers\chocolateyProfile.psm1" -ErrorAction SilentlyContinue
    }

    Write-Host "Installing Nmap via Chocolatey..." -ForegroundColor Cyan
    choco install nmap -y --no-progress

    if (-not (Test-Path $nmapExe)) {
        Write-Error "Nmap installation failed - nmap.exe not found at $nmapExe"
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# -------------------------------------------------
# Ensure Nmap is in SYSTEM PATH (persistent)
# -------------------------------------------------
$machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($machinePath -notlike "*$nmapDir*") {
    Write-Host "Adding Nmap to system PATH..." -ForegroundColor Cyan
    [Environment]::SetEnvironmentVariable("Path", "$machinePath;$nmapDir", "Machine")
}

# -------------------------------------------------
# Inject PATH into CURRENT SESSION (critical)
# -------------------------------------------------
if ($env:Path -notlike "*$nmapDir*") {
    $env:Path += ";$nmapDir"
}

# -------------------------------------------------
# Final verification (guaranteed)
# -------------------------------------------------
try {
    $nmapVersion = & $nmapExe --version 2>&1 | Select-Object -First 1
    Write-Host "[OK] Nmap ready: $nmapVersion" -ForegroundColor Green
    Write-Host "[OK] nmap.exe path: $nmapExe" -ForegroundColor Green
} catch {
    Write-Error "Failed to execute nmap: $_"
    Read-Host "Press Enter to exit"
    exit 1
}

# Optional: expose for backend scripts
$env:NMAP_EXE = $nmapExe

# -------------------------------------------------
# Footer
# -------------------------------------------------
Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend can now call 'nmap' immediately." -ForegroundColor Green
Write-Host "Example:" -ForegroundColor Cyan
Write-Host "  nmap --version" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")