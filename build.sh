#!/usr/bin/env bash
# ==============================================================================
# xTerminal - Multi-Platform Interactive Build & Packaging Suite
# Copyright (C) 2026 Lyarinet Technologies. All rights reserved.
# Official Portal: https://github.com/lyarinet
# ==============================================================================
# Direct target execution

# ./build.sh -t win          # Windows .exe
# ./build.sh -t store        # Microsoft Store AppX
# ./build.sh -t apk          # Android APK
# ./build.sh -t aab          # Google Play Store Bundle
# ./build.sh -t linux        # Linux AppImage / deb / snap
# ./build.sh -t keystore     # View keystore certificate fingerprints

# Synchronize version
# ./build.sh -v 1.2.7






set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ANSI Colors
CLR_RESET="\033[0m"
CLR_RED="\033[0;31m"
CLR_GREEN="\033[0;32m"
CLR_YELLOW="\033[0;33m"
CLR_BLUE="\033[0;34m"
CLR_MAGENTA="\033[0;35m"
CLR_CYAN="\033[0;36m"
CLR_WHITE="\033[1;37m"
CLR_GRAY="\033[0;90m"

# ==============================================================================
# LYARINET OFFICIAL CORE ENGINE - TAMPER PROTECTION & IMMUTABLE WATERMARK
# ==============================================================================
readonly LYARINET_BUILD_ENGINE="Lyarinet-xTerminal-BuildSuite"
readonly LYARINET_PUBLISHER="Lyarinet Technologies (https://github.com/lyarinet)"

# Set terminal window title
printf "\033]0;%s\007" "xTerminal PRO - Powered by Lyarinet Technologies" 2>/dev/null || true

assert_lyarinet_security() {
    local target_file="${BASH_SOURCE[0]}"
    if [[ ! -f "$target_file" ]]; then
        target_file="$SCRIPT_DIR/build.sh"
    fi

    local is_tampered=0
    if [[ -f "$target_file" ]]; then
        if ! grep -q "LYARINET TECHNOLOGIES" "$target_file" || ! grep -q "https://github.com/lyarinet" "$target_file"; then
            is_tampered=1
        fi
    fi

    if [[ "$is_tampered" -eq 1 ]]; then
        echo ""
        echo -e "${CLR_RED}=====================================================================${CLR_RESET}"
        echo -e "${CLR_RED} [FATAL SECURITY ERROR] LYARINET INTEGRITY VERIFICATION FAILED${CLR_RESET}"
        echo -e "${CLR_RED}=====================================================================${CLR_RESET}"
        echo -e "${CLR_YELLOW} Unauthorized modification detected: Lyarinet copyright & watermark removed.${CLR_RESET}"
        echo -e "${CLR_WHITE} This build script is proprietary to Lyarinet Technologies.${CLR_RESET}"
        echo -e "${CLR_RED} Execution permanently terminated by Lyarinet Security Engine.${CLR_RESET}"
        echo -e "${CLR_CYAN} Official Source: https://github.com/lyarinet\n${CLR_RESET}"
        exit 1
    fi
}

# Enforce Lyarinet security verification on load
assert_lyarinet_security

get_app_version() {
    local pkg_json="$SCRIPT_DIR/package.json"
    if [[ -f "$pkg_json" ]]; then
        local ver
        ver=$(node -e "try { console.log(require('./package.json').version || '1.2.6'); } catch(e) { console.log('1.2.6'); }" 2>/dev/null)
        if [[ -n "$ver" ]]; then
            echo "$ver"
            return
        fi
    fi
    echo "1.2.6"
}

APP_VERSION="$(get_app_version)"

