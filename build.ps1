<#
.SYNOPSIS
    xTerminal - Multi-Platform Interactive Build & Packaging Utility
.DESCRIPTION
    Builds Windows (.exe / NSIS), Linux (.AppImage / .deb), macOS (.dmg), and Android packages.
#>

param(
    [string]$Target = ""
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

function Show-Banner {
    Clear-Host
    Write-Host "=====================================================================" -ForegroundColor Cyan
    Write-Host "    __   _______                   _             _                   " -ForegroundColor Green
    Write-Host "    \ \ / /_   _|__ _ __ _ __ ___ (_)_ __   __ _| |                  " -ForegroundColor Green
    Write-Host "     \ V /  | |/ _ \ '__| '_ ` _ \| | '_ \ / _` | |                  " -ForegroundColor Green
    Write-Host "      | |   | |  __/ |  | | | | | | | | | | (_| | |                  " -ForegroundColor Green
    Write-Host "      |_|   |_|\___|_|  |_| |_| |_|_|_| |_|\__,_|_| PRO              " -ForegroundColor Cyan
    Write-Host "=====================================================================" -ForegroundColor Cyan
    Write-Host "   Multi-Platform Cross-Build Engine (Windows, macOS, Linux, Android)" -ForegroundColor DarkGray
    Write-Host "=====================================================================`n" -ForegroundColor DarkGray
}

function Test-Prerequisites {
    Write-Host "[-] Checking build toolchain prerequisites..." -ForegroundColor DarkGray
    
    # Check Node.js
    try {
        $nodeVer = node --version
        Write-Host "  [+] Node.js: $nodeVer" -ForegroundColor Green
    } catch {
        Write-Host "  [!] Node.js is required but was not found in PATH." -ForegroundColor Red
        return $false
    }

    # Check npm
    try {
        $npmVer = npm --version
        Write-Host "  [+] npm: v$npmVer" -ForegroundColor Green
    } catch {
        Write-Host "  [!] npm was not found in PATH." -ForegroundColor Red
        return $false
    }

    return $true
}

function Build-FrontendAndServer {
    Write-Host "`n[1/2] Compiling Vite Frontend & Node Server Bundle..." -ForegroundColor Cyan
    $start = Get-Date
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build failed during 'npm run build'." -ForegroundColor Red
        exit $LASTEXITCODE
    }
    $elapsed = (Get-Date) - $start
    Write-Host "  [+] Compilation completed in $([math]::Round($elapsed.TotalSeconds, 1))s." -ForegroundColor Green
}

function Build-Windows {
    Show-Banner
    Write-Host ">>> TARGET: Windows Desktop Application (NSIS Installer & Portable .exe)`n" -ForegroundColor Yellow
    
    Build-FrontendAndServer
    
    Write-Host "`n[2/2] Packaging Windows application via electron-builder..." -ForegroundColor Cyan
    $start = Get-Date
    npx electron-builder --win nsis
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to package Windows installer." -ForegroundColor Red
        return
    }
    $elapsed = (Get-Date) - $start

    Write-Host "`n=====================================================================" -ForegroundColor Green
    Write-Host " [SUCCESS] Windows Desktop App built successfully in $([math]::Round($elapsed.TotalSeconds, 1))s!" -ForegroundColor Green
    Write-Host "=====================================================================" -ForegroundColor Green
    Write-Host "  Output Directory: $ScriptDir\release" -ForegroundColor White
    
    if (Test-Path "$ScriptDir\release\xTerminal Setup 1.0.0.exe") {
        Write-Host "  Setup Installer : release\xTerminal Setup 1.0.0.exe" -ForegroundColor Cyan
    }
    if (Test-Path "$ScriptDir\release\win-unpacked\xTerminal.exe") {
        Write-Host "  Standalone .exe : release\win-unpacked\xTerminal.exe" -ForegroundColor Cyan
    }
    Write-Host ""
    
    if ($Target -eq "") {
        $openFolder = Read-Host "Would you like to open the release folder in File Explorer? (Y/N)"
        if ($openFolder -match "^[Yy]") {
            Invoke-Item "$ScriptDir\release"
        }
    }
}

function Build-Linux {
    Show-Banner
    Write-Host ">>> TARGET: Linux Desktop Application (AppImage & Debian .deb)`n" -ForegroundColor Yellow

    Build-FrontendAndServer

    Write-Host "`n[2/2] Packaging Linux AppImage & .deb..." -ForegroundColor Cyan
    $start = Get-Date
    npx electron-builder --linux AppImage deb
    $elapsed = (Get-Date) - $start

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n=====================================================================" -ForegroundColor Green
        Write-Host " [SUCCESS] Linux packages generated successfully in $([math]::Round($elapsed.TotalSeconds, 1))s!" -ForegroundColor Green
        Write-Host " Output: $ScriptDir\release" -ForegroundColor White
    } else {
        Write-Host "`n[NOTE] Linux packaging on Windows typically requires WSL (Windows Subsystem for Linux) or Docker for full .AppImage / .deb signing." -ForegroundColor Yellow
    }
}

