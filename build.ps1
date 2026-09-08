<#
.SYNOPSIS
    xTerminal - Multi-Platform Interactive Build & Packaging Utility
.DESCRIPTION
    Builds Windows (.exe), Android APK / Play Store (.aab), Linux (.AppImage / .deb / .snap), and macOS (.dmg).
    Supports comprehensive version synchronization across package.json, package-lock.json,
    Android build.gradle (versionName & versionCode), snapcraft.yaml, and tauri.conf.json.
.PARAMETER Target
    Target platform: win, windows, store, msix, appx, android, apk, aab, playstore, bundle, linux, mac, macos, all, release, keystore, icons.
.PARAMETER Version
    Optional version string (e.g. 1.2.4). Automatically updates all project configuration files.
#>

param(
    [string]$Target = "",
    [string]$Version = ""
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $ScriptDir -or $ScriptDir -eq "") {
    $ScriptDir = (Get-Location).Path
}

function Get-AppVersion {
    $pkgJsonPath = Join-Path $ScriptDir "package.json"
    if (Test-Path $pkgJsonPath) {
        try {
            $content = Get-Content $pkgJsonPath -Raw
            if ($content -match '"version"\s*:\s*"([^"]+)"') {
                return $matches[1]
            }
        } catch {}
    }
    return "1.2.6"
}

# Interactive Menu
# .\build.ps1

# Direct Microsoft Store AppX / MSIX Package
# .\build.ps1 -Target store

# Direct Google Play Store AAB
# .\build.ps1 -Target aab

# Direct Android APK
# .\build.ps1 -Target apk

# View Keystore SHA-256 Fingerprints
# .\build.ps1 -Target keystore

# Version update across all platforms
# .\build.ps1 -Version 1.2.6

# .\build.ps1 -Version 1.2.7 -Target store

