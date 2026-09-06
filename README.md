<div align="center">

# ⚡ xTerminal
### Next-Generation Multi-Protocol SSH, Telnet, Serial, Android ADB & DevOps Workstation

[![Version](https://img.shields.io/badge/version-1.2.0-emerald.svg?style=for-the-badge)](package.json)
[![Electron](https://img.shields.io/badge/Electron-44.2.0-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org/)
[![Android](https://img.shields.io/badge/Android-Capacitor-3DDC84?style=for-the-badge&logo=android&logoColor=white)](android/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](LICENSE)

<p align="center">
  A blazing-fast, modern, feature-packed terminal workstation designed for DevOps engineers, sysadmins, and network professionals. Built with Electron, Capacitor, React 19, Vite, xterm.js, and Node.js.
</p>

</div>

---

## ✨ Key Features

### 🌐 Multi-Protocol Terminal Engine
- **Full-Duplex SSH Engine**: Powered by `ssh2` with support for password authentication, private keys (Ed25519, RSA, ECDSA), and interactive masked password prompts.
- **Real-Time Telnet Engine**: Native raw TCP Telnet client (Port 23 or custom) with auto-login detection (`login:`, `password:`) and terminal stream piping.
- **Local Station PTY**: Instant local terminal access (PowerShell on Windows, Bash/Zsh on Linux and macOS).
- **Serial TTY & Microcontroller Console**: Local hardware serial communication via WebSerial API (COM / TTY ports, baud rates up to 921600, data bits, parity, stop bits, flow control, RTS/DTR pins, and 250ms Break signals).
- **TFTP Engine**: Built-in TFTP client and server for router/switch firmware and configuration management.

---

### 🔌 Remote Serial Console Bridge (WebSerial over IP / Reverse Console Tunnel)
A groundbreaking feature for remote network engineering: Access and configure remote switches/routers (Cisco, MikroTik, Juniper, Huawei, Fortinet) even when they have **zero IP or network configuration**!
- **Shareable Client Portal**: Generate an instant, secure remote link from xTerminal and send it to your remote client via WhatsApp, Slack, or Email.
- **Zero Client Installation**: The client simply opens the link in Google Chrome or Microsoft Edge, plugs their console cable into their laptop, and clicks **Connect**.
- **Live Bi-Directional Tunnel**: The client's serial data is tunneled directly into your xTerminal console with synchronized bi-directional terminal I/O.
- **Auto IP Detection & Host Assignment**: Built-in network scanner detects all local host IP addresses (Wi-Fi, Ethernet, LAN, WSL, Hyper-V) and automatically synchronizes with the remote link generator.
- **Built-in HTTPS Server (:3443)**: Overcomes Chromium's strict `SecureContext` requirement for the Web Serial API on network IP addresses with automated in-memory TLS and WebSocket upgrade (`wss://`).
- **Hardware Signals & Hex View**: Monitor real-time CTS, DSR, DCD, RI hardware pins, switch between ASCII and Hex views, and send hardware Break signals.

---

### 🤖 Android ADB Console (Direct USB, Wireless Wi-Fi & WebUSB Remote Bridge)
Complete Android management and debugging environment integrated right into xTerminal:
- **Interactive ADB Shell**: Full-duplex interactive Linux terminal (`adb shell`) running on `xterm.js` with auto-resizing, colors, and raw PTY stream.
- **Wireless Wi-Fi ADB (`adb connect`)**: Connect to any Android device on your local Wi-Fi network without cables (e.g. `192.168.1.34:5555`).
- **1-Click TCP/IP Switch**: Convert any USB-connected device to Wireless Wi-Fi mode on port 5555 with one click (`adb tcpip 5555`).
- **Android 11+ Wireless Debugging Pairing**: Built-in support for 6-digit Wi-Fi pairing codes and dynamic port allocation (`adb pair`).
- **Live Logcat Streaming**: Real-time logcat viewer with tag/keyword filters, live pausing, and snapshot dumping.
- **Hardware Specs & Battery Telemetry**: Real-time display of manufacturer, model, Android OS version, SDK level, CPU architecture, security patch level, battery percentage, charging state, and temperature.
- **Reboot Controls**: 1-click reboot to System, Recovery, or Bootloader (Fastboot) mode.
- **3rd-Party Package Inspector**: View all installed third-party APK packages with instant search and package name copy.
- **Live Display Screen Capture**: Capture high-resolution PNG screenshots from the phone display directly in xTerminal.
- **Remote Client ADB Tunnel (Zero-Install WebUSB)**: Send a secure link (`https://yourdomain/adb-bridge.html?session=...`) to remote clients. They open it in Chrome, plug in their phone via USB, and the ADB connection is tunneled across the internet into your xTerminal workstation with zero client-side driver or tool installation!
- **Auto-Polling & Smart Authorization Alert**: Detects unauthorized devices and guides the user to tap "Always allow from this computer" on their phone screen, plus one-click ADB host server daemon reset (`kill-server` & `start-server`).

---

### 👥 xTerminal Multiplayer (Collaborative Remote Terminal)
- **Real-Time Multi-User Collaboration**: Multiple authorized engineers join the same SSH, Telnet, or Local terminal session in real time with synchronized output and ordered keystroke processing.
- **Active Tab Participant Stack**: Circular participant avatar stack displayed right on the active terminal tab with latency indicators and active remote control keyboard badges.
- **Floating Cursor Presence Marker**: Dynamic rounded avatar badge with a directional pointer triangle indicating exactly where a teammate is typing in real time.
- **Terminal Control System**: Single-controller arbitration by default with "Request Control", host approval/denial prompts, and instant host "Take Control" override.
- **Collaboration Drawer**: Built-in 3-tab drawer containing live participant directory, team text chat, and security audit log.
- **Share & Join Modals**: Easy invite modal with Session ID (`XT-XXXXXX`), direct shareable join URL, and custom nickname & avatar selection.
- **Interactive Demo Playground**: Built-in simulation of teammates (Stan and Sarah) for instant testing of presence, chat, control requests, and typing badges without needing a second machine.

### 🔒 Persistent Session Architecture
- **Zero Reconnect on Tab Switch**: Terminal sessions stay persistently mounted in background memory and the DOM. Switching between tabs or navigating across views (Hosts, SFTP, Vault, Settings) **never drops your active connection**.
- **Multi-Tab & Split Panes**: Run multiple concurrent sessions side-by-side or stacked vertically/horizontally.
- **PuTTY & MobaXterm Auto-Copy**: Selecting text automatically copies it to the clipboard; right-click pastes immediately.

### 🖥️ Host & Inventory Management
- **Host Groups**: Organize servers into custom groups with distinctive color badges and descriptions.
- **Dynamic Environment Management**: Add, edit, and manage custom environments (Production, Staging, Database, Network, Lab, Edge, etc.) with custom color accents.
- **Saved Credentials & Auto-Login**: Safely save passwords or assign keys for one-click auto-connect.
- **Pre-Flight Reachability Probes**: Instant network latency diagnostics and DNS resolution checks before connecting.
- **Proxy Jump / Bastion Support**: Multi-hop SSH proxy jump chains.

### 📱 Android & Mobile Support
- **Full Capacitor Android Integration**: Compile and run xTerminal on Android phones and tablets.
- **Mobile Soft Keyboard & Accessory Bar**: Touch-friendly virtual accessory keys (Ctrl, Alt, Esc, Tab, Arrows) designed specifically for mobile terminal sessions without duplicate keystrokes.
- **Standalone Android APK**: Pre-built Android package ready in `release/xTerminal-1.0.0.apk`.

### 📁 Advanced SFTP Explorer & File Manager
- **Dual-Pane File Browser**: Browse remote server directories side-by-side with local files.
- **Background Transfer Queue**: Live upload/download queue with progress bars, pause/resume, and speed metrics.
- **Quick Actions**: Edit, rename, delete, chmod, and inspect remote files directly with breadcrumb navigation and search.

### 🛡️ Safety Engine & Security Vault
- **Command Risk Analyzer**: Pre-evaluates terminal commands and highlights risk levels (`SAFE`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- **Encrypted Local Vault**: AES-256 encrypted credential vault with auto-lock timer and clipboard timeout.
- **Audit Logging**: Comprehensive security audit trail of all sessions, connections, and executed commands.

### 🤖 Gemini AI Copilot
- Integrated terminal diagnosis powered by Google Gemini.
- Highlights and diagnoses terminal error outputs in real-time with one-click fix recommendations.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lyarinet/xTerminal-Next-Gen-SSH-Network-Terminal.git
   cd xTerminal-Next-Gen-SSH-Network-Terminal
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables (optional for AI features):**
   ```bash
   cp .env.example .env
   # Add your GEMINI_API_KEY if using AI terminal copilot
   ```

4. **Run in development mode:**
   ```bash
   npm run dev
   ```

5. **Launch Electron Desktop App:**
   ```bash
   npm run electron:start
   ```

---

## 📦 Building Binaries

### Automated Multi-Platform Cross-Build Engine (Windows, Android, Linux, macOS)
xTerminal includes an interactive PowerShell packaging utility that automates versioning across all targets:
```powershell
# Interactive menu: choose Windows, Android, Linux, macOS, or All
.\build.ps1

# Direct target build with custom version
.\build.ps1 -Target win -Version 1.2.0
.\build.ps1 -Target android -Version 1.2.0
```

### Desktop (Electron)
```bash
# Windows Installer (.exe NSIS)
npm run build:electron:win

# Windows Portable Standalone Executable
npm run build:electron:portable

# macOS (DMG)
npm run build:electron:mac

# Linux (AppImage & DEB)
npm run build:electron:linux
```
*Output location: `release/xTerminal Setup 1.2.0.exe` and `release/win-unpacked/xTerminal.exe`*

### Android APK (Capacitor)
```bash
# Build frontend web assets & sync with Android
npm run build
npx cap sync android

# Compile Debug APK using Gradle
cd android && ./gradlew assembleDebug
```
*Output location: `release/xTerminal-1.2.0.apk`*

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + K` / `Cmd + K` | Open Universal Command Palette |
| `Ctrl + T` / `Cmd + T` | Open New Local Terminal Tab |
| `Alt + S` | Open Serial Terminal Configuration Modal |
| `Mouse Select` | Auto-copy selected text to clipboard |
| `Right Click` | Paste clipboard text into terminal |
| `Ctrl + C` | Send SIGINT / interrupt process |

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, xterm.js, xterm-addon-fit, xterm-addon-search
- **Backend / Desktop**: Electron, Node.js, Express, `ws` (WebSockets), `ssh2` (SSH & SFTP engine), Node `net` (Telnet TCP bridge), `selfsigned` (TLS engine)
- **Mobile**: Capacitor 6, Android SDK, Gradle
- **Bundler & Build**: Vite 6, esbuild, electron-builder
- **AI Integration**: `@google/genai` (Google Gemini API)

---

## 📂 Project Structure

```
xterminal/
├── android/                # Capacitor Android native project & Gradle build
├── electron/               # Electron main and preload scripts
│   ├── main.cjs            # Electron window management & lifecycle
│   └── preload.cjs         # Context bridge
├── build.ps1               # Multi-platform interactive cross-build & packaging engine
├── public/                 # Static assets & client portals
│   ├── serial-bridge.html  # Zero-install WebSerial client portal (COM Ports)
│   └── adb-bridge.html     # Zero-install WebUSB client portal (Android ADB)
├── release/                # Compiled desktop installers and Android APK
├── src/
│   ├── components/         # React UI views & components
│   │   ├── HostsView.tsx           # Host, Group & Environment Manager
│   │   ├── TerminalWorkspace.tsx   # Persistent multi-tab container
│   │   ├── XTermPane.tsx           # xterm.js terminal pane with WebSocket bridge
│   │   ├── SerialConsoleView.tsx   # Serial TTY & Remote Bridge Manager
│   │   ├── AdbManagerView.tsx      # Android ADB Console (Shell, Logcat, Specs, WebUSB)
│   │   ├── SerialSettingsModal.tsx # Serial & Remote IP Tunnel configuration
│   │   ├── SftpView.tsx            # Dual-pane SFTP file browser
│   │   ├── VaultView.tsx           # Encrypted credential keystore
│   │   ├── SettingsView.tsx        # System settings & IP Detection
│   │   └── QuickConnectModal.tsx   # Fast connection dialog
│   ├── lib/
│   │   ├── storage.ts      # Local persistent storage & defaults
│   │   ├── safetyEngine.ts # Command risk evaluation engine
│   │   └── vault.ts        # Encryption and security helpers
│   ├── types.ts            # TypeScript interfaces and types
│   └── App.tsx             # Main application layout and state
├── server.ts               # Express, WebSocket, HTTPS & ADB bridge server
├── package.json            # Scripts and dependencies
└── vite.config.ts          # Vite build configuration
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
