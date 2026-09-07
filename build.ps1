<#
.SYNOPSIS
    xTerminal - Multi-Platform Interactive Build & Packaging Utility
.DESCRIPTION
    Builds Windows (.exe), Android Debug APK (.apk), Google Play Store Bundle (.aab), Linux (.AppImage / .deb / .snap), and macOS (.dmg).
    Supports dynamic versioning across package.json, Android gradle, and release filenames.
.PARAMETER Target
    Target platform: win, windows, android, apk, aab, playstore, linux, mac, macos, all, release.
.PARAMETER Version
    Optional version string (e.g. 1.0.0, 1.2.3). Updates package.json and Android build.gradle if specified.
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

function New-AndroidKeystore {
    Write-Host "`n--- Setup Android Play Store Release Keystore ---" -ForegroundColor Cyan
    Write-Host "This creates an official cryptographic key (.jks) required by Google Play Store." -ForegroundColor DarkGray
    $alias = Read-Host "Enter Key Alias (Press Enter for default: 'xterminal')"
    if (-not $alias -or $alias.Trim() -eq "") { $alias = "xterminal" }
    
    $rawPass = Read-Host "Enter Keystore Password (min 6 characters)"
    if (-not $rawPass -or $rawPass.Trim().Length -lt 6) {
        Write-Host "[!] Password must be at least 6 characters long." -ForegroundColor Red
        return $false
    }

    $keystorePath = "$ScriptDir\android\xterminal-release-key.jks"
    $dname = "CN=Lyarinet, OU=Mobile, O=Lyarinet, L=Karachi, ST=Sindh, C=PK"

    Write-Host "`nGenerating keystore with Java keytool..." -ForegroundColor Cyan
    & keytool -genkeypair -v -keystore $keystorePath -alias $alias -keyalg RSA -keysize 2048 -validity 10000 -storepass $rawPass -keypass $rawPass -dname $dname

    if (Test-Path $keystorePath) {
        $props = "storeFile=../xterminal-release-key.jks`r`nstorePassword=$rawPass`r`nkeyAlias=$alias`r`nkeyPassword=$rawPass`r`n"
        $propFile = "$ScriptDir\android\keystore.properties"
        [System.IO.File]::WriteAllText($propFile, $props, (New-Object System.Text.UTF8Encoding($false)))
        Write-Host "`n[SUCCESS] Keystore created: android\xterminal-release-key.jks" -ForegroundColor Green
        Write-Host "[SUCCESS] Keystore properties written: android\keystore.properties" -ForegroundColor Green
        Write-Host "[!]  IMPORTANT: Keep xterminal-release-key.jks safe! It is already added to .gitignore." -ForegroundColor Yellow
        return $true
    } else {
        Write-Host "[!] Failed to generate keystore. Ensure Java JDK 'keytool' is available in your PATH." -ForegroundColor Red
        return $false
    }
}

