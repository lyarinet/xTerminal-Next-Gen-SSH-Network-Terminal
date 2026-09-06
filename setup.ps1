<#
.SYNOPSIS
    xTerminal - Automated Windows Setup & Dependency Installer
.DESCRIPTION
    Checks and installs Node.js, Git, npm dependencies, and initializes environment for fresh Windows PCs.
#>

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "    __   _______                   _             _                   " -ForegroundColor Green
Write-Host "    \ \ / /_   _|__ _ __ _ __ ___ (_)_ __   __ _| |                  " -ForegroundColor Green
Write-Host "     \ V /  | |/ _ \ '__| '_ ` _ \| | '_ \ / _` | |                  " -ForegroundColor Green
Write-Host "      | |   | |  __/ |  | | | | | | | | | | (_| | |                  " -ForegroundColor Green
Write-Host "      |_|   |_|\___|_|  |_| |_| |_|_|_| |_|\__,_|_| PRO              " -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "   xTerminal Automated Fresh PC Setup (Windows)" -ForegroundColor DarkGray
Write-Host "=====================================================================`n" -ForegroundColor DarkGray

# 1. Check Node.js
Write-Host "[1/4] Checking Node.js Runtime..." -ForegroundColor Cyan
$nodeInstalled = $false
try {
    $nodeVer = node --version 2>$null
    if ($nodeVer) {
        Write-Host "  [+] Node.js detected: $nodeVer" -ForegroundColor Green
        $nodeInstalled = $true
    }
} catch {}

if (-not $nodeInstalled) {
    Write-Host "  [!] Node.js is NOT installed." -ForegroundColor Yellow
    $ans = Read-Host "  Do you want to automatically install Node.js LTS via winget? (Y/n)"
    if ($ans -ne "n" -and $ans -ne "N") {
        Write-Host "  [+] Installing Node.js LTS via winget..." -ForegroundColor Cyan
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        # Refresh environment PATH in current PowerShell session
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    } else {
        Write-Host "  [!] Please download and install Node.js (v20 or v22 LTS) manually from: https://nodejs.org" -ForegroundColor Red
        exit 1
    }
}

# 2. Check Git
Write-Host "`n[2/4] Checking Git Version Control..." -ForegroundColor Cyan
$gitInstalled = $false
try {
    $gitVer = git --version 2>$null
    if ($gitVer) {
        Write-Host "  [+] Git detected: $gitVer" -ForegroundColor Green
        $gitInstalled = $true
    }
} catch {}

if (-not $gitInstalled) {
    Write-Host "  [!] Git is not installed." -ForegroundColor Yellow
    $ans = Read-Host "  Install Git via winget? (Y/n)"
    if ($ans -ne "n" -and $ans -ne "N") {
        winget install Git.Git --accept-package-agreements --accept-source-agreements
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    }
}

# 3. Environment configuration (.env)
Write-Host "`n[3/4] Checking Environment (.env)..." -ForegroundColor Cyan
if (Test-Path "$ScriptDir\.env") {
    Write-Host "  [+] Existing .env file found." -ForegroundColor Green
} elseif (Test-Path "$ScriptDir\.env.example") {
    Copy-Item "$ScriptDir\.env.example" "$ScriptDir\.env" -Force
    Write-Host "  [+] Created default .env from .env.example." -ForegroundColor Green
} else {
    Set-Content -Path "$ScriptDir\.env" -Value "PORT=3000`nHTTPS_PORT=3443`nNODE_ENV=development`n"
    Write-Host "  [+] Generated minimal .env file." -ForegroundColor Green
}

# 4. Install npm dependencies
Write-Host "`n[4/4] Installing Project Dependencies..." -ForegroundColor Cyan
if (Test-Path "$ScriptDir\node_modules") {
    Write-Host "  [+] 'node_modules' already exists." -ForegroundColor Green
    $reinstall = Read-Host "  Re-run npm install to ensure all packages are up to date? (y/N)"
    if ($reinstall -eq "y" -or $reinstall -eq "Y") {
        npm install
    }
} else {
    Write-Host "  [+] Running npm install... (Please wait)" -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [!] Retrying with --legacy-peer-deps..." -ForegroundColor Yellow
        npm install --legacy-peer-deps
    }
}

# Build check
Write-Host "`n[*] Verifying Build Pipeline..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [+] Build verified successfully!" -ForegroundColor Green
} else {
    Write-Host "  [!] Build warning. Check error output above." -ForegroundColor Yellow
}

Write-Host "`n=====================================================================" -ForegroundColor Green
Write-Host " [SUCCESS] Setup is complete on this PC!" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "Choose what to do next:" -ForegroundColor White
Write-Host "  1) Start Development Server (npm run dev)"
Write-Host "  2) Start Production Server  (npm start)"
Write-Host "  3) Build Windows Installer .exe (powershell ./build.ps1)"
Write-Host "  4) Exit`n"

$choice = Read-Host "Select option [1-4] (Default: 1)"
switch ($choice) {
    "2" { npm start }
    "3" { & "$ScriptDir\build.ps1" -Target "windows" }
    "4" { exit 0 }
    default { npm run dev }
}