set_app_version() {
    local new_ver="$1"
    if [[ -z "$new_ver" ]]; then return; fi
    local clean_ver
    clean_ver="$(echo "$new_ver" | sed -e 's/^[vV]//' | tr -d '[:space:]')"

    # 1. Update package.json
    local pkg_json="$SCRIPT_DIR/package.json"
    if [[ -f "$pkg_json" ]]; then
        node -e "
            const fs = require('fs');
            const p = JSON.parse(fs.readFileSync('$pkg_json', 'utf8'));
            p.version = '$clean_ver';
            fs.writeFileSync('$pkg_json', JSON.stringify(p, null, 2) + '\n');
        " 2>/dev/null || sed -i -E "s/(\"version\"[[:space:]]*:[[:space:]]*)\"[^\"]+\"/\1\"$clean_ver\"/" "$pkg_json"
        echo -e "  ${CLR_GREEN}[+] Updated package.json version -> $clean_ver${CLR_RESET}"
    fi

    # 2. Update package-lock.json
    local lock_json="$SCRIPT_DIR/package-lock.json"
    if [[ -f "$lock_json" ]]; then
        node -e "
            const fs = require('fs');
            const p = JSON.parse(fs.readFileSync('$lock_json', 'utf8'));
            if (p.version) p.version = '$clean_ver';
            if (p.packages && p.packages['']) p.packages[''].version = '$clean_ver';
            fs.writeFileSync('$lock_json', JSON.stringify(p, null, 2) + '\n');
        " 2>/dev/null || sed -i -E "s/(\"name\"[[:space:]]*:[[:space:]]*\"xterminal\",[[:space:]]*\"version\"[[:space:]]*:[[:space:]]*)\"[^\"]+\"/\1\"$clean_ver\"/" "$lock_json"
        echo -e "  ${CLR_GREEN}[+] Updated package-lock.json version -> $clean_ver${CLR_RESET}"
    fi

    # 3. Update Android build.gradle
    local gradle_file="$SCRIPT_DIR/android/app/build.gradle"
    if [[ -f "$gradle_file" ]]; then
        sed -i -E "s/versionName[[:space:]]+\"[^\"]+\"/versionName \"$clean_ver\"/" "$gradle_file"
        
        IFS='.' read -r major minor patch <<< "$clean_ver"
        major=${major:-1}
        minor=${minor:-2}
        patch=${patch:-0}
        local new_code=$(( major * 10000 + minor * 100 + patch ))
        sed -i -E "s/versionCode[[:space:]]+[0-9]+/versionCode $new_code/" "$gradle_file"
        echo -e "  ${CLR_GREEN}[+] Updated Android build.gradle versionName -> $clean_ver (versionCode: $new_code)${CLR_RESET}"
    fi

    # 4. Update snap/snapcraft.yaml
    local snap_file="$SCRIPT_DIR/snap/snapcraft.yaml"
    if [[ -f "$snap_file" ]]; then
        sed -i -E "s/version:[[:space:]]*['\"][^'\"]+['\"]/version: '$clean_ver'/" "$snap_file"
        echo -e "  ${CLR_GREEN}[+] Updated snap/snapcraft.yaml version -> $clean_ver${CLR_RESET}"
    fi

    # 5. Update src-tauri/tauri.conf.json
    local tauri_file="$SCRIPT_DIR/src-tauri/tauri.conf.json"
    if [[ -f "$tauri_file" ]]; then
        sed -i -E "s/(\"version\"[[:space:]]*:[[:space:]]*)\"[^\"]+\"/\1\"$clean_ver\"/" "$tauri_file"
        echo -e "  ${CLR_GREEN}[+] Updated src-tauri/tauri.conf.json version -> $clean_ver${CLR_RESET}"
    fi

    # 6. Update src/App.tsx version badge
    local app_tsx="$SCRIPT_DIR/src/App.tsx"
    if [[ -f "$app_tsx" ]]; then
        sed -i -E "s/>v[0-9]+\.[0-9]+\.[0-9]+</>v$clean_ver</" "$app_tsx"
        echo -e "  ${CLR_GREEN}[+] Updated src/App.tsx version badge -> v$clean_ver${CLR_RESET}"
    fi

    APP_VERSION="$clean_ver"
}

show_banner() {
    assert_lyarinet_security
    if [[ -t 1 ]]; then
        clear 2>/dev/null || true
    fi
    echo -e "${CLR_CYAN}=====================================================================${CLR_RESET}"
    echo -e "${CLR_CYAN}  _      __     __     _____  _____ _   _ ______ _______            ${CLR_RESET}"
    echo -e "${CLR_CYAN} | |     \\ \\   / //\\  |  __ \\|_   _| \\ | |  ____|__   __|           ${CLR_RESET}"
    echo -e "${CLR_CYAN} | |      \\ \\_/ //  \\ | |__) | | | |  \\| | |__     | |              ${CLR_RESET}"
    echo -e "${CLR_GREEN} | |       \\   // /\\ \\|  _  /  | | | . \\ |  __|    | |              ${CLR_RESET}"
    echo -e "${CLR_GREEN} | |____    | |/ ____ \\ | \\ \\ _| |_| |\\  | |____   | |              ${CLR_RESET}"
    echo -e "${CLR_GREEN} |______|   |_/_/    \\_\\_|  \\_\\_____|_| \\_|______|  |_| TECHNOLOGIES${CLR_RESET}"
    echo -e "${CLR_CYAN}=====================================================================${CLR_RESET}"
    echo -e "${CLR_GREEN}    __   _______                   _             _                   ${CLR_RESET}"
    echo -e "${CLR_GREEN}    \\ \\ / /_   _|__ _ __ _ __ ___ (_)_ __   __ _| |                  ${CLR_RESET}"
    echo -e "${CLR_GREEN}     \\ V /  | |/ _ \\ '__| '_ \` _ \\| | '_ \\ / _\` | |                  ${CLR_RESET}"
    echo -e "${CLR_GREEN}      | |   | |  __/ |  | | | | | | | | | | (_| | |                  ${CLR_RESET}"
    echo -e "${CLR_CYAN}      |_|   |_|\\___|_|  |_| |_| |_|_|_| |_|\\__,_|_| PRO              ${CLR_RESET}"
    echo -e "${CLR_CYAN}=====================================================================${CLR_RESET}"
    echo -e "${CLR_CYAN}  +-----------------------------------------------------------------+${CLR_RESET}"
    echo -e "${CLR_WHITE}  |                LYARINET OFFICIAL BUILD ENGINE                   |${CLR_RESET}"
    echo -e "${CLR_GREEN}  |       Engineered & Digitally Signed by Lyarinet Technologies    |${CLR_RESET}"
    echo -e "${CLR_CYAN}  |       Publisher : Lyarinet (https://github.com/lyarinet)        |${CLR_RESET}"
    echo -e "${CLR_YELLOW}  |       Security  : Protected by Lyarinet Tamper Shield          |${CLR_RESET}"
    printf "  |       Version   : v%-10s | Mode: %-21s|\n" "$APP_VERSION" "${TARGET_MODE:-Interactive}"
    echo -e "${CLR_GRAY}  |       Copyright (C) 2026 Lyarinet. All rights reserved.         |${CLR_RESET}"
    echo -e "${CLR_CYAN}  +-----------------------------------------------------------------+${CLR_RESET}"
    echo -e "${CLR_CYAN}=====================================================================\n${CLR_RESET}"
}

get_keytool_path() {
    if command -v keytool >/dev/null 2>&1; then
        echo "keytool"
        return
    fi
    if command -v keytool.exe >/dev/null 2>&1; then
        echo "keytool.exe"
        return
    fi
    if [[ -n "$JAVA_HOME" && -x "$JAVA_HOME/bin/keytool" ]]; then
        echo "$JAVA_HOME/bin/keytool"
        return
    fi
    local candidates=(
        "/mnt/c/Program Files/Android/Android Studio/jbr/bin/keytool.exe"
        "/mnt/c/Program Files/Android/Android Studio/jre/bin/keytool.exe"
        "/mnt/c/Program Files/Java/jdk*/bin/keytool.exe"
        "/usr/lib/jvm/default-java/bin/keytool"
        "/usr/lib/jvm/java-17-openjdk-amd64/bin/keytool"
        "/usr/lib/jvm/java-21-openjdk-amd64/bin/keytool"
        "/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/keytool"
        "/opt/android-studio/jbr/bin/keytool"
    )
    for c in "${candidates[@]}"; do
        for match in $c; do
            if [[ -x "$match" || -f "$match" ]]; then
                echo "$match"
                return
            fi
        done
    done
    echo "keytool"
}

# Handle WSL / Git Bash environment where node.exe / npm.cmd are in PATH
if ! command -v node >/dev/null 2>&1 && command -v node.exe >/dev/null 2>&1; then
    node() { node.exe "$@"; }
fi
if ! command -v npm >/dev/null 2>&1 && command -v npm.cmd >/dev/null 2>&1; then
    npm() { npm.cmd "$@"; }
fi
if ! command -v npx >/dev/null 2>&1 && command -v npx.cmd >/dev/null 2>&1; then
    npx() { npx.cmd "$@"; }
fi

test_prerequisites() {
    echo -e "${CLR_GRAY}[-] Checking build toolchain prerequisites...${CLR_RESET}"
    if ! command -v node >/dev/null 2>&1 && ! command -v node.exe >/dev/null 2>&1; then
        echo -e "  ${CLR_RED}[!] Node.js is required but was not found in PATH.${CLR_RESET}"
        return 1
    fi
    echo -e "  ${CLR_GREEN}[+] Node.js: $(node --version)${CLR_RESET}"

    if ! command -v npm >/dev/null 2>&1 && ! command -v npm.cmd >/dev/null 2>&1; then
        echo -e "  ${CLR_RED}[!] npm was not found in PATH.${CLR_RESET}"
        return 1
    fi

    if [[ ! -d "$SCRIPT_DIR/node_modules" ]]; then
        echo -e "  ${CLR_YELLOW}[!] Project dependencies not found. Auto-installing via npm install...${CLR_RESET}"
        npm install || npm install --legacy-peer-deps
        echo -e "  ${CLR_GREEN}[+] Dependencies installed successfully.${CLR_RESET}"
    fi

    return 0
}

build_frontend_and_server() {
    echo -e "\n${CLR_CYAN}[1/2] Compiling Vite Frontend & Node Server Bundle (v$APP_VERSION)...${CLR_RESET}"
    local start_time
    start_time=$(date +%s)
    npm run build
    local end_time
    end_time=$(date +%s)
    local elapsed=$(( end_time - start_time ))
    echo -e "  ${CLR_GREEN}[+] Compilation completed in ${elapsed}s.${CLR_RESET}"
}

build_windows() {
    TARGET_MODE="windows"
    show_banner
    echo -e "${CLR_YELLOW}>>> TARGET: Windows Desktop Application (v$APP_VERSION)\n${CLR_RESET}"

    mkdir -p "$SCRIPT_DIR/release"
    local backup_dir="/tmp/xterminal-mobile-backup-$$"
    mkdir -p "$backup_dir"
    find "$SCRIPT_DIR/release" -maxdepth 1 -name "*.apk" -o -name "*.aab" | while read -r f; do
        cp "$f" "$backup_dir/" 2>/dev/null || true
    done

    build_frontend_and_server

    echo -e "\n${CLR_CYAN}[2/2] Packaging Windows application via electron-builder...${CLR_RESET}"
    local start_time
    start_time=$(date +%s)
    npx electron-builder --win nsis
    local elapsed=$(( $(date +%s) - start_time ))

    # Restore mobile backups
    if [[ -d "$backup_dir" ]]; then
        cp -f "$backup_dir"/* "$SCRIPT_DIR/release/" 2>/dev/null || true
        rm -rf "$backup_dir"
    fi

    echo -e "\n${CLR_GREEN}=====================================================================${CLR_RESET}"
    echo -e "${CLR_GREEN} [SUCCESS] Windows Desktop App built successfully in ${elapsed}s!${CLR_RESET}"
    echo -e "${CLR_GREEN}=====================================================================${CLR_RESET}"
    echo -e "  ${CLR_WHITE}Output Directory: $SCRIPT_DIR/release${CLR_RESET}\n"
}

build_windows_store() {
    TARGET_MODE="store"
    show_banner
    echo -e "${CLR_YELLOW}>>> TARGET: Microsoft Store Package (.appx / .msix) (v$APP_VERSION)\n${CLR_RESET}"

    build_frontend_and_server

    echo -e "\n${CLR_CYAN}[2/2] Packaging Microsoft Store AppX package via electron-builder...${CLR_RESET}"
    local start_time
    start_time=$(date +%s)
    npx electron-builder --win appx
    local elapsed=$(( $(date +%s) - start_time ))

    echo -e "\n${CLR_GREEN}=====================================================================${CLR_RESET}"
    echo -e "${CLR_GREEN} [SUCCESS] Microsoft Store package (.appx) generated in ${elapsed}s!${CLR_RESET}"
    echo -e "${CLR_GREEN}=====================================================================${CLR_RESET}"
    echo -e "  ${CLR_WHITE}Package ID  : Lyarinet.xTerminal${CLR_RESET}"
    echo -e "  ${CLR_WHITE}Version     : ${APP_VERSION}.0${CLR_RESET}"
    echo -e "  ${CLR_WHITE}Location    : $SCRIPT_DIR/release${CLR_RESET}\n"
}

ensure_android_sdk() {
    if [[ -z "$ANDROID_HOME" ]]; then
        if [[ -d "$HOME/Android/Sdk" ]]; then
            export ANDROID_HOME="$HOME/Android/Sdk"
        elif [[ -d "$HOME/Library/Android/sdk" ]]; then
            export ANDROID_HOME="$HOME/Library/Android/sdk"
        elif [[ -n "$LOCALAPPDATA" && -d "$LOCALAPPDATA/Android/Sdk" ]]; then
            export ANDROID_HOME="$LOCALAPPDATA/Android/Sdk"
        fi
    fi

    local local_prop="$SCRIPT_DIR/android/local.properties"
    if [[ -n "$ANDROID_HOME" && ! -f "$local_prop" ]]; then
        echo "sdk.dir=$ANDROID_HOME" > "$local_prop"
    fi
}

build_android() {
    TARGET_MODE="apk"
    show_banner
    echo -e "${CLR_YELLOW}>>> TARGET: Android Mobile Application (APK) (v$APP_VERSION)\n${CLR_RESET}"

    ensure_android_sdk

    echo -e "${CLR_CYAN}[1/3] Building Web Distribution for Android WebView...${CLR_RESET}"
    npm run build

    echo -e "\n${CLR_CYAN}[2/3] Syncing Capacitor Android Project...${CLR_RESET}"
    npx cap sync android

    local build_task="assembleDebug"
    local apk_subdir="debug"
    local apk_filename="app-debug.apk"

    if [[ -f "$SCRIPT_DIR/android/keystore.properties" || -f "$SCRIPT_DIR/android/xterminal-release-key.jks" ]]; then
        echo -e "\n${CLR_CYAN}Release signing keystore detected. Select build mode:${CLR_RESET}"
        echo -e "  ${CLR_GREEN}[1] Debug APK (fast, instant install on any device/emulator)${CLR_RESET}"
        echo -e "  ${CLR_YELLOW}[2] Release APK (signed with keystore, optimized for sideloading)${CLR_RESET}"
        read -r -p "Choose an option [1-2] (Default: 1): " apk_choice
        if [[ "$apk_choice" == "2" ]]; then
            build_task="assembleRelease"
            apk_subdir="release"
            apk_filename="app-release.apk"
        fi
    fi

    echo -e "\n${CLR_CYAN}[3/3] Compiling Native Android APK with Gradle ($build_task)...${CLR_RESET}"
    local gradlew="$SCRIPT_DIR/android/gradlew"
    if [[ ! -x "$gradlew" && -f "$gradlew" ]]; then
        chmod +x "$gradlew"
    fi

    if [[ -x "$gradlew" ]]; then
        local start_time
        start_time=$(date +%s)
        (cd "$SCRIPT_DIR/android" && ./gradlew "$build_task")
        local elapsed=$(( $(date +%s) - start_time ))

        local found_apk
        found_apk="$(find "$SCRIPT_DIR/android/app/build/outputs/apk" -name "*.apk" 2>/dev/null | head -n 1)"
        if [[ -n "$found_apk" && -f "$found_apk" ]]; then
            mkdir -p "$SCRIPT_DIR/release"
            local target_apk="$SCRIPT_DIR/release/xTerminal-$APP_VERSION.apk"
            cp -f "$found_apk" "$target_apk"

            echo -e "\n${CLR_GREEN}=====================================================================${CLR_RESET}"
            echo -e "${CLR_GREEN} [SUCCESS] Android APK built successfully in ${elapsed}s!${CLR_RESET}"
            echo -e "${CLR_GREEN}=====================================================================${CLR_RESET}"
            echo -e "  ${CLR_GREEN}Release Package : release/xTerminal-$APP_VERSION.apk${CLR_RESET}"
            echo -e "  ${CLR_WHITE}Package ID      : com.lyarinet.xterminal${CLR_RESET}"
            echo -e "  ${CLR_WHITE}Mode            : $build_task${CLR_RESET}"
            echo -e "  ${CLR_CYAN}Install via ADB : adb install -r \"$target_apk\"${CLR_RESET}\n"
        else
            echo -e "\n${CLR_RED}[!] Failed to generate APK. Check Android build logs above.${CLR_RESET}"
        fi
    else
        echo -e "${CLR_YELLOW}Android project synced. Run: npx cap open android to build in Android Studio.${CLR_RESET}"
    fi
}

new_android_keystore() {
    echo -e "\n${CLR_CYAN}--- Setup Android Play Store Release Keystore ---${CLR_RESET}"
    read -r -p "Enter Key Alias (Default: 'xterminal'): " alias_name
    alias_name="${alias_name:-xterminal}"

    read -r -s -p "Enter Keystore Password (min 6 characters): " raw_pass
    echo ""
    if [[ ${#raw_pass} -lt 6 ]]; then
        echo -e "${CLR_RED}[!] Password must be at least 6 characters long.${CLR_RESET}"
        return 1
    fi

    local keystore_path="$SCRIPT_DIR/android/xterminal-release-key.jks"
    local dname="CN=Lyarinet, OU=Mobile, O=Lyarinet, L=Karachi, ST=Sindh, C=PK"
    local kt
    kt="$(get_keytool_path)"

    echo -e "\nGenerating keystore with keytool ($kt)..."
    "$kt" -genkeypair -v -keystore "$keystore_path" -alias "$alias_name" -keyalg RSA -keysize 2048 -validity 10000 -storepass "$raw_pass" -keypass "$raw_pass" -dname "$dname"

    if [[ -f "$keystore_path" ]]; then
        cat <<EOF > "$SCRIPT_DIR/android/keystore.properties"
storeFile=../xterminal-release-key.jks
storePassword=$raw_pass
keyAlias=$alias_name
keyPassword=$raw_pass
EOF
        echo -e "\n${CLR_GREEN}[SUCCESS] Keystore created: android/xterminal-release-key.jks${CLR_RESET}"
        echo -e "${CLR_GREEN}[SUCCESS] Keystore properties written: android/keystore.properties${CLR_RESET}"
        return 0
    else
        echo -e "${CLR_RED}[!] Failed to generate keystore.${CLR_RESET}"
        return 1
    fi
}

show_keystore_info() {
    TARGET_MODE="keystore"
    show_banner
    echo -e "${CLR_YELLOW}>>> Android Keystore Status & Fingerprints (Google Play Console)\n${CLR_RESET}"

    local keystore_prop="$SCRIPT_DIR/android/keystore.properties"
    local keystore_jks="$SCRIPT_DIR/android/xterminal-release-key.jks"

    if [[ ! -f "$keystore_prop" && ! -f "$keystore_jks" ]]; then
        echo -e "  ${CLR_YELLOW}[!] No release keystore found.${CLR_RESET}\n"
        return
    fi

    echo -e "  ${CLR_GREEN}[+] Keystore File : $keystore_jks${CLR_RESET}"
    if [[ -f "$keystore_prop" ]]; then
        echo -e "  ${CLR_GREEN}[+] Config File   : $keystore_prop${CLR_RESET}"
        while IFS= read -r line; do
            line="${line%$'\r'}"
            if [[ "$line" =~ password|Password ]]; then
                echo -e "      ${CLR_GRAY}${line/=.*/=********}${CLR_RESET}"
            else
                echo -e "      ${CLR_CYAN}$line${CLR_RESET}"
            fi
        done < "$keystore_prop"
    fi

    local kt
    kt="$(get_keytool_path)"
    if [[ -f "$keystore_jks" ]]; then
        echo -e "\n  ${CLR_WHITE}Certificate Details (SHA-1 & SHA-256):${CLR_RESET}"
        local pass=""
        if [[ -f "$keystore_prop" ]]; then
            pass="$(grep "storePassword=" "$keystore_prop" | cut -d'=' -f2- | tr -d '\r')"
        fi
        if [[ -n "$pass" ]]; then
            "$kt" -list -v -keystore "$keystore_jks" -storepass "$pass" 2>/dev/null | grep -E "SHA1:|SHA256:|Owner:|Valid from:" | while read -r line; do
                echo -e "      ${CLR_YELLOW}$line${CLR_RESET}"
            done || true
        fi
    fi
    echo ""
}

build_android_playstore() {
    TARGET_MODE="aab"
    show_banner
    echo -e "${CLR_YELLOW}>>> TARGET: Android Google Play Store App Bundle (.aab) (v$APP_VERSION)\n${CLR_RESET}"

    ensure_android_sdk

    if [[ ! -f "$SCRIPT_DIR/android/keystore.properties" && ! -f "$SCRIPT_DIR/android/xterminal-release-key.jks" ]]; then
        echo -e "${CLR_YELLOW}No release signing keystore detected. Options:${CLR_RESET}"
        echo -e "  ${CLR_CYAN}[1] Generate a new Play Store release keystore now${CLR_RESET}"
        echo -e "  ${CLR_WHITE}[2] Continue with unsigned App Bundle${CLR_RESET}"
        echo -e "  ${CLR_GRAY}[3] Cancel${CLR_RESET}"
        read -r -p "Choose an option [1-3] (Default: 2): " k_choice
        if [[ "$k_choice" == "1" ]]; then
            new_android_keystore || true
        elif [[ "$k_choice" == "3" ]]; then
            return
        fi
    fi

    echo -e "\n${CLR_CYAN}[1/3] Building Web Distribution for Android WebView...${CLR_RESET}"
    npm run build

    echo -e "\n${CLR_CYAN}[2/3] Syncing Capacitor Android Project...${CLR_RESET}"
    npx cap sync android

    echo -e "\n${CLR_CYAN}[3/3] Compiling Google Play App Bundle (.aab) with Gradle...${CLR_RESET}"
    local gradlew="$SCRIPT_DIR/android/gradlew"
    if [[ ! -x "$gradlew" && -f "$gradlew" ]]; then
        chmod +x "$gradlew"
    fi

    if [[ -x "$gradlew" ]]; then
        local start_time
        start_time=$(date +%s)
        (cd "$SCRIPT_DIR/android" && ./gradlew bundleRelease)
        local elapsed=$(( $(date +%s) - start_time ))

        local aab_file
        aab_file="$(find "$SCRIPT_DIR/android/app/build/outputs/bundle/release" -name "*.aab" 2>/dev/null | head -n 1)"
        if [[ -n "$aab_file" && -f "$aab_file" ]]; then
            mkdir -p "$SCRIPT_DIR/release"
            local target_aab="$SCRIPT_DIR/release/xTerminal-$APP_VERSION-playstore.aab"
            cp -f "$aab_file" "$target_aab"

            echo -e "\n${CLR_GREEN}=====================================================================${CLR_RESET}"
            echo -e "${CLR_GREEN} [SUCCESS] Google Play Store Bundle (.aab) generated in ${elapsed}s!${CLR_RESET}"
            echo -e "${CLR_GREEN}=====================================================================${CLR_RESET}"
            echo -e "  ${CLR_GREEN}Release Bundle : release/xTerminal-$APP_VERSION-playstore.aab${CLR_RESET}"
            echo -e "  ${CLR_WHITE}Package ID     : com.lyarinet.xterminal${CLR_RESET}\n"
        else
            echo -e "\n${CLR_RED}[!] Failed to generate .aab bundle.${CLR_RESET}"
        fi
    fi
}

build_linux() {
    TARGET_MODE="linux"
    show_banner
    echo -e "${CLR_YELLOW}>>> TARGET: Linux Desktop Application (v$APP_VERSION)\n${CLR_RESET}"

    build_frontend_and_server

    echo -e "\n${CLR_CYAN}[2/2] Packaging Linux AppImage, .deb and Canonical .snap...${CLR_RESET}"
    local start_time
    start_time=$(date +%s)
    npx electron-builder --linux AppImage deb snap --publish never
    local elapsed=$(( $(date +%s) - start_time ))

    echo -e "\n${CLR_GREEN}=====================================================================${CLR_RESET}"
    echo -e "${CLR_GREEN} [SUCCESS] Linux packages generated in ${elapsed}s!${CLR_RESET}"
    echo -e "${CLR_GREEN}=====================================================================${CLR_RESET}"
    echo -e "  ${CLR_WHITE}Output: $SCRIPT_DIR/release${CLR_RESET}\n"
}

build_macos() {
    TARGET_MODE="macos"
    show_banner
    echo -e "${CLR_YELLOW}>>> TARGET: macOS Desktop Application (v$APP_VERSION)\n${CLR_RESET}"

    build_frontend_and_server

    echo -e "\n${CLR_CYAN}[2/2] Packaging macOS .dmg...${CLR_RESET}"
    local start_time
    start_time=$(date +%s)
    npx electron-builder --mac dmg --publish never
    local elapsed=$(( $(date +%s) - start_time ))

    echo -e "\n${CLR_GREEN}=====================================================================${CLR_RESET}"
    echo -e "${CLR_GREEN} [SUCCESS] macOS .dmg generated in ${elapsed}s!${CLR_RESET}"
    echo -e "${CLR_GREEN}=====================================================================${CLR_RESET}"
    echo -e "  ${CLR_WHITE}Output: $SCRIPT_DIR/release${CLR_RESET}\n"
}

build_all() {
    TARGET_MODE="all"
    show_banner
    echo -e "${CLR_YELLOW}>>> STARTING ALL-PLATFORM BUILD SUITE (v$APP_VERSION)\n${CLR_RESET}"
    local all_start
    all_start=$(date +%s)

    echo -e "${CLR_CYAN}================ [STAGE 1/4] Linux Desktop ================${CLR_RESET}"
    build_linux || true

    echo -e "\n${CLR_CYAN}================ [STAGE 2/4] Android Mobile ================${CLR_RESET}"
    build_android || true

    echo -e "\n${CLR_CYAN}================ [STAGE 3/4] Windows Desktop ================${CLR_RESET}"
    build_windows || true

    echo -e "\n${CLR_CYAN}================ [STAGE 4/4] macOS Desktop ================${CLR_RESET}"
    build_macos || true

    local total_elapsed=$(( $(date +%s) - all_start ))
    echo -e "\n${CLR_GREEN}=====================================================================${CLR_RESET}"
    echo -e "${CLR_GREEN} [COMPLETED] All Platform Build Process finished in ${total_elapsed}s!${CLR_RESET}"
    echo -e "${CLR_GREEN}=====================================================================${CLR_RESET}\n"
}

run_dev_desktop() {
    show_banner
    echo -e "${CLR_CYAN}>>> Starting xTerminal in Live Desktop Development Mode...\n${CLR_RESET}"
    npm run build
    npx electron .
}

refresh_icons() {
    show_banner
    echo -e "${CLR_CYAN}>>> Regenerating all multi-platform icons from store_assets/1_app_icon/logo.png...\n${CLR_RESET}"
    local logo_path="$SCRIPT_DIR/store_assets/1_app_icon/logo.png"
    if [[ -f "$logo_path" ]]; then
        python3 -c "
import os, sys
from PIL import Image

root = r'$SCRIPT_DIR'
src_logo = os.path.join(root, 'store_assets', '1_app_icon', 'logo.png')
img = Image.open(src_logo).convert('RGBA')

# Windows & macOS build icons
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
" 2>/dev/null || echo -e "  ${CLR_YELLOW}[!] Python Pillow is required for icon regeneration (pip install pillow).${CLR_RESET}"
        echo -e "\n${CLR_GREEN}[+] Multi-platform icons regenerated successfully.${CLR_RESET}"
    else
        echo -e "  ${CLR_YELLOW}[!] logo.png not found in store_assets/1_app_icon/.${CLR_RESET}"
    fi
}

prompt_change_version() {
    show_banner
    echo -e "${CLR_YELLOW}Current App Version: v$APP_VERSION\n${CLR_RESET}"
    read -r -p "Enter new version number (e.g. 1.2.7, 1.3.0): " new_v
    if [[ -n "$new_v" ]]; then
        set_app_version "$new_v"
        echo -e "\n${CLR_GREEN}Version successfully synchronized across all platform configs to v$APP_VERSION!${CLR_RESET}"
        sleep 1
    fi
}

publish_github_release() {
    TARGET_MODE="release"
    show_banner
    echo -e "${CLR_MAGENTA}>>> GitHub Multi-Platform Auto-Release (v$APP_VERSION)\n${CLR_RESET}"

    read -r -p "Continue? Tag and push v$APP_VERSION to GitHub? [y/N]: " confirm
    if [[ "${confirm,,}" != "y" ]]; then
        echo -e "${CLR_GRAY}Cancelled.${CLR_RESET}"
        return
    fi

    set_app_version "$APP_VERSION"

    echo -e "\n${CLR_CYAN}[1/4] Checking git status...${CLR_RESET}"
    if [[ -n "$(git status --porcelain)" ]]; then
        echo -e "  ${CLR_YELLOW}[!] Uncommitted changes found. Committing...${CLR_RESET}"
        git add -A
        git commit -m "chore: prepare release v$APP_VERSION"
    fi

    echo -e "\n${CLR_CYAN}[2/4] Creating git tag v$APP_VERSION...${CLR_RESET}"
    git tag -d "v$APP_VERSION" 2>/dev/null || true
    git tag -a "v$APP_VERSION" -m "xTerminal Pro v$APP_VERSION - Multi-Platform Release"

    echo -e "\n${CLR_CYAN}[3/4] Pushing commits to GitHub...${CLR_RESET}"
    git push origin main || true

    echo -e "\n${CLR_CYAN}[4/4] Pushing tag v$APP_VERSION to GitHub (triggers CI/CD)...${CLR_RESET}"
    git push origin "v$APP_VERSION" --force

    echo -e "\n${CLR_MAGENTA}=====================================================================${CLR_RESET}"
    echo -e "${CLR_GREEN} [SUCCESS] GitHub Actions release workflow triggered!${CLR_RESET}"
    echo -e "${CLR_MAGENTA}=====================================================================${CLR_RESET}\n"
}

# ==============================================================================
# CLI Argument Dispatcher
# ==============================================================================
TARGET=""
REQ_VERSION=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        -t|--target)
            TARGET="$2"
            shift 2
            ;;
        -v|--version)
            REQ_VERSION="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: ./build.sh [options]"
            echo "  -t, --target <target>   Build target: win, store, apk, aab, linux, mac, all, release, keystore, icons"
            echo "  -v, --version <ver>      Synchronize version across all configuration files"
            echo "  -h, --help               Display this help message"
            exit 0
            ;;
        *)
            TARGET="$1"
            shift
            ;;
    esac
