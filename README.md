<div align="center">

# ⚡ xTerminal
### Next-Generation Multi-Protocol SSH, Telnet & DevOps Desktop Workstation

[![Version](https://img.shields.io/badge/version-1.0.0-emerald.svg?style=for-the-badge)](package.json)
[![Electron](https://img.shields.io/badge/Electron-44.2.0-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](LICENSE)

<p align="center">
  A blazing-fast, modern, feature-packed terminal workstation designed for DevOps engineers, sysadmins, and network professionals. Built with Electron, React 19, Vite, xterm.js, and Node.js.
</p>

</div>

---

## ✨ Key Features

### 🌐 Multi-Protocol Terminal Engine
- **Full-Duplex SSH Engine**: Powered by `ssh2` with support for password authentication, private keys (Ed25519, RSA, ECDSA), and interactive masked password prompts.
- **Real-Time Telnet Engine**: Native raw TCP Telnet client (Port 23 or custom) with auto-login detection (`login:`, `password:`) and terminal stream piping.
- **Local Station PTY**: Instant local terminal access (PowerShell on Windows, Bash/Zsh on Linux and macOS).
- **Serial Console**: Hardware serial communication (COM/TTY ports, baud rate, data bits, parity, stop bits).
- **TFTP Engine**: Built-in TFTP client and server for router/switch firmware and configuration management.

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

### 📁 SFTP File Manager
- **Dual-Pane File Browser**: Browse remote server directories side-by-side with local files.
- **Background Transfer Queue**: Live upload/download queue with progress bars, pause/resume, and speed metrics.
- **Quick Actions**: Edit, rename, delete, chmod, and inspect remote files directly.

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

## 📦 Building Desktop Binaries

xTerminal can be compiled into native installers and standalone executables using `electron-builder`:

### Windows
```bash
# Full NSIS Windows Installer (.exe)
npm run build:electron:win

# Portable Standalone Executable
npm run build:electron:portable
```
*Output location: `release/xTerminal Setup 1.0.0.exe` and `release/win-unpacked/xTerminal.exe`*

### macOS
```bash
npm run build:electron:mac
```

### Linux (AppImage & DEB)
```bash
npm run build:electron:linux
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + K` / `Cmd + K` | Open Universal Command Palette |
| `Ctrl + T` / `Cmd + T` | Open New Local Terminal Tab |
| `Mouse Select` | Auto-copy selected text to clipboard |
| `Right Click` | Paste clipboard text into terminal |
| `Ctrl + C` | Send SIGINT / interrupt process |

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, xterm.js, xterm-addon-fit, xterm-addon-search
- **Backend / Desktop**: Electron, Node.js, Express, `ws` (WebSockets), `ssh2` (SSH & SFTP engine), Node `net` (Telnet TCP bridge)
- **Bundler & Build**: Vite 6, esbuild, electron-builder
- **AI Integration**: `@google/genai` (Google Gemini API)

---

## 📂 Project Structure

```
xterminal/
├── electron/               # Electron main and preload scripts
│   ├── main.cjs            # Electron window management & lifecycle
│   └── preload.cjs         # Context bridge
├── src/
│   ├── components/         # React UI views & components
│   │   ├── HostsView.tsx           # Host, Group & Environment Manager
│   │   ├── TerminalWorkspace.tsx   # Persistent multi-tab container
│   │   ├── XTermPane.tsx           # xterm.js terminal pane with WebSocket bridge
│   │   ├── SftpView.tsx            # Dual-pane SFTP file browser
│   │   ├── VaultView.tsx           # Encrypted credential keystore
│   │   └── QuickConnectModal.tsx   # Fast connection dialog
│   ├── lib/
│   │   ├── storage.ts      # Local persistent storage & defaults
│   │   ├── safetyEngine.ts # Command risk evaluation engine
│   │   └── vault.ts        # Encryption and security helpers
│   ├── types.ts            # TypeScript interfaces and types
│   └── App.tsx             # Main application layout and state
├── server.ts               # Local Express & WebSocket SSH/Telnet bridge
├── package.json            # Scripts and dependencies
└── vite.config.ts          # Vite build configuration
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
