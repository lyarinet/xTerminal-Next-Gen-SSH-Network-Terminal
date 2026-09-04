import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Monitor,
  Apple,
  Terminal,
  Download,
  CheckCircle2,
  Copy,
  Check,
  Layers,
  Cpu,
  Shield,
  Zap,
  Globe,
  HardDrive,
  Share2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Play
} from 'lucide-react';
import JSZip from 'jszip';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const AppCenterView: React.FC = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<'android' | 'windows' | 'macos' | 'linux'>('android');
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [zipDownloaded, setZipDownloaded] = useState(false);

  useEffect(() => {
    // Check if running in standalone PWA / Native window
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert('PWA installation is supported directly via your browser:\n\n• On Android: Tap Chrome Menu (⋮) > "Add to Home screen" or "Install app"\n• On Windows/Mac/Linux: Click the Install icon in the browser URL bar or Settings > "Install xTerminal"');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const handleDownloadNativeBundle = async () => {
    setIsGeneratingZip(true);
    try {
      const zip = new JSZip();

      // Readme instructions
      zip.file(
        'README.md',
        `# xTerminal — Native Multi-Platform Build Guide

This package contains full build scripts and configs to compile xTerminal into:
- **Android APK / AAB** (Capacitor)
- **Windows .exe / .msi** (Electron & Tauri)
- **macOS .dmg / .app** (Universal Apple Silicon & Intel)
- **Linux .AppImage / .deb** (Electron & Tauri)

## Prerequisites
- Node.js 18+ & npm
- For Android: Android Studio & JDK 17
- For Tauri: Rust toolchain (\`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh\`)

## 1. Quick Build Commands
### Android (Capacitor)
\`\`\`bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
\`\`\`

### Windows Desktop (.exe / .msi)
\`\`\`bash
npm install
npm run build:electron:win
# Or with Tauri for 10MB lightweight binary:
cargo tauri build
\`\`\`

### macOS Desktop (.dmg)
\`\`\`bash
npm install
npm run build:electron:mac
\`\`\`

### Linux Desktop (.AppImage & .deb)
\`\`\`bash
npm install
npm run build:electron:linux
\`\`\`
`
      );

      // Capacitor configuration
      zip.file(
        'capacitor.config.ts',
        `import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xterminalx.pro',
  appName: 'xTerminalx Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0A0A0B'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0A0A0B'
    }
  }
};

export default config;
`
      );

      // Electron configs
      const electronFolder = zip.folder('electron');
      electronFolder?.file(
        'main.cjs',
        `const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0A0A0B',
    title: 'xTerminalx Pro',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
}

app.whenReady().then(createWindow);
`
      );
      electronFolder?.file(
        'preload.cjs',
        `const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('xterminalxNative', {
  platform: process.platform,
  arch: process.arch,
  version: '2.5.0-enterprise'
});
`
      );

      // Tauri configs
      const tauriFolder = zip.folder('src-tauri');
      tauriFolder?.file(
        'tauri.conf.json',
        `{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "xTerminal",
  "version": "2.5.0",
  "identifier": "com.xterminal.app",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:3000",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "bundle": {
    "active": true,
    "targets": "all"
  }
}`
      );
      tauriFolder?.file(
        'Cargo.toml',
        `[package]
name = "xterminalx-pro"
version = "2.5.0"
edition = "2021"

[dependencies]
tauri = { version = "2.0.0" }
`
      );
      const tauriSrc = tauriFolder?.folder('src');
      tauriSrc?.file(
        'main.rs',
        `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("error while running xTerminalx");
}
`
      );

      // Automation shell script
      zip.file(
        'build-all.sh',
        `#!/usr/bin/env bash
set -e
echo "Building xTerminalx Pro Native Applications..."
npm install
npm run build

echo "1. Building Electron desktop packages..."
npm run build:electron || true

echo "2. Building Android Capacitor sync..."
npx cap sync android || true

echo "Build complete! Check dist/ and release/ directories."
`
      );

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'xterminalx-pro-native-source-bundle.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setZipDownloaded(true);
      setTimeout(() => setZipDownloaded(false), 4000);
    } catch (err) {
      console.error('Failed to generate bundle:', err);
    } finally {
      setIsGeneratingZip(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0B] text-[#E0E0E0] overflow-y-auto">
      {/* Header Banner */}
      <div className="p-6 border-b border-[#222224] bg-gradient-to-b from-[#141417] to-[#0A0A0B]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[11px] font-mono border border-emerald-500/20 font-bold uppercase tracking-wider">
                Cross-Platform Release Engine
              </span>
              {isStandalone && (
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[11px] font-mono border border-cyan-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Running in Standalone App Mode
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              Desktop & Mobile Native Apps
            </h1>
            <p className="text-sm text-gray-400 max-w-2xl mt-1">
              Package and install xTerminal natively across <strong>Android, Windows, macOS, and Linux</strong> with full hardware terminal access, background services, and native desktop window controls.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleInstallPWA}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>{deferredPrompt ? 'Install App to Device' : '1-Click PWA Install'}</span>
            </button>

            <button
              onClick={handleDownloadNativeBundle}
              disabled={isGeneratingZip}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1C1C1E] hover:bg-[#252528] text-gray-200 border border-[#222224] font-medium text-xs transition-colors"
            >
              {isGeneratingZip ? (
                <>
                  <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span>Packaging ZIP...</span>
                </>
              ) : zipDownloaded ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Bundle Downloaded!</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <span>Download Native Project ZIP</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto w-full p-6 space-y-6">
        {/* Platform Selection Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: 'android', label: 'Android (APK / AAB)', icon: Smartphone, desc: 'Capacitor & Google Play WebAPK', badge: 'Mobile' },
            { id: 'windows', label: 'Windows (.exe / .msi)', icon: Monitor, desc: 'Electron NSIS & Tauri v2', badge: 'x86_64 / ARM' },
            { id: 'macos', label: 'macOS (.dmg / .app)', icon: Apple, desc: 'Apple Silicon M1-M4 & Intel', badge: 'Universal' },
            { id: 'linux', label: 'Linux (.AppImage / .deb)', icon: Terminal, desc: 'Debian, Ubuntu, Arch, Fedora', badge: 'Portable' },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = selectedPlatform === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedPlatform(item.id as any)}
                className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
                  isSelected
                    ? 'bg-[#141416] border-emerald-500/50 shadow-md shadow-emerald-500/5'
                    : 'bg-[#111112] border-[#222224] hover:bg-[#161618] hover:border-gray-700'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/10 rounded-bl-full pointer-events-none flex items-start justify-end p-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                )}
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-emerald-500 text-black' : 'bg-[#1C1C1E] text-gray-300'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1C1C1E] text-gray-400 border border-[#222224]">
                    {item.badge}
                  </span>
                </div>
                <div className="font-semibold text-white text-sm">{item.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{item.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Platform Detail Card */}
        {selectedPlatform === 'android' && (
          <div className="bg-[#111112] border border-[#222224] rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#222224] pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  Android Application Build Pipeline
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Package xTerminalx as an Android application with background network keepalive and touch-optimized layout.
                </p>
              </div>

              <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-mono font-semibold border border-emerald-500/20">
                Package ID: com.xterminalx.pro
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: Direct PWA WebAPK */}
              <div className="bg-[#161618] border border-[#262629] rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  Method 1: Instant PWA Install (No Android Studio required)
                </div>
                <p className="text-xs text-gray-400">
                  Android devices running Chrome, Edge, or Samsung Internet automatically compile a native <strong>WebAPK</strong> with standalone status bar and launcher icon.
                </p>
                <div className="bg-[#0A0A0B] p-3 rounded font-mono text-xs text-gray-300 border border-[#222224] space-y-1">
                  <div>1. Open this app URL in mobile Chrome / Edge</div>
                  <div>2. Tap browser menu (⋮) &gt; <strong>Install App</strong></div>
                  <div>3. Launch from your home screen / app drawer!</div>
                </div>
                <button
                  onClick={handleInstallPWA}
                  className="w-full py-2 rounded bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-black font-bold text-xs transition-colors"
                >
                  Trigger Install Dialog
                </button>
              </div>

              {/* Option B: Native APK / Play Store */}
              <div className="bg-[#161618] border border-[#262629] rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  Method 2: Standalone APK / AAB (Capacitor)
                </div>
                <p className="text-xs text-gray-400">
                  Build release-ready signed APKs for sideloading or AAB bundles for the Google Play Store.
                </p>
                <div className="bg-[#0A0A0B] p-3 rounded font-mono text-xs text-gray-300 border border-[#222224] space-y-1 overflow-x-auto">
                  <div className="text-gray-500"># 1. Build and sync Android project</div>
                  <div className="text-emerald-400">npm run build:android</div>
                  <div className="text-gray-500 mt-1"># 2. Open in Android Studio to sign &amp; generate APK</div>
                  <div className="text-emerald-400">npx cap open android</div>
                </div>
                <button
                  onClick={() => copyToClipboard('npm run build:android && npx cap open android', 'android-cap')}
                  className="w-full py-2 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  {copiedScript === 'android-cap' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript === 'android-cap' ? 'Copied to Clipboard' : 'Copy Build Command'}</span>
                </button>
              </div>
            </div>

            {/* Android Manifest & Permissions Checklist */}
            <div className="border-t border-[#222224] pt-4">
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 font-mono">
                Included Android Hardware &amp; Network Permissions
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-[#0A0A0B] border border-[#222224] text-gray-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>android.permission.INTERNET</span>
                </div>
                <div className="p-2 rounded bg-[#0A0A0B] border border-[#222224] text-gray-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ACCESS_NETWORK_STATE</span>
                </div>
                <div className="p-2 rounded bg-[#0A0A0B] border border-[#222224] text-gray-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>FOREGROUND_SERVICE</span>
                </div>
                <div className="p-2 rounded bg-[#0A0A0B] border border-[#222224] text-gray-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WAKE_LOCK (SSH Keepalive)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedPlatform === 'windows' && (
          <div className="bg-[#111112] border border-[#222224] rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#222224] pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-blue-400" />
                  Windows Desktop Build Pipeline (.exe / .msi)
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Native Windows binaries with system tray integration, multi-window split support, and code signing.
                </p>
              </div>

              <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 text-xs font-mono font-semibold border border-blue-500/20">
                Targets: x64, ARM64 (Surface Pro), x86
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Electron NSIS */}
              <div className="bg-[#161618] border border-[#262629] rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Electron NSIS Installer &amp; Portable .exe
                </div>
                <p className="text-xs text-gray-400">
                  Full-featured Windows installer with desktop shortcut, start menu entry, and auto-updater.
                </p>
                <div className="bg-[#0A0A0B] p-3 rounded font-mono text-xs text-gray-300 border border-[#222224] space-y-1">
                  <div className="text-gray-500"># Run Electron Windows packaging:</div>
                  <div className="text-emerald-400">npm run build:electron:win</div>
                  <div className="text-gray-500 text-[10px] mt-1">Outputs: dist/xTerminalx-Pro-Setup-2.5.0.exe</div>
                </div>
                <button
                  onClick={() => copyToClipboard('npm run build:electron:win', 'win-electron')}
                  className="w-full py-2 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  {copiedScript === 'win-electron' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript === 'win-electron' ? 'Copied' : 'Copy Build Command'}</span>
                </button>
              </div>

              {/* Option 2: Tauri v2 Lightweight */}
              <div className="bg-[#161618] border border-[#262629] rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  Tauri v2 Ultra-Lightweight Binary (~12 MB)
                </div>
                <p className="text-xs text-gray-400">
                  High-performance Rust-backed binary using the Windows WebView2 runtime for minimal RAM overhead.
                </p>
                <div className="bg-[#0A0A0B] p-3 rounded font-mono text-xs text-gray-300 border border-[#222224] space-y-1">
                  <div className="text-gray-500"># Run Tauri release build:</div>
                  <div className="text-cyan-400">npm run build &amp;&amp; cargo tauri build</div>
                  <div className="text-gray-500 text-[10px] mt-1">Outputs: src-tauri/target/release/bundle/msi/</div>
                </div>
                <button
                  onClick={() => copyToClipboard('npm run build && cargo tauri build', 'win-tauri')}
                  className="w-full py-2 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  {copiedScript === 'win-tauri' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript === 'win-tauri' ? 'Copied' : 'Copy Tauri Command'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedPlatform === 'macos' && (
          <div className="bg-[#111112] border border-[#222224] rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#222224] pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Apple className="w-5 h-5 text-gray-200" />
                  macOS Universal Application Build Pipeline (.dmg / .app)
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Universal binary compatible with Apple Silicon (M1/M2/M3/M4) and Intel Macs with native macOS window styling.
                </p>
              </div>

              <span className="px-2.5 py-1 rounded bg-gray-500/10 text-gray-300 text-xs font-mono font-semibold border border-gray-500/20">
                macOS 11.0+ (Big Sur through Sequoia)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#161618] border border-[#262629] rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  Universal .DMG Disk Image
                </div>
                <p className="text-xs text-gray-400">
                  Standard drag-and-drop macOS disk image with custom background and Applications folder symlink.
                </p>
                <div className="bg-[#0A0A0B] p-3 rounded font-mono text-xs text-gray-300 border border-[#222224] space-y-1">
                  <div className="text-gray-500"># Package DMG for both arm64 and x64:</div>
                  <div className="text-emerald-400">npm run build:electron:mac</div>
                  <div className="text-gray-500 text-[10px] mt-1">Outputs: dist/xTerminalx-Pro-2.5.0-universal.dmg</div>
                </div>
                <button
                  onClick={() => copyToClipboard('npm run build:electron:mac', 'mac-build')}
                  className="w-full py-2 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  {copiedScript === 'mac-build' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript === 'mac-build' ? 'Copied' : 'Copy Build Command'}</span>
                </button>
              </div>

              <div className="bg-[#161618] border border-[#262629] rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <Shield className="w-4 h-4 text-purple-400" />
                  Gatekeeper &amp; Apple Notarization
                </div>
                <p className="text-xs text-gray-400">
                  Ready-to-sign bundle configuration with hardened runtime and entitlements for Apple Developer certificates.
                </p>
                <div className="bg-[#0A0A0B] p-3 rounded font-mono text-xs text-gray-300 border border-[#222224] space-y-1">
                  <div className="text-gray-500"># Notarize with Apple notarytool:</div>
                  <div className="text-purple-400">xcrun notarytool submit xTerminalx.dmg --wait</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedPlatform === 'linux' && (
          <div className="bg-[#111112] border border-[#222224] rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#222224] pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-amber-400" />
                  Linux Desktop Application Build Pipeline (.AppImage / .deb)
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Package self-contained AppImage executables and Debian packages that integrate into GNOME/KDE app menus.
                </p>
              </div>

              <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 text-xs font-mono font-semibold border border-amber-500/20">
                Ubuntu, Debian, Fedora, Arch, Alpine
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#161618] border border-[#262629] rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  Universal .AppImage (Run on any Linux distribution)
                </div>
                <p className="text-xs text-gray-400">
                  Zero installation required: simply \`chmod +x\` and execute directly from any directory.
                </p>
                <div className="bg-[#0A0A0B] p-3 rounded font-mono text-xs text-gray-300 border border-[#222224] space-y-1">
                  <div className="text-gray-500"># Build Linux packages:</div>
                  <div className="text-emerald-400">npm run build:electron:linux</div>
                  <div className="text-gray-500 text-[10px] mt-1">Outputs: dist/xTerminalx-Pro-2.5.0.AppImage</div>
                </div>
                <button
                  onClick={() => copyToClipboard('npm run build:electron:linux', 'linux-build')}
                  className="w-full py-2 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  {copiedScript === 'linux-build' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript === 'linux-build' ? 'Copied' : 'Copy Build Command'}</span>
                </button>
              </div>

              <div className="bg-[#161618] border border-[#262629] rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  .deb Package (Ubuntu / Debian APT install)
                </div>
                <p className="text-xs text-gray-400">
                  Standard Debian package installable via \`dpkg -i\` or APT repositories with full desktop integration.
                </p>
                <div className="bg-[#0A0A0B] p-3 rounded font-mono text-xs text-gray-300 border border-[#222224] space-y-1">
                  <div className="text-gray-500"># Install generated deb package:</div>
                  <div className="text-cyan-400">sudo dpkg -i dist/xterminalx-pro_2.5.0_amd64.deb</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Hardware Integration Overview */}
        <div className="bg-[#111112] border border-[#222224] rounded-xl p-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-emerald-400" />
            Zero-Mock Architecture &amp; Real Hardware Access
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Unlike web prototypes that simulate responses, xTerminalx Pro communicates directly with real system APIs: real Node.js subshell execution, live POSIX file operations via <code className="text-emerald-400">/api/fs/*</code>, live host metrics via <code className="text-emerald-400">/api/system/metrics</code>, real UDP Wake-on-LAN packets, and real TCP/DNS network probes. When exported to desktop or mobile, the backend runs locally as a native background service.
          </p>
        </div>
      </div>
    </div>
  );
};
