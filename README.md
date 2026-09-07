<div align="center">

# ⚡ xTerminal
### Next-Generation Multi-Protocol SSH, Telnet, Serial, Android ADB & DevOps Workstation
**Enterprise Remote Access, Cloud & Network Engineering Suite**

[![Version](https://img.shields.io/badge/version-1.2.2-emerald.svg?style=for-the-badge)](package.json)
[![Electron](https://img.shields.io/badge/Electron-44.2.0-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org/)
[![Android](https://img.shields.io/badge/Android-Capacitor-3DDC84?style=for-the-badge&logo=android&logoColor=white)](android/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](LICENSE)

<p align="center">
  A blazing-fast, modern, feature-packed terminal workstation designed for DevOps engineers, sysadmins, and network professionals. Built with Electron, Capacitor, React 19, Vite, xterm.js, and Node.js.
</p>

---

### 🖥️ Multi-Protocol Workstation & Local PTY
![xTerminal Terminal Workspace](img/img1.png)
*Full-duplex terminal workspace featuring persistent sessions, split panes, theme switching, keepalive, and live status bar.*

</div>

---

## 📸 Visual Showcase & Feature Tour

<div align="center">

### 📊 System Health & Performance Dashboard
![Workstation Dashboard](img/img2.png)
*Real-time CPU and RAM hardware telemetry, active sessions feed, and background SFTP transfer queues.*

---

### 🌐 Multi-Host Command Orchestrator & Broadcast Runner
![Multi-Host Command Orchestrator](img/img8.png)
*Execute shell commands in parallel across multiple target servers with safety risk pre-analysis and synchronized real-time comparison.*

---

### 👥 Real-Time Multiplayer Collaboration & Team Terminals
| Session Sharing & Access Control | Live Collaboration & Presence Drawer |
| :---: | :---: |
| ![Share Multiplayer Session](img/img6.png) | ![Multiplayer Collab Sidebar](img/img7.png) |
| *Share session via direct link with custom control policy* | *Live participant directory, typing markers & chat* |

---

### 🔄 Universal Bookmark & Connection Importer
![Universal Connection Importer](img/img5.png)
*One-click migration from PuTTY Registry, SecureCRT XML, Termius JSON, MobaXterm INI, OpenSSH Config, and CSV/Excel.*

---

### 🗂️ Advanced Host & Environment Management
| Add New Server (SSH / Telnet) | Custom Host Groups & Color Badges |
| :---: | :---: |
| ![Add New Server](img/img3.png) | ![Create New Host Group](img/img4.png) |
| *Encrypted password store, bastions & keystore* | *Organize infrastructure with custom environments* |

---

### 🔌 Zero-Install Remote Serial Bridge (WebSerial over IP)
| Remote Serial URL Generator | Active Session Waiting Portal |
| :---: | :---: |
| ![Remote Serial URL Generator](img/img10.png) | ![Active Remote Serial Portal](img/img11.png) |
| *Auto-detects host IP and generates secure remote link* | *Live status waiting for client to connect console cable* |

### 🌐 Client-Side Browser Serial Connection (Zero Software Install)
![Client-Side WebSerial Tunnel](img/img12.png)
*Remote client opens the link in Chrome/Edge, selects their USB Serial adapter, and connects directly into your xTerminal console.*

---

### 📁 SFTP Dual-Pane File Manager (Real SSH2 Engine)
![SFTP File Manager](img/img9.png)
*Direct SSH Port 22 Subsystem file manager with quick folder jumps, dual-pane browsing, and drag-and-drop transfers.*

---

### 🤖 Android ADB Console & WebUSB Remote Bridge
![Android ADB Console](img/img13.png)
*Interactive shell, live logcat streaming, hardware telemetry, and zero-install WebUSB remote tunneling.*

---

### 📡 TFTP Server & Remote Transfer Client (RFC 1350 / 2348)
![TFTP Server & Client](img/img14.png)
*Native UDP TFTP daemon and client for switch firmware staging, backup, and restore with live transfer speed metrics.*

---

### 🛠️ Network Diagnostics, Scanner & System Settings
| Network Diagnostics & Port Scanner | Workstation Settings & Interface Discovery |
| :---: | :---: |
| ![Network Diagnostics](img/img15.png) | ![Settings & Config](img/img16.png) |
| *Multithreaded port scanner, ICMP ping, traceroute, WoL* | *Serial defaults, reverse proxy setup & LAN/WAN IP detection* |

</div>

---

## 🚀 Quick Start / Fresh PC Setup (Windows, Linux, macOS)

xTerminal provides automated, interactive setup scripts that check system prerequisites, install missing dependencies, initialize configuration files, and launch the application on any fresh operating system.

### 🪟 Windows (One-Click Setup)
Open PowerShell in the project folder and run:
```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```
*Auto-detects and offers to install Node.js LTS and Git via `winget` if missing, creates `.env` from template, installs project dependencies (`npm install`), and verifies the build.*

### 🐧 Linux (Ubuntu, Debian, Fedora, Arch) & 🍎 macOS
Open your terminal in the project folder and run:
```bash
chmod +x setup.sh
./setup.sh
```
*Auto-detects OS package managers (`apt`, `dnf`, `pacman`, `brew`), installs Node.js, npm, git, and native build essentials, configures `.env`, and builds the bundle.*

### 🌐 Universal Command (Any OS with Node.js)
```bash
npm run setup
# or: node setup.cjs
```

---

## ✨ Key Features

### 🌐 Multi-Protocol Terminal Engine
- **Full-Duplex SSH Engine**: Powered by `ssh2` with support for password authentication, private keys (Ed25519, RSA, ECDSA), and interactive masked password prompts.
- **Real-Time Telnet Engine**: Native raw TCP Telnet client (Port 23 or custom) with auto-login detection (`login:`, `password:`) and terminal stream piping.
- **Local Station PTY**: Instant local terminal access (PowerShell on Windows, Bash/Zsh on Linux and macOS) with automatic user home directory detection.
- **Serial TTY & Microcontroller Console**: Local hardware serial communication via WebSerial API (COM / TTY ports, baud rates up to 921600, data bits, parity, stop bits, flow control, RTS/DTR pins, and 250ms Break signals).
- **TFTP Engine (Server & Client)**: Full RFC 1350 & RFC 2348 implementation for firmware image transfers, Cisco/MikroTik backup & restore, with configurable block sizes and live transfer speed metrics.

---

### 🎥 Terminal Session Recording & Replay Player (Asciinema v2)
- **1-Click Live Recording**: Top toolbar record button with live timer (`REC 0:14`) captures all user keystrokes and server outputs with millisecond precision.
- **Interactive Player & Saved Library**: Dedicated modal with timeline scrubber, playback speeds (`1x`, `2x`, `4x`), restart, and terminal text search.
- **Asciinema v2 Support**: Export and import standard `.cast` session files for team audits, documentation, and training walkthroughs.
- **Demo Mode**: Instant preloaded interactive session demonstration without requiring an active remote server.

---

### 🔌 Remote Serial Console Bridge (WebSerial over IP / Reverse Tunnel)
Access and configure remote switches/routers (Cisco, MikroTik, Juniper, Huawei, Fortinet) even when they have **zero IP or network configuration**!
- **Shareable Client Portal**: Generate an instant, secure remote link from xTerminal and send it to your remote client via WhatsApp, Slack, or Email.
- **Zero Client Installation**: The client simply opens the link in Google Chrome or Microsoft Edge, plugs their console cable into their laptop, and clicks **Connect**.
- **Live Bi-Directional Tunnel**: The client's serial data is tunneled directly into your xTerminal console with synchronized bi-directional terminal I/O.
- **Auto IP Detection & Host Assignment**: Built-in network scanner detects all local host IP addresses (Wi-Fi, Ethernet, LAN, WSL, Hyper-V) and automatically synchronizes with the remote link generator.
- **Built-in HTTPS Server (:3443)**: Overcomes Chromium's strict `SecureContext` requirement for the Web Serial API on network IP addresses with automated in-memory TLS and WebSocket upgrade (`wss://`).

---

### 🤖 Android ADB Console (Direct USB, Wireless Wi-Fi & WebUSB Remote Bridge)
Complete Android management and debugging environment integrated right into xTerminal:
- **Interactive ADB Shell**: Full-duplex interactive Linux terminal (`adb shell`) running on `xterm.js` with auto-resizing, colors, and raw PTY stream.
- **Wireless Wi-Fi ADB (`adb connect`)**: Connect to any Android device on your local Wi-Fi network without cables (e.g. `192.168.1.34:5555`).
- **1-Click TCP/IP Switch**: Convert any USB-connected device to Wireless Wi-Fi mode on port 5555 with one click (`adb tcpip 5555`).
- **Android 11+ Wireless Debugging Pairing**: Built-in support for 6-digit Wi-Fi pairing codes and dynamic port allocation (`adb pair`).
- **Live Logcat Streaming**: Real-time logcat viewer with tag/keyword filters, live pausing, and snapshot dumping.
- **Hardware Specs & Battery Telemetry**: Real-time display of manufacturer, model, Android OS version, SDK level, CPU architecture, security patch level, battery percentage, charging state, and temperature.
- **Remote Client ADB Tunnel (Zero-Install WebUSB)**: Send a secure link (`https://yourdomain/adb-bridge.html?session=...`) to remote clients. They plug in their phone via USB and the ADB session is securely tunneled into xTerminal.

---

### 👥 xTerminal Multiplayer (Collaborative Remote Terminal)
- **Real-Time Multi-User Collaboration**: Multiple engineers join the same SSH, Telnet, or Local terminal session in real time with synchronized output and ordered keystroke processing.
- **Active Tab Participant Stack**: Circular participant avatar stack displayed right on the active terminal tab with latency indicators and active remote control keyboard badges.
- **Floating Cursor Presence Marker**: Dynamic rounded avatar badge with a directional pointer triangle indicating exactly where a teammate is typing in real time.
- **Terminal Control System**: Single-controller arbitration by default with "Request Control", host approval/denial prompts, and instant host "Take Control" override.
- **Collaboration Drawer**: Built-in 3-tab drawer containing live participant directory, team text chat, and security audit log.

---

### 🔒 Persistent Session Architecture
- **Zero Reconnect on Tab Switch**: Terminal sessions stay persistently mounted in background memory and the DOM. Switching between tabs or navigating across views (Hosts, SFTP, Vault, Settings) **never drops your active connection**.
- **Multi-Tab & Split Panes**: Run multiple concurrent sessions side-by-side or stacked vertically/horizontally.
- **PuTTY & MobaXterm Auto-Copy**: Selecting text automatically copies it to the clipboard; right-click pastes immediately.

---

### 🖥️ In-Built VNC Remote Desktop (noVNC)
- **Zero-External-Server noVNC Engine**: Built-in HTML5 Canvas RFB client powered by `@novnc/novnc` and an embedded Node.js TCP-to-WebSocket bridge (`/ws/vnc`). Connect directly to any Linux, macOS, or Windows VNC server (Port 5900) with zero external servers, Docker containers, websockify, or Guacamole daemons!
- **Interactive & View-Only Controls**: Full mouse and keyboard event mapping with instant view-only toggle for non-intrusive monitoring.
- **Ctrl+Alt+Del & Clipboard Sync**: One-click key sequence injection (Ctrl+Alt+Del, Super/WinKey, Esc, Tab) and bidirectional clipboard synchronization.

---

### 📁 Advanced SFTP Explorer & File Manager
- **Dual-Pane File Browser**: Browse remote server directories side-by-side with local files.
- **Background Transfer Queue**: Live upload/download queue with progress bars, pause/resume, and speed metrics.
- **Quick Actions**: Edit, rename, delete, chmod, and inspect remote files directly with breadcrumb navigation and search.

---

### 🛡️ Safety Engine & Security Vault
- **Command Risk Analyzer**: Pre-evaluates terminal commands and highlights risk levels (`SAFE`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- **Encrypted Local Vault**: AES-256 encrypted credential vault with auto-lock timer and clipboard timeout.
- **Audit Logging**: Comprehensive security audit trail of all sessions, connections, and executed commands.

---

### 🤖 Gemini AI Copilot
- Integrated terminal diagnosis powered by Google Gemini.
- Highlights and diagnoses terminal error outputs in real-time with one-click fix recommendations.

---

## 📦 Building Binaries

### Automated Multi-Platform Cross-Build Engine
xTerminal includes an interactive PowerShell packaging utility that automates building across all targets:
```powershell
# Interactive menu: choose Windows, Android, Linux, macOS, or All
.\build.ps1

# Direct target build with custom version
.\build.ps1 -Target win -Version 1.2.2
.\build.ps1 -Target android -Version 1.2.2
```

### Desktop (Electron)
```bash
# Windows Installer (.exe NSIS)
npm run build:electron:win

# Windows Portable Standalone Executable
npm run build:electron:portable

# macOS (.dmg / .zip for Apple Silicon & Intel)
npm run build:electron:mac

# Linux (AppImage & DEB)
npm run build:electron:linux
```
*Output location: `release/`*

> 🍎 **macOS Notice ("App is damaged and can't be opened"):**
> When downloading unnotarized binaries on macOS, Gatekeeper flags the downloaded file with a quarantine attribute. To launch xTerminal, drag it to `/Applications` and run:
> ```bash
> xattr -cr /Applications/xTerminal.app
> ```

### Android APK (Capacitor)
```bash
# Build frontend web assets & sync with Android
npm run build
npx cap sync android

# Compile Debug APK using Gradle
cd android && ./gradlew assembleDebug
```
*Output location: `release/xTerminal-1.2.2.apk`*

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
- **Backend / Desktop**: Electron 44, Node.js, Express, `ws` (WebSockets), `ssh2` (SSH & SFTP engine), Node `net` (Telnet TCP bridge), `selfsigned` (TLS engine)
- **Mobile**: Capacitor 6, Android SDK, Gradle
- **Bundler & Build**: Vite 6, esbuild, electron-builder
- **AI Integration**: `@google/genai` (Google Gemini API)

---

## 🤝 Contributing

We welcome contributions from developers, sysadmins, DevOps, and network engineers around the world! Whether you want to fix a bug, add a new protocol, improve performance, or enhance documentation, your help is warmly appreciated.

### 🌟 Ways to Contribute
- **Bug Reports & Feedback**: Found an issue? [Open an Issue](https://github.com/lyarinet/xTerminal-Next-Gen-SSH-Network-Terminal/issues) with reproduction steps and logs.
- **Feature Requests**: Have an idea for a protocol or automation tool? Share your thoughts in Issues.
- **Code & Enhancements**: Add new features, optimize PTY/WebSocket latency, or expand mobile UI capabilities.
- **Documentation & Guides**: Help improve tutorials, configuration examples, and device compatibility lists.

### 🛠️ Development & Pull Request Workflow

1. **Fork the Repository**:
   Click the **Fork** button at the top right of this repository.

2. **Clone your fork**:
   ```bash
   git clone https://github.com/<your-username>/xTerminal-Next-Gen-SSH-Network-Terminal.git
   cd xTerminal-Next-Gen-SSH-Network-Terminal
   ```

3. **Install Dependencies & Start Dev Server**:
   ```bash
   npm install
   npm run dev
   ```

4. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or for bugfixes:
   git checkout -b fix/issue-description
   ```

5. **Make your changes & Verify**:
   - Ensure clean code formatting and type safety.
   - Test locally with `npm run build` or Electron desktop (`npm run electron:start`).
   - Run type checks: `npm run lint`.

6. **Commit & Push**:
   ```bash
   git add .
   git commit -m "feat(module): add descriptive commit message"
   git push origin feature/your-feature-name
   ```

7. **Submit a Pull Request (PR)**:
   - Go to your fork on GitHub and click **Compare & pull request**.
   - Describe what changed, why, and provide screenshots if UI was updated.

### 📜 Code Guidelines
- Use idiomatic TypeScript with strict typings wherever possible.
- Keep UI components responsive and compliant with dark mode styling (`#0A0A0B`, `#111112`, `#1C1C1E`).
- Ensure high-performance, non-blocking I/O for terminal streams, WebSockets, and PTY bridges.

---

### 💖 Contributors & Community

A huge thank you to everyone who has contributed to making **xTerminal** the premier open-source DevOps and network terminal workstation!

<a href="https://github.com/lyarinet/xTerminal-Next-Gen-SSH-Network-Terminal/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=lyarinet/xTerminal-Next-Gen-SSH-Network-Terminal" alt="xTerminal Contributors" />
</a>

*Made with ❤️ by [Lyarinet](https://github.com/lyarinet) and our amazing open-source community.*

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
<br>
<sub>Powered by <a href="https://github.com/lyarinet">Lyarinet</a></sub>