done

if [[ -n "$REQ_VERSION" ]]; then
    set_app_version "$REQ_VERSION"
fi

show_banner

if ! test_prerequisites; then
    exit 1
fi

if [[ -n "$TARGET" ]]; then
    TARGET_LOWER="${TARGET,,}"
    case "$TARGET_LOWER" in
        win|windows)       build_windows; exit 0 ;;
        store|msix|appx)   build_windows_store; exit 0 ;;
        android|apk)       build_android; exit 0 ;;
        aab|playstore|bundle) build_android_playstore; exit 0 ;;
        linux)             build_linux; exit 0 ;;
        mac|macos)         build_macos; exit 0 ;;
        all)               build_all; exit 0 ;;
        release)           publish_github_release; exit 0 ;;
        keystore)          show_keystore_info; exit 0 ;;
        icons)             refresh_icons; exit 0 ;;
        *)
            echo -e "${CLR_RED}Unknown target: $TARGET${CLR_RESET}"
            exit 1
            ;;
    esac
fi

# ==============================================================================
# Interactive Menu Loop
# ==============================================================================
while true; do
    TARGET_MODE="Interactive"
    show_banner
    echo -e "${CLR_WHITE}Select a target platform or utility to build:${CLR_RESET}\n"
    echo -e "  ${CLR_CYAN}[1]   Windows Desktop              (.exe Installer & win-unpacked portable)${CLR_RESET}"
    echo -e "  ${CLR_CYAN}[2]   Microsoft Store (APPX/MSIX)  (Certified Store Package for Partner Center)${CLR_RESET}"
    echo -e "  ${CLR_GREEN}[3]   Android Mobile (APK)         (Direct .apk for phone installation / testing)${CLR_RESET}"
    echo -e "  ${CLR_GREEN}[4]   Android Google Play (.aab)   (Production App Bundle for Google Play Store)${CLR_RESET}"
    echo -e "  ${CLR_YELLOW}[5]   Linux Desktop                (.AppImage, Debian .deb & Canonical .snap)${CLR_RESET}"
    echo -e "  ${CLR_MAGENTA}[6]   macOS Desktop                (.dmg Installer)${CLR_RESET}"
    echo -e "  ${CLR_WHITE}[7]   Build All Targets            (Complete Multi-Platform Packaging Suite)${CLR_RESET}"
    echo -e "  ${CLR_GRAY}-------------------------------------------------------------------${CLR_RESET}"
    echo -e "  ${CLR_GREEN}[8]   Android Keystore Info        (View fingerprints SHA-1/SHA-256 for Play Console)${CLR_RESET}"
    echo -e "  ${CLR_CYAN}[9]   Launch Desktop App           (Run live locally via Electron)${CLR_RESET}"
    echo -e "  ${CLR_GRAY}[10]  Regenerate Icons             (Refresh all platform icons from logo.png)${CLR_RESET}"
    echo -e "  ${CLR_YELLOW}[11]  Change Version               (Current: v$APP_VERSION - Syncs all files)${CLR_RESET}"
    echo -e "  ${CLR_MAGENTA}[12]  GitHub Auto-Release          (Tag + Push -> Triggers GitHub Actions)${CLR_RESET}"
    echo -e "  ${CLR_RED}[0]   Exit${CLR_RESET}\n"

    read -r -p "Enter option number [0-12]: " choice
    case "$choice" in
        1)  build_windows ;;
        2)  build_windows_store ;;
        3)  build_android ;;
        4)  build_android_playstore ;;
        5)  build_linux ;;
        6)  build_macos ;;
        7)  build_all ;;
        8)  show_keystore_info ;;
        9)  run_dev_desktop ;;
        10) refresh_icons ;;
        11) prompt_change_version ;;
        12) publish_github_release ;;
        0)  echo -e "\n${CLR_GRAY}Exiting builder. Good bye!${CLR_RESET}"; exit 0 ;;
        *)  echo -e "${CLR_RED}Invalid option. Please choose between 0 and 12.${CLR_RESET}"; sleep 1 ;;
    esac

    echo ""
    read -r -p "Press Enter to continue..."
done