function Build-MacOS {
    Show-Banner
    Write-Host ">>> TARGET: macOS Desktop Application (.dmg Installer)`n" -ForegroundColor Yellow

    Build-FrontendAndServer

    Write-Host "`n[2/2] Packaging macOS .dmg..." -ForegroundColor Cyan
    $start = Get-Date
    npx electron-builder --mac dmg
    $elapsed = (Get-Date) - $start

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n=====================================================================" -ForegroundColor Green
        Write-Host " [SUCCESS] macOS .dmg generated successfully in $([math]::Round($elapsed.TotalSeconds, 1))s!" -ForegroundColor Green
        Write-Host " Output: $ScriptDir\release" -ForegroundColor White
    } else {
        Write-Host "`n[NOTE] macOS .dmg bundling requires a macOS host or specialized Docker container for Darwin code signing." -ForegroundColor Yellow
    }
}

function Build-Android {
    Show-Banner
    Write-Host ">>> TARGET: Android Mobile Application (Capacitor / PWA)`n" -ForegroundColor Yellow

    Write-Host "[1/3] Building Web Distribution for Android WebView..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { return }

    # Check if Capacitor CLI is available
    Write-Host "`n[2/3] Checking Capacitor Android Bridge..." -ForegroundColor Cyan
    $hasCap = $null
    try { $hasCap = npx cap --version } catch {}

    if ($hasCap) {
        Write-Host "  [+] Capacitor CLI detected (v$hasCap)" -ForegroundColor Green
        Write-Host "  Syncing assets to Android native shell..." -ForegroundColor Cyan
        npx cap sync android
        Write-Host "`n[3/3] Opening Android Studio / Gradle project..." -ForegroundColor Cyan
        npx cap open android
    } else {
        Write-Host "  [+] Progressive Web App (PWA) Android package prepared in 'dist/'." -ForegroundColor Green
        Write-Host "  To compile native APK via Android Studio:" -ForegroundColor Yellow
        Write-Host "    1. Run: npm install @capacitor/core @capacitor/cli @capacitor/android" -ForegroundColor DarkGray
        Write-Host "    2. Run: npx cap add android" -ForegroundColor DarkGray
        Write-Host "    3. Run: npx cap sync android && npx cap open android" -ForegroundColor DarkGray
    }

    Write-Host "`n[SUCCESS] Android web assets compiled and bundled with high-res adaptive icons." -ForegroundColor Green
}

function Build-All {
    Build-Windows
    Write-Host "`nContinuing with cross-platform targets..." -ForegroundColor DarkGray
    Build-Linux
}

function Run-DevDesktop {
    Show-Banner
    Write-Host ">>> Starting xTerminal in Live Desktop Development Mode...`n" -ForegroundColor Cyan
    npm run build
    npx electron .
}

function Refresh-Icons {
    Show-Banner
    Write-Host ">>> Regenerating all multi-platform icons from public/icon.svg...`n" -ForegroundColor Cyan
    node_modules\.bin\electron.cmd scripts\generate-icons.cjs
    Write-Host "`n[+] Multi-platform icons regenerated successfully." -ForegroundColor Green
}

# --- Main Entry Loop ---
if (!(Test-Prerequisites)) {
    Read-Host "`nPress Enter to exit..."
    exit 1
}

if ($Target -ne "") {
    switch ($Target.ToLower()) {
        "win"     { Build-Windows; exit }
        "windows" { Build-Windows; exit }
        "linux"   { Build-Linux; exit }
        "mac"     { Build-MacOS; exit }
        "macos"   { Build-MacOS; exit }
        "android" { Build-Android; exit }
        "all"     { Build-All; exit }
        default   { Write-Host "Unknown target: $Target" -ForegroundColor Red; exit 1 }
    }
}

do {
    Show-Banner
    Write-Host "Select a target platform to build:" -ForegroundColor White
    Write-Host ""
    Write-Host "  [1]  Windows Desktop       (.exe Installer & Portable win-unpacked)" -ForegroundColor Cyan
    Write-Host "  [2]  Linux Desktop         (.AppImage & Debian .deb)" -ForegroundColor Green
    Write-Host "  [3]  macOS Desktop         (.dmg Installer)" -ForegroundColor Magenta
    Write-Host "  [4]  Android App           (Capacitor / Android Studio native package)" -ForegroundColor Yellow
    Write-Host "  [5]  Build All Targets     (Complete desktop packaging suite)" -ForegroundColor White
    Write-Host "  -------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  [6]  Launch Desktop App    (Run locally via Electron)" -ForegroundColor DarkCyan
    Write-Host "  [7]  Regenerate Icons      (Refresh .ico, .png, Android, Web icons)" -ForegroundColor DarkGray
    Write-Host "  [0]  Exit" -ForegroundColor Red
    Write-Host ""
    
    $choice = Read-Host "Enter option number [0-7]"
    
    switch ($choice) {
        "1" { Build-Windows; Pause }
        "2" { Build-Linux; Pause }
        "3" { Build-MacOS; Pause }
        "4" { Build-Android; Pause }
        "5" { Build-All; Pause }
        "6" { Run-DevDesktop; Pause }
        "7" { Refresh-Icons; Pause }
        "0" { Write-Host "`nExiting builder. Good bye!" -ForegroundColor DarkGray; break }
        default { Write-Host "Invalid option. Please choose between 0 and 7." -ForegroundColor Red; Start-Sleep -Seconds 1 }
    }
} while ($choice -ne "0")
