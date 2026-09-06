<#
.SYNOPSIS
    xTerminal - Multi-Platform Interactive Build & Packaging Utility
.DESCRIPTION
    Builds Windows (.exe / NSIS), Android (.apk), Linux (.AppImage / .deb), and macOS (.dmg).
    Supports dynamic versioning across package.json, Android gradle, and release filenames.
.PARAMETER Target
    Target platform: win, windows, android, linux, mac, macos, all.
.PARAMETER Version
    Optional version string (e.g. 1.0.0, 1.1.0). Updates package.json and Android build.gradle if specified.
#>

param(
    [string]$Target = "",
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# --- Version Management Functions ---
function Get-AppVersion {
    $pkgJsonPath = Join-Path $ScriptDir "package.json"
    if (Test-Path $pkgJsonPath) {
        try {
            $json = Get-Content $pkgJsonPath -Raw | ConvertFrom-Json
            if ($json.version) { return $json.version }
        } catch {}
    }
    return "1.0.0"
}

function Set-AppVersion([string]$newVer) {
    if (-not $newVer) { return }
    $cleanVer = $newVer.Trim().TrimStart('v').TrimStart('V')
    
    # 1. Update package.json
    $pkgJsonPath = Join-Path $ScriptDir "package.json"
    if (Test-Path $pkgJsonPath) {
        $content = Get-Content $pkgJsonPath -Raw
        $content = $content -replace '("version"\s*:\s*)"[^"]+"', "`$1`"$cleanVer`""
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($pkgJsonPath, $content, $utf8NoBom)
        Write-Host "  [+] Updated package.json version -> $cleanVer" -ForegroundColor Green
    }
    
    # 2. Update Android build.gradle
    $gradlePath = Join-Path $ScriptDir "android\app\build.gradle"
    if (Test-Path $gradlePath) {
        $gradleContent = Get-Content $gradlePath -Raw
        $gradleContent = $gradleContent -replace 'versionName\s+"[^"]+"', "versionName `"$cleanVer`""
        
        # Calculate numeric versionCode (e.g. 1.0.0 -> 10000, 1.2.3 -> 10203)
        $parts = $cleanVer.Split('.')
        if ($parts.Count -ge 2) {
            try {
                $major = [int]$parts[0]
                $minor = [int]$parts[1]
                $patch = if ($parts.Count -ge 3) { [int]$parts[2] } else { 0 }
                $newCode = ($major * 10000) + ($minor * 100) + $patch
                $gradleContent = $gradleContent -replace 'versionCode\s+\d+', "versionCode $newCode"
            } catch {}
        }
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($gradlePath, $gradleContent, $utf8NoBom)
        Write-Host "  [+] Updated Android build.gradle versionName -> $cleanVer" -ForegroundColor Green
    }

    $script:AppVersion = $cleanVer
}

# Initialize Version
$script:AppVersion = Get-AppVersion
if ($Version -and $Version.Trim() -ne "") {
    Set-AppVersion $Version
}

function Show-Banner {
    Clear-Host
    Write-Host "=====================================================================" -ForegroundColor Cyan
    Write-Host "    __   _______                   _             _                   " -ForegroundColor Green
    Write-Host "    \ \ / /_   _|__ _ __ _ __ ___ (_)_ __   __ _| |                  " -ForegroundColor Green
    Write-Host "     \ V /  | |/ _ \ '__| '_ ` _ \| | '_ \ / _` | |                  " -ForegroundColor Green
    Write-Host "      | |   | |  __/ |  | | | | | | | | | | (_| | |                  " -ForegroundColor Green
    Write-Host "      |_|   |_|\___|_|  |_| |_| |_|_|_| |_|\__,_|_| PRO              " -ForegroundColor Cyan
    Write-Host "=====================================================================" -ForegroundColor Cyan
    Write-Host "   Multi-Platform Cross-Build Engine (Windows, Android, Linux, macOS)" -ForegroundColor DarkGray
    Write-Host "   Version: v$script:AppVersion | Target: $(if ($Target) { $Target } else { 'Interactive' })" -ForegroundColor Yellow
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
    } catch {
        Write-Host "  [!] npm was not found in PATH." -ForegroundColor Red
        return $false
    }

    # Check node_modules
    if (-not (Test-Path "$ScriptDir\node_modules")) {
        Write-Host "  [!] Project dependencies not found. Auto-installing via npm install..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            npm install --legacy-peer-deps
        }
        Write-Host "  [+] Dependencies installed successfully." -ForegroundColor Green
    }

    return $true
}