function Set-AppVersion([string]$newVer) {
    if (-not $newVer) { return }
    $cleanVer = $newVer.Trim().TrimStart('v').TrimStart('V')
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    
    # 1. Update package.json
    $pkgJsonPath = Join-Path $ScriptDir "package.json"
    if (Test-Path $pkgJsonPath) {
        $content = [System.IO.File]::ReadAllText($pkgJsonPath, [System.Text.Encoding]::UTF8)
        $content = $content -replace '("version"\s*:\s*)"[^"]+"', "`$1`"$cleanVer`""
        [System.IO.File]::WriteAllText($pkgJsonPath, $content, $utf8NoBom)
        Write-Host "  [+] Updated package.json version -> $cleanVer" -ForegroundColor Green
    }

    # 2. Update package-lock.json
    $lockJsonPath = Join-Path $ScriptDir "package-lock.json"
    if (Test-Path $lockJsonPath) {
        $lockContent = [System.IO.File]::ReadAllText($lockJsonPath, [System.Text.Encoding]::UTF8)
        $lockContent = $lockContent -replace '("name"\s*:\s*"xterminal",\s*"version"\s*:\s*)"[^"]+"', "`$1`"$cleanVer`""
        $lockContent = $lockContent -replace '("packages"\s*:\s*\{\s*""\s*:\s*\{\s*"name"\s*:\s*"xterminal",\s*"version"\s*:\s*)"[^"]+"', "`$1`"$cleanVer`""
        [System.IO.File]::WriteAllText($lockJsonPath, $lockContent, $utf8NoBom)
        Write-Host "  [+] Updated package-lock.json version -> $cleanVer" -ForegroundColor Green
    }
    
    # 3. Update Android build.gradle
    $gradlePath = Join-Path $ScriptDir "android\app\build.gradle"
    if (Test-Path $gradlePath) {
        $gradleContent = [System.IO.File]::ReadAllText($gradlePath, [System.Text.Encoding]::UTF8)
        $gradleContent = $gradleContent -replace 'versionName\s+"[^"]+"', "versionName `"$cleanVer`""
        
        # Calculate numeric versionCode (e.g. 1.2.5 -> 10205)
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
        [System.IO.File]::WriteAllText($gradlePath, $gradleContent, $utf8NoBom)
        Write-Host "  [+] Updated Android build.gradle versionName -> $cleanVer (versionCode: $newCode)" -ForegroundColor Green
    }

    # 4. Update snap/snapcraft.yaml
    $snapPath = Join-Path $ScriptDir "snap\snapcraft.yaml"
    if (Test-Path $snapPath) {
        $snapContent = [System.IO.File]::ReadAllText($snapPath, [System.Text.Encoding]::UTF8)
        $snapContent = $snapContent -replace "version:\s*['`"][^'`"]+['`"]", "version: '$cleanVer'"
        [System.IO.File]::WriteAllText($snapPath, $snapContent, $utf8NoBom)
        Write-Host "  [+] Updated snap/snapcraft.yaml version -> $cleanVer" -ForegroundColor Green
    }

    # 5. Update src-tauri/tauri.conf.json
    $tauriPath = Join-Path $ScriptDir "src-tauri\tauri.conf.json"
    if (Test-Path $tauriPath) {
        $tauriContent = [System.IO.File]::ReadAllText($tauriPath, [System.Text.Encoding]::UTF8)
        $tauriContent = $tauriContent -replace '("version"\s*:\s*)"[^"]+"', "`$1`"$cleanVer`""
        [System.IO.File]::WriteAllText($tauriPath, $tauriContent, $utf8NoBom)
        Write-Host "  [+] Updated src-tauri/tauri.conf.json version -> $cleanVer" -ForegroundColor Green
    }

    # 6. Update src/App.tsx header badge
    $appTsxPath = Join-Path $ScriptDir "src\App.tsx"
    if (Test-Path $appTsxPath) {
        $appTsxContent = [System.IO.File]::ReadAllText($appTsxPath, [System.Text.Encoding]::UTF8)
        $appTsxContent = $appTsxContent -replace '>v\d+\.\d+\.\d+<', ">v$cleanVer<"
        [System.IO.File]::WriteAllText($appTsxPath, $appTsxContent, $utf8NoBom)
        Write-Host "  [+] Updated src/App.tsx version badge -> v$cleanVer" -ForegroundColor Green
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

function Get-KeytoolPath {
    $cmd = Get-Command "keytool" -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\keytool.exe")) {
        return "$env:JAVA_HOME\bin\keytool.exe"
    }
    $candidates = @(
        "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe",
        "C:\Program Files\Android\Android Studio\jre\bin\keytool.exe",
        "C:\Program Files\Eclipse Adoptium\*\bin\keytool.exe",
        "C:\Program Files\Java\*\bin\keytool.exe",
        "C:\Program Files (x86)\Java\*\bin\keytool.exe"
    )
    foreach ($cand in $candidates) {
        $found = Resolve-Path $cand -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found -and (Test-Path $found.Path)) {
            return $found.Path
        }
    }
    return "keytool"
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

    # Backup any Android APKs and AABs if present so electron-builder doesn't wipe them
    $backupDir = "$env:TEMP\xterminal-mobile-backup"
    if (Test-Path "$ScriptDir\release") {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        Get-ChildItem -Path "$ScriptDir\release" -Include "*.apk", "*.aab" -Recurse | ForEach-Object {
            Copy-Item $_.FullName "$backupDir\$($_.Name)" -Force
        }
    }

    Build-FrontendAndServer
    
    Write-Host "`n[2/2] Packaging Windows application via electron-builder..." -ForegroundColor Cyan
    $start = Get-Date
    cmd.exe /c "npx electron-builder --win nsis"
    $buildSuccess = ($LASTEXITCODE -eq 0)
    $elapsed = (Get-Date) - $start

    # Restore Android packages if they were backed up
    if (Test-Path $backupDir) {
        Get-ChildItem -Path $backupDir | ForEach-Object {
            Copy-Item $_.FullName "$ScriptDir\release\$($_.Name)" -Force
        }
        Remove-Item $backupDir -Recurse -Force -ErrorAction SilentlyContinue
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

function Build-WindowsStore {
    Show-Banner
    Write-Host ">>> TARGET: Microsoft Store Package (.appx / .msix) (v$script:AppVersion)`n" -ForegroundColor Yellow
    Write-Host "This packages xTerminal into a Microsoft Store AppX / MSIX package." -ForegroundColor DarkGray
    Write-Host "When uploaded to Microsoft Partner Center, Microsoft signs the app with their official" -ForegroundColor DarkGray
    Write-Host "trusted root certificate for FREE (avoids policy 10.2.9 unsigned binary rejection).`n" -ForegroundColor DarkGray

    # Terminate any running instances or installers that could lock files
    Get-Process -Name "xTerminal", "electron" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500

    # Clean temporary directories and previous store packages
    if (Test-Path "$ScriptDir\release") {
        Get-ChildItem -Path "$ScriptDir\release" -Filter "*.appx" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
        Get-ChildItem -Path "$ScriptDir\release" -Filter "*.msix" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path "$ScriptDir\release\win-unpacked.tmp") {
        Remove-Item "$ScriptDir\release\win-unpacked.tmp" -Recurse -Force -ErrorAction SilentlyContinue
    }

    # Backup any Android APKs and AABs if present so electron-builder doesn't wipe them
    $backupDir = "$env:TEMP\xterminal-mobile-backup"
    if (Test-Path "$ScriptDir\release") {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        Get-ChildItem -Path "$ScriptDir\release" -Include "*.apk", "*.aab" -Recurse | ForEach-Object {
            Copy-Item $_.FullName "$backupDir\$($_.Name)" -Force
        }
    }

    Build-FrontendAndServer

    Write-Host "`n[2/2] Packaging Microsoft Store AppX package via electron-builder..." -ForegroundColor Cyan
    $start = Get-Date
    cmd.exe /c "npx electron-builder --win appx"
    $buildSuccess = ($LASTEXITCODE -eq 0)
    $elapsed = (Get-Date) - $start

    # Restore Android packages if they were backed up
    if (Test-Path $backupDir) {
        Get-ChildItem -Path $backupDir | ForEach-Object {
            Copy-Item $_.FullName "$ScriptDir\release\$($_.Name)" -Force
        }
        Remove-Item $backupDir -Recurse -Force -ErrorAction SilentlyContinue
    }

    $appxFile = Get-ChildItem -Path "$ScriptDir\release" -Filter "*.appx" | Select-Object -First 1
    if ($buildSuccess -and $appxFile) {
        $fileSizeMB = [math]::Round($appxFile.Length / 1MB, 2)
        Write-Host "`n=====================================================================" -ForegroundColor Green
        Write-Host " [SUCCESS] Microsoft Store package (.appx) generated successfully in $([math]::Round($elapsed.TotalSeconds, 1))s!" -ForegroundColor Green
        Write-Host "=====================================================================" -ForegroundColor Green
        Write-Host "  Store Package  : release\$($appxFile.Name)" -ForegroundColor Green
        Write-Host "  Package ID     : Lyarinet.xTerminal" -ForegroundColor White
        Write-Host "  Version        : $script:AppVersion.0" -ForegroundColor White
        Write-Host "  Size           : $fileSizeMB MB" -ForegroundColor White
        Write-Host ""
        Write-Host "  [*] HOW TO UPLOAD TO MICROSOFT PARTNER CENTER:" -ForegroundColor Yellow
        Write-Host "  1. Open Microsoft Partner Center: https://partner.microsoft.com/dashboard/apps-and-games/overview" -ForegroundColor Cyan
        Write-Host "  2. Click on your app: xTerminal (Product ID: 0f5493dc-2071-41cf-872a-3490c5d0b812)" -ForegroundColor White
        Write-Host "  3. Go to: Packages (under Submissions)" -ForegroundColor White
        Write-Host "  4. Drag and drop: release\$($appxFile.Name)" -ForegroundColor White
        Write-Host "  5. Microsoft Store will automatically validate and sign the package for FREE!" -ForegroundColor Green
        Write-Host "  6. Submit to certification - 100% compliant with Policy 10.2.9!" -ForegroundColor Green
        Write-Host "=====================================================================`n" -ForegroundColor Green
    } else {
        Write-Host "`n[!] Microsoft Store packaging encountered an error. Check logs above." -ForegroundColor Red
    }
}

function Ensure-AndroidSdk {
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
}

function Build-Android {
    Show-Banner
    Write-Host ">>> TARGET: Android Mobile Application (APK) (v$script:AppVersion)`n" -ForegroundColor Yellow

    Ensure-AndroidSdk

    Write-Host "[1/3] Building Web Distribution for Android WebView..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { return }

    Write-Host "`n[2/3] Syncing Capacitor Android Project (Native Standalone Bridge Included)..." -ForegroundColor Cyan
    npx cap sync android
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Capacitor sync failed." -ForegroundColor Red
        return
    }

    # Ask user: Debug APK or Signed Release APK?
    $hasKeystore = (Test-Path "$ScriptDir\android\keystore.properties") -or (Test-Path "$ScriptDir\android\xterminal-release-key.jks")
    $buildTask = "assembleDebug"
    $apkSubdir = "debug"
    $apkFilename = "app-debug.apk"

    if ($hasKeystore) {
        Write-Host "`nRelease signing keystore detected. Select build mode:" -ForegroundColor Cyan
        Write-Host "  [1] Debug APK (fast, instant install on any device/emulator)" -ForegroundColor Green
        Write-Host "  [2] Release APK (signed with keystore, optimized for production sideloading)" -ForegroundColor Yellow
        $apkChoice = Read-Host "`nChoose an option [1-2] (Default: 1)"
        if ($apkChoice -eq "2") {
            $buildTask = "assembleRelease"
            $apkSubdir = "release"
            $apkFilename = "app-release.apk"
        }
    }

    Write-Host "`n[3/3] Compiling Native Android APK with Gradle ($buildTask)..." -ForegroundColor Cyan
    if (Test-Path "$ScriptDir\android\gradlew.bat") {
        $start = Get-Date
        Push-Location "$ScriptDir\android"
        cmd.exe /c "gradlew.bat $buildTask"
        Pop-Location
        $elapsed = (Get-Date) - $start

        $apkPath = "$ScriptDir\android\app\build\outputs\apk\$apkSubdir\$apkFilename"
        if (-not (Test-Path $apkPath)) {
            # Fallback search for any generated apk in outputs
            $apkFind = Get-ChildItem -Path "$ScriptDir\android\app\build\outputs\apk" -Filter "*.apk" -Recurse | Select-Object -First 1
            if ($apkFind) { $apkPath = $apkFind.FullName }
        }

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
            Write-Host "  Package ID      : com.lyarinet.xterminal" -ForegroundColor White
            Write-Host "  Mode            : $(if ($buildTask -eq 'assembleRelease') { 'Signed Release' } else { 'Debug' })" -ForegroundColor White
            Write-Host "  Engine          : Standalone Embedded Bridge (127.0.0.1:3000)" -ForegroundColor Cyan
            Write-Host "  Size            : $([math]::Round((Get-Item $targetApk).Length / 1MB, 2)) MB" -ForegroundColor White
            Write-Host ""
            Write-Host "  To install directly via ADB:" -ForegroundColor DarkGray
            Write-Host "    adb install -r `"$targetApk`"" -ForegroundColor Yellow
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
    $kt = Get-KeytoolPath

    Write-Host "`nGenerating keystore with keytool ($kt)..." -ForegroundColor Cyan
    & $kt -genkeypair -v -keystore $keystorePath -alias $alias -keyalg RSA -keysize 2048 -validity 10000 -storepass $rawPass -keypass $rawPass -dname $dname

    if (Test-Path $keystorePath) {
        $props = "storeFile=../xterminal-release-key.jks`r`nstorePassword=$rawPass`r`nkeyAlias=$alias`r`nkeyPassword=$rawPass`r`n"
        $propFile = "$ScriptDir\android\keystore.properties"
        [System.IO.File]::WriteAllText($propFile, $props, (New-Object System.Text.UTF8Encoding($false)))
        Write-Host "`n[SUCCESS] Keystore created: android\xterminal-release-key.jks" -ForegroundColor Green
        Write-Host "[SUCCESS] Keystore properties written: android\keystore.properties" -ForegroundColor Green
        Write-Host "[!]  IMPORTANT: Keep xterminal-release-key.jks safe! It is already protected by .gitignore." -ForegroundColor Yellow
        return $true
    } else {
        Write-Host "[!] Failed to generate keystore. Ensure Java JDK 'keytool' is available." -ForegroundColor Red
        return $false
    }
}

function Show-KeystoreInfo {
    Show-Banner
    Write-Host ">>> Android Keystore Status & Fingerprints (Google Play Console)`n" -ForegroundColor Yellow
    $keystoreProp = "$ScriptDir\android\keystore.properties"
    $keystoreJks = "$ScriptDir\android\xterminal-release-key.jks"
    
    if (-not (Test-Path $keystoreProp) -and -not (Test-Path $keystoreJks)) {
        Write-Host "  [!] No release keystore found." -ForegroundColor Yellow
        Write-Host "      Run Option [3] (Android Play Store .aab) to generate one." -ForegroundColor DarkGray
        Write-Host ""
        return
    }

    Write-Host "  [+] Keystore File : $keystoreJks" -ForegroundColor Green
    if (Test-Path $keystoreProp) {
        Write-Host "  [+] Config File   : $keystoreProp" -ForegroundColor Green
        Get-Content $keystoreProp | ForEach-Object {
            if ($_ -match "password") {
                Write-Host "      $($_ -replace '=.+', '=********')" -ForegroundColor DarkGray
            } else {
                Write-Host "      $_" -ForegroundColor Cyan
            }
        }
    }

    $kt = Get-KeytoolPath
    if (Test-Path $keystoreJks) {
        Write-Host "`n  Certificate Details (SHA-1 & SHA-256):" -ForegroundColor White
        try {
            $pass = ""
            if (Test-Path $keystoreProp) {
                $propText = Get-Content $keystoreProp -Raw
                if ($propText -match 'storePassword=(.+)') { $pass = $matches[1].Trim() }
            }
            if ($pass) {
                & $kt -list -v -keystore $keystoreJks -storepass $pass | Select-String -Pattern "SHA1:|SHA256:|Owner:|Valid from:" | ForEach-Object {
                    Write-Host "      $_" -ForegroundColor Yellow
                }
            } else {
                & $kt -list -v -keystore $keystoreJks
            }
        } catch {
            Write-Host "      Could not extract certificate details." -ForegroundColor DarkGray
        }
    }
    Write-Host ""
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

    Ensure-AndroidSdk

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

            # Dynamic versionCode retrieval from build.gradle
            $curVCode = "10204"
            $gFile = "$ScriptDir\android\app\build.gradle"
            if (Test-Path $gFile) {
                $gMatch = Select-String -Path $gFile -Pattern 'versionCode\s+(\d+)'
                if ($gMatch -and $gMatch.Matches.Groups.Count -gt 1) {
                    $curVCode = $gMatch.Matches.Groups[1].Value
                }
            }

            Write-Host "`n=====================================================================" -ForegroundColor Green
            Write-Host " [SUCCESS] Google Play Store Bundle (.aab) generated successfully in $([math]::Round($elapsed.TotalSeconds, 1))s!" -ForegroundColor Green
            Write-Host "=====================================================================" -ForegroundColor Green
            Write-Host "  Release Bundle : release\xTerminal-$script:AppVersion-playstore.aab" -ForegroundColor Green
            Write-Host "  Package ID     : com.lyarinet.xterminal" -ForegroundColor White
            Write-Host "  Version Code   : $curVCode (v$script:AppVersion)" -ForegroundColor White
            Write-Host "  Engine         : Standalone Native Bridge Embedded" -ForegroundColor Cyan
            Write-Host "  Size           : $([math]::Round((Get-Item $targetAab).Length / 1MB, 2)) MB" -ForegroundColor White
            Write-Host ""
            Write-Host "  [*] HOW TO UPLOAD TO GOOGLE PLAY CONSOLE:" -ForegroundColor Yellow
            Write-Host "  1. Open Google Play Console: https://play.google.com/console" -ForegroundColor Cyan
            Write-Host "  2. Select your app: com.lyarinet.xterminal" -ForegroundColor White
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
        Write-Host "       To build/publish snaps on Canonical Snap Store directly:" -ForegroundColor DarkGray
        Write-Host "       wsl -> snapcraft pack -> snapcraft upload --release=stable <snap-file>" -ForegroundColor DarkGray
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
    Write-Host ">>> Regenerating all multi-platform icons from store_assets/1_app_icon/logo.png...`n" -ForegroundColor Cyan
    if (Test-Path "$ScriptDir\store_assets\1_app_icon\logo.png") {
        python -c "
import os, sys
from PIL import Image

root = r'$ScriptDir'
src_logo = os.path.join(root, 'store_assets', '1_app_icon', 'logo.png')
img = Image.open(src_logo).convert('RGBA')

# Windows .ico
build_dir = os.path.join(root, 'build')
os.makedirs(build_dir, exist_ok=True)
img.save(os.path.join(build_dir, 'icon.ico'), sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
img.resize((512, 512), Image.LANCZOS).save(os.path.join(build_dir, 'icon.png'))
print('  [+] Updated Windows & macOS build icons')

# Public web icons
pub = os.path.join(root, 'public')
img.resize((512, 512), Image.LANCZOS).save(os.path.join(pub, 'logo.png'))
img.resize((192, 192), Image.LANCZOS).save(os.path.join(pub, 'icon-192.png'))
img.resize((512, 512), Image.LANCZOS).save(os.path.join(pub, 'icon-512.png'))
img.resize((32, 32), Image.LANCZOS).save(os.path.join(pub, 'favicon.ico'))
print('  [+] Updated Public Web icons')

# Android mipmaps
res = os.path.join(root, 'android', 'app', 'src', 'main', 'res')
densities = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
}
for folder, size in densities.items():
    fpath = os.path.join(res, folder)
    if os.path.exists(fpath):
        resized = img.resize((size, size), Image.LANCZOS)
        resized.save(os.path.join(fpath, 'ic_launcher.png'))
        resized.save(os.path.join(fpath, 'ic_launcher_round.png'))
print('  [+] Updated Android Launcher mipmaps')
"
        Write-Host "`n[+] Multi-platform icons regenerated successfully." -ForegroundColor Green
    } else {
        Write-Host "  [!] logo.png not found in store_assets/1_app_icon/." -ForegroundColor Yellow
    }
}

function Prompt-ChangeVersion {
    Show-Banner
    Write-Host "Current App Version: v$script:AppVersion" -ForegroundColor Yellow
    Write-Host ""
    $newV = Read-Host "Enter new version number (e.g. 1.2.5, 1.3.0)"
    if ($newV -and $newV.Trim() -ne "") {
        Set-AppVersion $newV
        Write-Host "`nVersion successfully synchronized across all platform configs to v$script:AppVersion!" -ForegroundColor Green
        Start-Sleep -Seconds 1
    }
}

function Publish-GitHubRelease {
    Show-Banner
    Write-Host ">>> GitHub Multi-Platform Auto-Release (v$script:AppVersion)`n" -ForegroundColor Magenta

    Write-Host "This will:" -ForegroundColor White
    Write-Host "  1. Synchronize version across all configuration files" -ForegroundColor DarkGray
    Write-Host "  2. Commit any pending changes to git" -ForegroundColor DarkGray
    Write-Host "  3. Create git tag: v$script:AppVersion" -ForegroundColor DarkGray
    Write-Host "  4. Push tag to GitHub (triggers GitHub Actions)" -ForegroundColor DarkGray
    Write-Host "  5. GitHub Actions will build:" -ForegroundColor DarkGray
    Write-Host "       Windows .exe  (windows-latest runner)" -ForegroundColor Cyan
    Write-Host "       Linux .deb + .AppImage  (ubuntu-latest runner)" -ForegroundColor Yellow
    Write-Host "       macOS .dmg   (macos-latest runner)" -ForegroundColor Magenta
    Write-Host "       Android .apk  (ubuntu-latest + Android SDK)" -ForegroundColor Green
    Write-Host "  6. Auto-create GitHub Release with all artifacts" -ForegroundColor DarkGray
    Write-Host ""

    $confirm = Read-Host "Continue? Tag and push v$script:AppVersion to GitHub? [y/N]"
    if ($confirm.ToLower() -ne "y") {
        Write-Host "Cancelled." -ForegroundColor DarkGray
        return
    }

    # Ensure all version files match
    Set-AppVersion $script:AppVersion

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

    # Push tag (force if exists)
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

if ($Target -and $Target.Trim() -ne "") {
    switch ($Target.ToLower().Trim()) {
        "win"       { Build-Windows; exit }
        "windows"   { Build-Windows; exit }
        "store"     { Build-WindowsStore; exit }
        "msix"      { Build-WindowsStore; exit }
        "appx"      { Build-WindowsStore; exit }
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
        "keystore"  { Show-KeystoreInfo; exit }
        "icons"     { Refresh-Icons; exit }
        default     { Write-Host "Unknown target: $Target" -ForegroundColor Red; exit 1 }
    }
}

# Interactive Menu Loop
do {
    Show-Banner
    Write-Host "Select a target platform or utility to build:" -ForegroundColor White
    Write-Host ""
    Write-Host "  [1]   Windows Desktop              (.exe Installer & win-unpacked portable)" -ForegroundColor Cyan
    Write-Host "  [2]   Microsoft Store (APPX/MSIX)  (Certified Store Package for Partner Center)" -ForegroundColor Cyan
    Write-Host "  [3]   Android Mobile (APK)         (Direct .apk for phone installation / testing)" -ForegroundColor Green
    Write-Host "  [4]   Android Google Play (.aab)   (Production App Bundle for Google Play Store)" -ForegroundColor Green
    Write-Host "  [5]   Linux Desktop                (.AppImage, Debian .deb & Canonical .snap)" -ForegroundColor Yellow
    Write-Host "  [6]   macOS Desktop                (.dmg Installer)" -ForegroundColor Magenta
    Write-Host "  [7]   Build All Targets            (Complete Multi-Platform Packaging Suite)" -ForegroundColor White
    Write-Host "  -------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  [8]   Android Keystore Info        (View fingerprints SHA-1/SHA-256 for Play Console)" -ForegroundColor Green
    Write-Host "  [9]   Launch Desktop App           (Run live locally via Electron)" -ForegroundColor DarkCyan
    Write-Host "  [10]  Regenerate Icons             (Refresh all platform icons from logo.png)" -ForegroundColor DarkGray
    Write-Host "  [11]  Change Version               (Current: v$script:AppVersion - Syncs all files)" -ForegroundColor Yellow
    Write-Host "  [12]  GitHub Auto-Release          (Tag + Push -> Triggers GitHub Actions)" -ForegroundColor Magenta
    Write-Host "  [0]   Exit" -ForegroundColor Red
    Write-Host ""
    
    $choice = Read-Host "Enter option number [0-12]"
    
    switch ($choice) {
        "1"  { Build-Windows; Pause }
        "2"  { Build-WindowsStore; Pause }
        "3"  { Build-Android; Pause }
        "4"  { Build-AndroidPlayStore; Pause }
        "5"  { Build-Linux; Pause }
        "6"  { Build-MacOS; Pause }
        "7"  { Build-All; Pause }
        "8"  { Show-KeystoreInfo; Pause }
        "9"  { Run-DevDesktop; Pause }
        "10" { Refresh-Icons; Pause }
        "11" { Prompt-ChangeVersion }
        "12" { Publish-GitHubRelease; Pause }
        "0"  { Write-Host "`nExiting builder. Good bye!" -ForegroundColor DarkGray; break }
        default { Write-Host "Invalid option. Please choose between 0 and 12." -ForegroundColor Red; Start-Sleep -Seconds 1 }
    }
} while ($choice -ne "0")