function Build-AndroidPlayStore {
    Show-Banner
    Write-Host ">>> TARGET: Android Google Play Store App Bundle (.aab) (v$script:AppVersion)`n" -ForegroundColor Yellow

    # Interactive Version Confirmation / Update
    Write-Host "Current App Version: v$script:AppVersion" -ForegroundColor Cyan
    $vPrompt = Read-Host "Enter version to build for Play Store (or press Enter to keep v$script:AppVersion)"
    if ($vPrompt -and $vPrompt.Trim() -ne "") {
        Set-AppVersion $vPrompt.Trim()
    }

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

    # Check for Keystore signing
    $keystoreProp = "$ScriptDir\android\keystore.properties"
    $keystoreJks = "$ScriptDir\android\xterminal-release-key.jks"
    if (-not (Test-Path $keystoreProp) -and -not (Test-Path $keystoreJks)) {
        Write-Host "`nNo release signing keystore detected. What would you like to do?" -ForegroundColor Yellow
        Write-Host "  [1] Generate a new Play Store release keystore (.jks) now" -ForegroundColor Cyan
        Write-Host "  [2] Continue with unsigned App Bundle (for Google Play App Signing)" -ForegroundColor White
        Write-Host "  [3] Cancel" -ForegroundColor DarkGray
        $kChoice = Read-Host "`nChoose an option [1-3] (Default: 2)"
        if ($kChoice -eq "1") {
            $created = New-AndroidKeystore
            if (-not $created) {
                Write-Host "Continuing with unsigned bundle..." -ForegroundColor Yellow
            }
        } elseif ($kChoice -eq "3") {
            Write-Host "Build cancelled." -ForegroundColor Yellow
            return
        }
    } else {
        Write-Host "`n  [+] Release signing keystore detected." -ForegroundColor Green
        $reKey = Read-Host "Use existing keystore? [Y/n] (Enter 'n' to generate a new keystore)"
        if ($reKey -eq "n" -or $reKey -eq "N") {
            New-AndroidKeystore
        }
    }

    Write-Host "`n[1/3] Building Web Distribution for Android WebView..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { return }

    Write-Host "`n[2/3] Syncing Capacitor Android Project (App ID: com.lyarinet.xterminal)..." -ForegroundColor Cyan
    npx cap sync android
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Capacitor sync failed." -ForegroundColor Red
        return
    }

    Write-Host "`n[3/3] Compiling Google Play App Bundle (.aab) with Gradle..." -ForegroundColor Cyan
    if (Test-Path "$ScriptDir\android\gradlew.bat") {
        $start = Get-Date
        Push-Location "$ScriptDir\android"
        cmd.exe /c "gradlew.bat bundleRelease"
        $gradleExit = $LASTEXITCODE
        Pop-Location
        $elapsed = (Get-Date) - $start

        # Check output bundle in android/app/build/outputs/bundle/release
        $aabDir = "$ScriptDir\android\app\build\outputs\bundle\release"
        $aabFile = Get-ChildItem -Path $aabDir -Filter "*.aab" -ErrorAction SilentlyContinue | Select-Object -First 1

        if ($aabFile -and (Test-Path $aabFile.FullName)) {
            if (-not (Test-Path "$ScriptDir\release")) {
                New-Item -ItemType Directory -Path "$ScriptDir\release" -Force | Out-Null
            }
            $targetAab = "$ScriptDir\release\xTerminal-$script:AppVersion-playstore.aab"
            Copy-Item $aabFile.FullName $targetAab -Force

            Write-Host "`n=====================================================================" -ForegroundColor Green
            Write-Host " [SUCCESS] Google Play Store Bundle (.aab) generated successfully in $([math]::Round($elapsed.TotalSeconds, 1))s!" -ForegroundColor Green
            Write-Host "=====================================================================" -ForegroundColor Green
            Write-Host "  Release Bundle : release\xTerminal-$script:AppVersion-playstore.aab" -ForegroundColor Green
            $curVCode = "10203"
            $gFile = "$ScriptDir\android\app\build.gradle"
            if (Test-Path $gFile) {
                $gMatch = Select-String -Path $gFile -Pattern 'versionCode\s+(\d+)'
                if ($gMatch -and $gMatch.Matches.Groups.Count -gt 1) {
                    $curVCode = $gMatch.Matches.Groups[1].Value
                }
            }
            Write-Host "  Package ID     : com.lyarinet.xterminal" -ForegroundColor White
            Write-Host "  Version Code   : $curVCode (v$script:AppVersion)" -ForegroundColor White
            Write-Host "  Size           : $([math]::Round((Get-Item $targetAab).Length / 1MB, 2)) MB" -ForegroundColor White
            Write-Host ""
            Write-Host "  [*] HOW TO UPLOAD TO GOOGLE PLAY CONSOLE:" -ForegroundColor Yellow
            Write-Host "  1. Open Google Play Console: https://play.google.com/console" -ForegroundColor Cyan
            Write-Host "  2. Select/Create your app with package: com.lyarinet.xterminal" -ForegroundColor White
            Write-Host "  3. Go to: Production (or Internal testing) -> Create new release" -ForegroundColor White
            Write-Host "  4. Drag and drop: release\xTerminal-$script:AppVersion-playstore.aab" -ForegroundColor White
            Write-Host "  5. Review and roll out release!" -ForegroundColor Green
            Write-Host "=====================================================================`n" -ForegroundColor Green
        } else {
            Write-Host "`n[!] Failed to generate .aab bundle. Check Android build logs above." -ForegroundColor Red
        }
    } else {
        Write-Host "Gradle wrapper not found in android/." -ForegroundColor Red
    }
}