function Build-FrontendAndServer {
    Write-Host "`n[1/2] Compiling Vite Frontend & Node Server Bundle (v$script:AppVersion)..." -ForegroundColor Cyan
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
    Write-Host ">>> TARGET: Windows Desktop Application (v$script:AppVersion)`n" -ForegroundColor Yellow
    
    # Terminate any running instances or installers that could lock files
    Get-Process -Name "xTerminal", "electron" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
    
    # Clean temporary directories and previous installer files that could trigger file locks
    if (Test-Path "$ScriptDir\release") {
        Get-ChildItem -Path "$ScriptDir\release" -Filter "*Setup*.exe" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
        Get-ChildItem -Path "$ScriptDir\release" -Filter "*.nsis.7z" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
        Get-ChildItem -Path "$ScriptDir\release" -Filter "*.blockmap" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path "$ScriptDir\release\win-unpacked.tmp") {
        Remove-Item "$ScriptDir\release\win-unpacked.tmp" -Recurse -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path "$ScriptDir\release\win-unpacked") {
        Remove-Item "$ScriptDir\release\win-unpacked" -Recurse -Force -ErrorAction SilentlyContinue
    }

    # Backup any Android APKs if present so electron-builder doesn't wipe them
    $apkBackupDir = "$env:TEMP\xterminal-apk-backup"
    if (Test-Path "$ScriptDir\release") {
        New-Item -ItemType Directory -Path $apkBackupDir -Force | Out-Null
        Get-ChildItem -Path "$ScriptDir\release" -Filter "*.apk" | ForEach-Object {
            Copy-Item $_.FullName "$apkBackupDir\$($_.Name)" -Force
        }
    }

    Build-FrontendAndServer
    
    Write-Host "`n[2/2] Packaging Windows application via electron-builder..." -ForegroundColor Cyan
    $start = Get-Date
    cmd.exe /c "npx electron-builder --win nsis"
    $buildSuccess = ($LASTEXITCODE -eq 0)
    $elapsed = (Get-Date) - $start

    # Restore Android APKs if they were backed up
    if (Test-Path $apkBackupDir) {
        Get-ChildItem -Path $apkBackupDir -Filter "*.apk" | ForEach-Object {
            Copy-Item $_.FullName "$ScriptDir\release\$($_.Name)" -Force
        }
        Remove-Item $apkBackupDir -Recurse -Force -ErrorAction SilentlyContinue
    }

    if ($buildSuccess) {
        Write-Host "`n=====================================================================" -ForegroundColor Green
        Write-Host " [SUCCESS] Windows Desktop App built successfully in $([math]::Round($elapsed.TotalSeconds, 1))s!" -ForegroundColor Green
        Write-Host "=====================================================================" -ForegroundColor Green
        Write-Host "  Output Directory: $ScriptDir\release" -ForegroundColor White
        
        $installer = Get-ChildItem -Path "$ScriptDir\release" -Filter "*Setup*.exe" | Select-Object -First 1
        if ($installer) {
            Write-Host "  Setup Installer : release\$($installer.Name)" -ForegroundColor Cyan
        }
        if (Test-Path "$ScriptDir\release\win-unpacked\xTerminal.exe") {
            Write-Host "  Standalone .exe : release\win-unpacked\xTerminal.exe" -ForegroundColor Cyan
        }
        Write-Host ""
    } else {
        Write-Host "`n[!] Windows packaging encountered an error. Check logs above." -ForegroundColor Red
    }
}

