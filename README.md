<div align="center">

<img src="img/banner.jpg" alt="xTerminal Hero Banner" width="100%" style="border-radius: 12px; margin-bottom: 20px;" />

<img src="img/logo.png" alt="xTerminal Logo" width="110" height="110" style="border-radius: 24px; box-shadow: 0 0 25px rgba(56, 189, 248, 0.4);" />

# ⚡ xTerminal
### Next-Generation Multi-Protocol SSH, Telnet, Serial, Android ADB & DevOps Workstation
**Enterprise Remote Access, Cloud Infrastructure & Network Engineering Suite**

[![Version](https://img.shields.io/badge/version-1.2.5-emerald.svg?style=for-the-badge&logo=semver&logoColor=white)](package.json)
[![Snapcraft](https://img.shields.io/badge/Snapcraft-xterminal-82BEA0.svg?style=for-the-badge&logo=snapcraft&logoColor=white)](https://snapcraft.io/xterminal)
[![Electron](https://img.shields.io/badge/Electron-44.2-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Android](https://img.shields.io/badge/Android-Capacitor-3DDC84?style=for-the-badge&logo=android&logoColor=white)](android/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<br />

<p align="center">
  <b>A blazing-fast, modern, privacy-focused terminal workstation built for DevOps engineers, cloud architects, sysadmins, and network professionals.</b><br />
  Cross-platform support across <b>Windows</b>, <b>Linux</b>, <b>macOS</b>, and <b>Android</b>.
</p>

[ 🚀 Features ](#-key-features) &nbsp;•&nbsp;
[ 📸 Visual Tour ](#-visual-showcase--feature-tour) &nbsp;•&nbsp;
[ 📥 Downloads ](#-downloads--installation) &nbsp;•&nbsp;
[ ⚡ Quick Start ](#-quick-start--fresh-pc-setup-windows-linux-macos) &nbsp;•&nbsp;
[ 🥊 Why xTerminal? ](#-feature-comparison--why-xterminal) &nbsp;•&nbsp;
[ 🤝 Contributing ](#-contributing)

<br />

---

### 🖥️ Full-Duplex Terminal Workspace & Local PTY
<img src="img/img1.png" alt="xTerminal Terminal Workspace" width="100%" style="border-radius: 10px;" />
<p align="center"><em>Persistent session engine, multi-tab split panes, live keepalive monitoring, and custom high-contrast themes.</em></p>

</div>

---

> [!TIP]
> **Zero Reconnect on Tab Navigation:** In xTerminal, terminal sessions stay persistently mounted in background memory and the DOM. Switching between tabs or navigating across views (Hosts, SFTP, Vault, Settings) **never drops your active connection**.

---

## 🥊 Feature Comparison — Why xTerminal?

| Feature | xTerminal | PuTTY | Termius | MobaXterm |
| :--- | :---: | :---: | :---: | :---: |
| **Open Source & 100% Free** | ✅ **Yes (MIT)** | ✅ Yes | ❌ Paid / Freemium | ❌ Proprietary |
| **Cross-Platform (Win, Linux, Mac, Android)**| ✅ **All 4** | ❌ Windows Only | ✅ Yes | ❌ Windows Only |
| **Multiplayer Team Sharing (Live Relay)** | ✅ **Built-in** | ❌ No | ❌ Team Plan ($$$) | ❌ No |
| **Multi-Host Command Orchestrator** | ✅ **Parallel** | ❌ No | ❌ No | ⚠️ Basic Multi-Exec |
| **Zero-Install Remote Serial Bridge** | ✅ **WebSerial URL** | ❌ No | ❌ No | ❌ No |
| **Integrated Android ADB Console** | ✅ **USB + Wi-Fi** | ❌ No | ❌ No | ❌ No |
| **Native TFTP Server & Client** | ✅ **RFC 1350/2348**| ❌ No | ❌ No | ✅ Windows Only |
| **Direct VNC Remote Desktop (noVNC)** | ✅ **Embedded** | ❌ No | ❌ No | ✅ VNC Client |
| **Session Recording & Asciinema v2 Replay** | ✅ **Built-in** | ⚠️ Plain Log | ❌ No | ❌ No |
| **Zero Telemetry / Local Encrypted Vault** | ✅ **AES-256** | ⚠️ Registry | ❌ Cloud Sync | ⚠️ Registry/INI |

---

## 📸 Visual Showcase & Feature Tour

<div align="center">

### 📊 Real-Time Telemetry & Hardware Health Dashboard
<img src="img/img2.png" alt="Workstation Dashboard" width="100%" style="border-radius: 8px;" />
<p align="center"><em>Hardware telemetry, active sessions feed, bandwidth activity, and background SFTP queues.</em></p>

---

### 🌐 Multi-Host Command Orchestrator & Parallel Runner
<img src="img/img8.png" alt="Multi-Host Command Orchestrator" width="100%" style="border-radius: 8px;" />
<p align="center"><em>Execute shell commands simultaneously across infrastructure nodes with safety risk evaluation and synchronized diff view.</em></p>

---

### 👥 Real-Time Multiplayer Collaboration & Team Terminals
| Session Sharing & Control Governance | Live Presence Drawer & Team Chat |
| :---: | :---: |
| <img src="img/img6.png" alt="Share Multiplayer Session" width="100%" style="border-radius: 6px;" /> | <img src="img/img7.png" alt="Multiplayer Collab Sidebar" width="100%" style="border-radius: 6px;" /> |
| *Share secure link with Read-Only or Interactive mode* | *Live participant list, typing indicators & real-time chat* |

---

### 🔄 Universal Bookmark & Connection Importer
<img src="img/img5.png" alt="Universal Connection Importer" width="100%" style="border-radius: 8px;" />
<p align="center"><em>One-click migration from PuTTY Registry, SecureCRT XML, Termius JSON, MobaXterm INI, OpenSSH Config, and CSV/Excel.</em></p>

---

### 🗂️ Advanced Host & Infrastructure Management
| Add New Server (SSH / Telnet) | Custom Host Groups & Color Badges |
| :---: | :---: |
| <img src="img/img3.png" alt="Add New Server" width="100%" style="border-radius: 6px;" /> | <img src="img/img4.png" alt="Create New Host Group" width="100%" style="border-radius: 6px;" /> |
| *Encrypted password store, bastion jumps & key vault* | *Organize clusters with environments and tags* |

---

### 🔌 Zero-Install Remote Serial Bridge (WebSerial over IP)
| Remote Serial URL Generator | Active Session Waiting Portal |
| :---: | :---: |
| <img src="img/img10.png" alt="Remote Serial URL Generator" width="100%" style="border-radius: 6px;" /> | <img src="img/img11.png" alt="Active Remote Serial Portal" width="100%" style="border-radius: 6px;" /> |
| *Auto-detects host IP and generates secure link* | *Client opens Chrome/Edge and plugs console cable* |

### 🌐 Client-Side Browser Serial Connection
<img src="img/img12.png" alt="Client-Side WebSerial Tunnel" width="100%" style="border-radius: 8px;" />
<p align="center"><em>Remote technician plugs their USB console cable into Chrome/Edge with zero software install and connects directly into your console.</em></p>

---

### 📁 Dual-Pane SFTP File Manager (Native SSH2 Engine)
<img src="img/img9.png" alt="SFTP File Manager" width="100%" style="border-radius: 8px;" />
<p align="center"><em>Direct Port 22 SFTP Subsystem with directory quick-jumps, dual-pane layout, drag-and-drop, and resume queues.</em></p>

---

### 🤖 Android ADB Console & WebUSB Remote Bridge
<img src="img/img13.png" alt="Android ADB Console" width="100%" style="border-radius: 8px;" />
<p align="center"><em>Interactive ADB shell, live logcat streaming, hardware specs, Wi-Fi pairing, and remote WebUSB client bridge.</em></p>

---

### 📡 TFTP Server & Remote Transfer Client (RFC 1350 / 2348)
<img src="img/img14.png" alt="TFTP Server & Client" width="100%" style="border-radius: 8px;" />
<p align="center"><em>Built-in UDP TFTP daemon for Cisco/MikroTik firmware staging, backups, and restores with live transfer metrics.</em></p>

---

### 🛠️ Network Diagnostics & Workstation Settings
| Port Scanner, Ping & Traceroute | Workstation Settings & Interface Discovery |
| :---: | :---: |
| <img src="img/img15.png" alt="Network Diagnostics" width="100%" style="border-radius: 6px;" /> | <img src="img/img16.png" alt="Settings & Config" width="100%" style="border-radius: 6px;" /> |
| *Multithreaded port scanner, ICMP ping, traceroute & WoL* | *Reverse proxy configs, auto TLS, and LAN/WAN interface detection* |

</div>

---

## 📥 Downloads & Installation

Download official pre-built packages from the [**Releases Page**](https://github.com/lyarinet/xTerminal-Next-Gen-SSH-Network-Terminal/releases).

| Platform | Format | How to Install |
| :--- | :--- | :--- |
| 🐧 **Linux (Snap)** | Canonical Snap | `sudo snap install xterminal` |
| 🐧 **Linux (Portable)**| AppImage | `chmod +x xTerminal-*.AppImage && ./xTerminal-*.AppImage` |
| 🐧 **Linux (Debian/Ubuntu)** | `.deb` package | `sudo dpkg -i xTerminal_*_amd64.deb` |
| 🐧 **Linux (Fedora/RHEL)** | `.rpm` package | `sudo dnf install ./xTerminal-*.rpm` |
| 🪟 **Windows** | Setup `.exe` / Portable | Run `xTerminal Setup 1.2.6.exe` or portable standalone `.exe` |
| 🍎 **macOS** | `.dmg` (Apple Silicon & Intel) | Drag `xTerminal.app` to `/Applications` |
| 🤖 **Android** | `.apk` / Play Store `.aab` | Download `xTerminal-1.2.6.apk` or install via Google Play |

> [!NOTE]
> **Hardware & Serial Permissions for Linux Snap:**  
> To allow xTerminal to communicate with USB console cables and ADB hardware in Snap:
> ```bash
> sudo snap connect xterminal:serial-port
> sudo snap connect xterminal:raw-usb
> sudo snap connect xterminal:removable-media
> ```

---

## 🚀 Quick Start / Fresh PC Setup (Windows, Linux, macOS)

xTerminal provides automated, interactive setup scripts that check system prerequisites, install missing dependencies, and launch the workstation with a single command.

### 🪟 Windows (One-Click Setup)
```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```
*Auto-detects and installs Node.js LTS and Git via `winget` if missing, sets up `.env`, runs `npm install`, and verifies the build.*

### 🐧 Linux (Ubuntu, Debian, Fedora, Arch) & 🍎 macOS
```bash
chmod +x setup.sh && ./setup.sh
```
*Auto-detects your system package manager (`apt`, `dnf`, `pacman`, `brew`), installs build dependencies, and compiles the bundle.*

### 🌐 Universal Setup (Any OS with Node.js)
```bash
npm run setup
# or: node setup.cjs
```

---

## ✨ Key Features Breakdown

### 🌐 Multi-Protocol Terminal Engine
- **Full-Duplex SSH Engine**: Powered by `ssh2` with support for password authentication, private keys (Ed25519, RSA, ECDSA), and interactive masked password prompts.
- **Real-Time Telnet Engine**: Native raw TCP Telnet client (Port 23 or custom) with auto-login detection (`login:`, `password:`) and terminal stream piping.
- **Local Station PTY**: Instant local terminal access (PowerShell on Windows, Bash/Zsh on Linux and macOS) with automatic user home directory detection.
- **Serial TTY & Microcontroller Console**: Local hardware serial communication via WebSerial API (COM / TTY ports, baud rates up to 921600, data bits, parity, stop bits, flow control, RTS/DTR pins, and 250ms Break signals).
- **TFTP Engine (Server & Client)**: Full RFC 1350 & RFC 2348 implementation for firmware image transfers, Cisco/MikroTik backup & restore, with configurable block sizes and live transfer speed metrics.

### 🎥 Terminal Session Recording & Replay Player (Asciinema v2)
- **1-Click Live Recording**: Top toolbar record button with live timer (`REC 0:14`) captures all user keystrokes and server outputs with millisecond precision.
- **Interactive Player & Saved Library**: Dedicated modal with timeline scrubber, playback speeds (`1x`, `2x`, `4x`), restart, and terminal text search.
- **Asciinema v2 Support**: Export and import standard `.cast` session files for team audits, documentation, and training walkthroughs.

### 👥 xTerminal Multiplayer (Collaborative Remote Terminal)
- **Real-Time Multi-User Collaboration**: Multiple engineers join the same SSH, Telnet, or Local terminal session in real time with synchronized output and ordered keystroke processing.
- **Active Tab Participant Stack**: Circular participant avatar stack displayed right on the active terminal tab with latency indicators and active remote control keyboard badges.
- **Floating Cursor Presence Marker**: Dynamic rounded avatar badge indicating exactly where a teammate is typing in real time.
- **Terminal Control System**: Single-controller arbitration by default with "Request Control", host approval/denial prompts, and instant host "Take Control" override.

### 🖥️ In-Built VNC Remote Desktop (noVNC)
- **Zero-External-Server noVNC Engine**: Built-in HTML5 Canvas RFB client powered by `@novnc/novnc` and an embedded Node.js TCP-to-WebSocket bridge (`/ws/vnc`). Connect directly to any Linux, macOS, or Windows VNC server (Port 5900) with zero external servers, Docker containers, websockify, or Guacamole daemons!
- **Ctrl+Alt+Del & Clipboard Sync**: One-click key sequence injection and bidirectional clipboard synchronization.

### 🛡️ Safety Engine & Security Vault
- **Command Risk Analyzer**: Pre-evaluates terminal commands and highlights risk levels (`SAFE`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- **Encrypted Local Vault**: AES-256 encrypted credential vault with auto-lock timer and clipboard timeout.
- **Audit Logging**: Comprehensive security audit trail of all sessions, connections, and executed commands.

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

## 🛠️ Tech Stack & Architecture

- **Frontend UI**: React 19, TypeScript, Tailwind CSS, Lucide Icons, xterm.js, xterm-addon-fit, xterm-addon-search
- **Backend & Native Core**: Electron 44, Node.js, Express, `ws` (WebSockets), `ssh2` (SSH & SFTP engine), Node `net` (Telnet TCP bridge), `selfsigned` (TLS engine)
- **Mobile Engine**: Capacitor 6, Android SDK, Gradle
- **Bundler & Build Pipeline**: Vite 6, esbuild, electron-builder
- **AI Diagnostics**: `@google/genai` (Google Gemini API)

---

## 📦 Building from Source

```bash
# Clone the repository
git clone https://github.com/lyarinet/xTerminal-Next-Gen-SSH-Network-Terminal.git
cd xTerminal-Next-Gen-SSH-Network-Terminal

# Install dependencies
npm install

# Start development server
npm run dev

# Build binaries
npm run build:electron:win       # Windows Installer
npm run build:electron:portable  # Windows Portable
npm run build:electron:linux     # Linux AppImage & DEB
npm run build:electron:mac       # macOS DMG
npm run build:android            # Android APK
```

---

## 🤝 Contributing

We warmly welcome contributions from developers, sysadmins, and network engineers around the world! 

1. **Fork** the repo & clone your fork.
2. Create a feature branch: `git checkout -b feature/awesome-new-protocol`.
3. Commit your changes: `git commit -m "feat(serial): add flow control options"`.
4. Push to branch: `git push origin feature/awesome-new-protocol`.
5. Open a **Pull Request**!

### 💖 Contributors & Community

A huge thank you to everyone who has contributed to making **xTerminal** the premier open-source DevOps and network terminal workstation!

<div align="center">
  <a href="https://github.com/lyarinet/xTerminal-Next-Gen-SSH-Network-Terminal/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=lyarinet/xTerminal-Next-Gen-SSH-Network-Terminal" />
</a>
  <br /><br />
  <sub>Made with ❤️ by <a href="https://github.com/lyarinet">Lyarinet</a> and our amazing open-source community.</sub>
</div>

---

## 📄 License

This project is open source and licensed under the [MIT License](LICENSE).
<br />
<sub>Powered by <a href="https://github.com/lyarinet">Lyarinet</a></sub>