function Build-Linux {
    Show-Banner
    Write-Host ">>> TARGET: Linux Desktop Application (v$script:AppVersion)`n" -ForegroundColor Yellow

    Build-FrontendAndServer

    Write-Host "`n[2/2] Packaging Linux AppImage, .deb and Canonical .snap..." -ForegroundColor Cyan
    $start = Get-Date
    cmd.exe /c "npx electron-builder --linux AppImage deb snap --publish never"
    $elapsed = (Get-Date) - $start

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n=====================================================================" -ForegroundColor Green
        Write-Host " [SUCCESS] Linux packages (.AppImage, .deb, .snap) generated successfully in $([math]::Round($elapsed.TotalSeconds, 1))s!" -ForegroundColor Green
        Write-Host " Output: $ScriptDir\release" -ForegroundColor White
    } else {
        Write-Host "`n[NOTE] Linux packaging on native Windows often requires WSL or Docker for Linux snap/AppImage/deb bundling." -ForegroundColor Yellow
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
    git tag -a "v$script:AppVersion" -m "xTerminal Pro v$script:AppVersion - Multi-Platform Release"
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
        "win"       { Build-Windows; exit }
        "windows"   { Build-Windows; exit }
        "android"   { Build-Android; exit }
        "apk"       { Build-Android; exit }
        "aab"       { Build-AndroidPlayStore; exit }
        "playstore" { Build-AndroidPlayStore; exit }
        "bundle"    { Build-AndroidPlayStore; exit }
        "linux"     { Build-Linux; exit }
        "mac"       { Build-MacOS; exit }
        "macos"     { Build-MacOS; exit }
        "all"       { Build-All; exit }
        "release"   { Publish-GitHubRelease; exit }
        default     { Write-Host "Unknown target: $Target" -ForegroundColor Red; exit 1 }
    }
}

# Interactive Menu Loop
do {
    Show-Banner
    Write-Host "Select a target platform or utility to build:" -ForegroundColor White
    Write-Host ""
    Write-Host "  [1]   Windows Desktop              (.exe Installer & Portable win-unpacked)" -ForegroundColor Cyan
    Write-Host "  [2]   Android APK (Debug)          (Local testing APK on emulator / phone)" -ForegroundColor Green
    Write-Host "  [3]   Android Google Play (.aab)   (Production App Bundle for Google Play Store)" -ForegroundColor Green
    Write-Host "  [4]   Linux Desktop                (.AppImage, Debian .deb & Canonical .snap)" -ForegroundColor Yellow
    Write-Host "  [5]   macOS Desktop                (.dmg Installer)" -ForegroundColor Magenta
    Write-Host "  [6]   Build All Targets            (Complete Multi-Platform Packaging Suite)" -ForegroundColor White
    Write-Host "  -------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  [7]   Launch Desktop App           (Run locally via Electron)" -ForegroundColor DarkCyan
    Write-Host "  [8]   Regenerate Icons             (Refresh .ico, .png, Android, Web icons)" -ForegroundColor DarkGray
    Write-Host "  [9]   Change Version               (Current: v$script:AppVersion)" -ForegroundColor Yellow
    Write-Host "  [10]  GitHub Auto-Release          (Tag + Push -> GitHub Actions builds all platforms)" -ForegroundColor Magenta
    Write-Host "  [0]   Exit" -ForegroundColor Red
    Write-Host ""
    
    $choice = Read-Host "Enter option number [0-10]"
    
    switch ($choice) {
        "1"  { Build-Windows; Pause }
        "2"  { Build-Android; Pause }
        "3"  { Build-AndroidPlayStore; Pause }
        "4"  { Build-Linux; Pause }
        "5"  { Build-MacOS; Pause }
        "6"  { Build-All; Pause }
        "7"  { Run-DevDesktop; Pause }
        "8"  { Refresh-Icons; Pause }
        "9"  { Prompt-ChangeVersion }
        "10" { Publish-GitHubRelease; Pause }
        "0"  { Write-Host "`nExiting builder. Good bye!" -ForegroundColor DarkGray; break }
        default { Write-Host "Invalid option. Please choose between 0 and 10." -ForegroundColor Red; Start-Sleep -Seconds 1 }
    }
} while ($choice -ne "0")