function Build-Android {
    Show-Banner
    Write-Host ">>> TARGET: Android Mobile Application (v$script:AppVersion)`n" -ForegroundColor Yellow

    if (-not $env:ANDROID_HOME -and (Test-Path "$env:LOCALAPPDATA\Android\Sdk")) {
        $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
    }

    # Ensure local.properties exists for Gradle
    $localProp = "$ScriptDir\android\local.properties"
    $sdkDir = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
    $escapedSdk = $sdkDir -replace '\\', '\\'
    if (-not (Test-Path $localProp) -or (Get-Content $localProp -Raw) -notmatch "sdk.dir") {
        Set-Content -Path $localProp -Value "sdk.dir=$escapedSdk"
    }

    Write-Host "[1/3] Building Web Distribution for Android WebView..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { return }

    Write-Host "`n[2/3] Syncing Capacitor Android Project..." -ForegroundColor Cyan
    npx cap sync android
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Capacitor sync failed." -ForegroundColor Red
        return
    }

    Write-Host "`n[3/3] Compiling Native Android APK with Gradle..." -ForegroundColor Cyan
    if (Test-Path "$ScriptDir\android\gradlew.bat") {
        $start = Get-Date
        Push-Location "$ScriptDir\android"
        cmd.exe /c "gradlew.bat assembleDebug"
        Pop-Location
        $elapsed = (Get-Date) - $start

        $apkPath = "$ScriptDir\android\app\build\outputs\apk\debug\app-debug.apk"
        if (Test-Path $apkPath) {
            if (-not (Test-Path "$ScriptDir\release")) {
                New-Item -ItemType Directory -Path "$ScriptDir\release" -Force | Out-Null
            }
            $targetApk = "$ScriptDir\release\xTerminal-$script:AppVersion.apk"
            Copy-Item $apkPath $targetApk -Force

            Write-Host "`n=====================================================================" -ForegroundColor Green
            Write-Host " [SUCCESS] Android APK built successfully in $([math]::Round($elapsed.TotalSeconds, 1))s!" -ForegroundColor Green
            Write-Host "=====================================================================" -ForegroundColor Green
            Write-Host "  Release Package : release\xTerminal-$script:AppVersion.apk" -ForegroundColor Green
            Write-Host "  Size            : $([math]::Round((Get-Item $targetApk).Length / 1MB, 2)) MB" -ForegroundColor White
            Write-Host ""
        } else {
            Write-Host "`n[!] Failed to generate APK. Check Android build logs above." -ForegroundColor Red
        }
    } else {
        Write-Host "Android project synced. Run: npx cap open android to build in Android Studio." -ForegroundColor Yellow
    }
}

function Build-Linux {
    Show-Banner
    Write-Host ">>> TARGET: Linux Desktop Application (v$script:AppVersion)`n" -ForegroundColor Yellow

    Build-FrontendAndServer

    Write-Host "`n[2/2] Packaging Linux AppImage & .deb..." -ForegroundColor Cyan
    $start = Get-Date
    cmd.exe /c "npx electron-builder --linux AppImage deb --publish never"
    $elapsed = (Get-Date) - $start

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n=====================================================================" -ForegroundColor Green
        Write-Host " [SUCCESS] Linux packages generated successfully in $([math]::Round($elapsed.TotalSeconds, 1))s!" -ForegroundColor Green
        Write-Host " Output: $ScriptDir\release" -ForegroundColor White
    } else {
        Write-Host "`n[NOTE] Linux packaging on native Windows often requires WSL or Docker for .AppImage/.deb signing." -ForegroundColor Yellow
    }
}

function Build-MacOS {
    Show-Banner
    Write-Host ">>> TARGET: macOS Desktop Application (v$script:AppVersion)`n" -ForegroundColor Yellow

    Build-FrontendAndServer

    Write-Host "`n[2/2] Packaging macOS .dmg..." -ForegroundColor Cyan
    $start = Get-Date
    cmd.exe /c "npx electron-builder --mac dmg --publish never"
    $elapsed = (Get-Date) - $start

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n=====================================================================" -ForegroundColor Green
        Write-Host " [SUCCESS] macOS .dmg generated successfully in $([math]::Round($elapsed.TotalSeconds, 1))s!" -ForegroundColor Green
        Write-Host " Output: $ScriptDir\release" -ForegroundColor White
    } else {
        Write-Host "`n[NOTE] macOS .dmg bundling requires a macOS host or Darwin code-signing container." -ForegroundColor Yellow
    }
}

function Build-All {
    Show-Banner
    Write-Host ">>> STARTING ALL-PLATFORM BUILD SUITE (v$script:AppVersion)`n" -ForegroundColor Yellow
    $allStart = Get-Date

    Write-Host "================ [STAGE 1/4] Windows Desktop ================" -ForegroundColor Cyan
    Build-Windows

    Write-Host "`n================ [STAGE 2/4] Android Mobile ================" -ForegroundColor Cyan
    Build-Android

    Write-Host "`n================ [STAGE 3/4] Linux Desktop =================" -ForegroundColor Cyan
    Build-Linux

    Write-Host "`n================ [STAGE 4/4] macOS Desktop =================" -ForegroundColor Cyan
    Build-MacOS

    $totalElapsed = (Get-Date) - $allStart
    Write-Host "`n=====================================================================" -ForegroundColor Green
    Write-Host " [COMPLETED] All Platform Build Process finished in $([math]::Round($totalElapsed.TotalSeconds, 1))s!" -ForegroundColor Green
    Write-Host "=====================================================================" -ForegroundColor Green

    # Display Release Summary
    if (Test-Path "$ScriptDir\release") {
        Write-Host "`nGenerated Release Artifacts (release\):" -ForegroundColor Cyan
        Get-ChildItem -Path "$ScriptDir\release" | Where-Object { -not $_.PSIsContainer } | ForEach-Object {
            $mb = [math]::Round($_.Length / 1MB, 2)
            Write-Host "  - $($_.Name) ($mb MB)" -ForegroundColor White
        }
    }
    Write-Host ""
}

function Run-DevDesktop {
    Show-Banner
    Write-Host ">>> Starting xTerminal in Live Desktop Development Mode...`n" -ForegroundColor Cyan
    npm run build
    npx electron .
}

function Refresh-Icons {
    Show-Banner
    Write-Host ">>> Regenerating all multi-platform icons from public/logo.png...`n" -ForegroundColor Cyan
    node_modules\.bin\electron.cmd scripts\generate-icons.cjs
    Write-Host "`n[+] Multi-platform icons regenerated successfully." -ForegroundColor Green
}

function Prompt-ChangeVersion {
    Show-Banner
    Write-Host "Current App Version: v$script:AppVersion" -ForegroundColor Yellow
    Write-Host ""
    $newV = Read-Host "Enter new version number (e.g. 1.0.1, 1.1.0)"
    if ($newV -and $newV.Trim() -ne "") {
        Set-AppVersion $newV
        Write-Host "`nVersion successfully updated to v$script:AppVersion!" -ForegroundColor Green
        Start-Sleep -Seconds 1
    }
}

function Publish-GitHubRelease {
    Show-Banner
    Write-Host ">>> GitHub Multi-Platform Auto-Release (v$script:AppVersion)`n" -ForegroundColor Magenta

    Write-Host "This will:" -ForegroundColor White
    Write-Host "  1. Commit any pending changes to git" -ForegroundColor DarkGray
    Write-Host "  2. Create git tag: v$script:AppVersion" -ForegroundColor DarkGray
    Write-Host "  3. Push tag to GitHub (triggers GitHub Actions)" -ForegroundColor DarkGray
    Write-Host "  4. GitHub Actions will build:" -ForegroundColor DarkGray
    Write-Host "       Windows .exe  (windows-latest runner)" -ForegroundColor Cyan
    Write-Host "       Linux .deb + .AppImage  (ubuntu-latest runner)" -ForegroundColor Yellow
    Write-Host "       macOS .dmg   (macos-latest runner)" -ForegroundColor Magenta
    Write-Host "       Android .apk  (ubuntu-latest + Android SDK)" -ForegroundColor Green
    Write-Host "  5. Auto-create GitHub Release with all artifacts" -ForegroundColor DarkGray
    Write-Host ""

    $confirm = Read-Host "Continue? Tag and push v$script:AppVersion to GitHub? [y/N]"
    if ($confirm.ToLower() -ne "y") {
        Write-Host "Cancelled." -ForegroundColor DarkGray
        return
    }

    # Check git status
    Write-Host "`n[1/4] Checking git status..." -ForegroundColor Cyan
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        Write-Host "  [!] Uncommitted changes found. Committing them first..." -ForegroundColor Yellow
        git add -A
        git commit -m "chore: prepare release v$script:AppVersion"
        Write-Host "  [+] Changes committed." -ForegroundColor Green
    } else {
        Write-Host "  [+] Working tree is clean." -ForegroundColor Green
    }

    # Delete existing local tag if present
    Write-Host "`n[2/4] Creating git tag v$script:AppVersion..." -ForegroundColor Cyan
    $existingTag = git tag --list "v$script:AppVersion"
    if ($existingTag) {
        Write-Host "  [!] Tag v$script:AppVersion already exists locally. Deleting and recreating..." -ForegroundColor Yellow
        git tag -d "v$script:AppVersion" | Out-Null
    }
    git tag -a "v$script:AppVersion" -m "xTerminal Pro v$script:AppVersion — Multi-Platform Release"
    Write-Host "  [+] Tag v$script:AppVersion created." -ForegroundColor Green

    # Push commits
    Write-Host "`n[3/4] Pushing commits to GitHub..." -ForegroundColor Cyan
    git push origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [+] Commits pushed." -ForegroundColor Green
    }

    # Push tag (delete remote if exists first)
    Write-Host "`n[4/4] Pushing tag v$script:AppVersion to GitHub (triggers auto-release)..." -ForegroundColor Cyan
    git push origin "v$script:AppVersion" --force
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [+] Tag pushed successfully!" -ForegroundColor Green
    } else {
        Write-Host "  [!] Tag push failed. Check git remote access." -ForegroundColor Red
        return
    }

    Write-Host "`n=====================================================================" -ForegroundColor Magenta
    Write-Host " [SUCCESS] GitHub Actions release workflow triggered!" -ForegroundColor Green
    Write-Host "=====================================================================" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "  Monitor your build at:" -ForegroundColor White
    $repoUrl = git remote get-url origin
    $repoUrl = $repoUrl -replace '\.git$', ''
    Write-Host "  $repoUrl/actions" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Release will appear at:" -ForegroundColor White
    Write-Host "  $repoUrl/releases/tag/v$script:AppVersion" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Estimated build time: ~15-25 minutes (4 parallel runners)" -ForegroundColor DarkGray
    Write-Host ""
}

# --- Main CLI Dispatcher ---
if (!(Test-Prerequisites)) {
    Read-Host "`nPress Enter to exit..."
    exit 1
}

if ($Target -ne "") {
    switch ($Target.ToLower()) {
        "win"     { Build-Windows; exit }
        "windows" { Build-Windows; exit }
        "android" { Build-Android; exit }
        "linux"   { Build-Linux; exit }
        "mac"     { Build-MacOS; exit }
        "macos"   { Build-MacOS; exit }
        "all"     { Build-All; exit }
        "release" { Publish-GitHubRelease; exit }
        default   { Write-Host "Unknown target: $Target" -ForegroundColor Red; exit 1 }
    }
}

# Interactive Menu Loop
do {
    Show-Banner
    Write-Host "Select a target platform or utility to build:" -ForegroundColor White
    Write-Host ""
    Write-Host "  [1]  Windows Desktop       (.exe Installer & Portable win-unpacked)" -ForegroundColor Cyan
    Write-Host "  [2]  Android App           (Capacitor / Android Native APK)" -ForegroundColor Green
    Write-Host "  [3]  Linux Desktop         (.AppImage & Debian .deb)" -ForegroundColor Yellow
    Write-Host "  [4]  macOS Desktop         (.dmg Installer)" -ForegroundColor Magenta
    Write-Host "  [5]  Build All Targets     (Complete Multi-Platform Packaging Suite)" -ForegroundColor White
    Write-Host "  -------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  [6]  Launch Desktop App    (Run locally via Electron)" -ForegroundColor DarkCyan
    Write-Host "  [7]  Regenerate Icons      (Refresh .ico, .png, Android, Web icons)" -ForegroundColor DarkGray
    Write-Host "  [8]  Change Version        (Current: v$script:AppVersion)" -ForegroundColor Yellow
    Write-Host "  [9]  GitHub Auto-Release   (Tag + Push -> GitHub Actions builds all platforms)" -ForegroundColor Magenta
    Write-Host "  [0]  Exit" -ForegroundColor Red
    Write-Host ""
    
    $choice = Read-Host "Enter option number [0-9]"
    
    switch ($choice) {
        "1" { Build-Windows; Pause }
        "2" { Build-Android; Pause }
        "3" { Build-Linux; Pause }
        "4" { Build-MacOS; Pause }
        "5" { Build-All; Pause }
        "6" { Run-DevDesktop; Pause }
        "7" { Refresh-Icons; Pause }
        "8" { Prompt-ChangeVersion }
        "9" { Publish-GitHubRelease; Pause }
        "0" { Write-Host "`nExiting builder. Good bye!" -ForegroundColor DarkGray; break }
        default { Write-Host "Invalid option. Please choose between 0 and 9." -ForegroundColor Red; Start-Sleep -Seconds 1 }
    }
} while ($choice -ne "0")

