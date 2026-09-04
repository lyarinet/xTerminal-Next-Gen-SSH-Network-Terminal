import React, { useState, useRef } from 'react';
import {
  Settings,
  Terminal,
  Shield,
  Palette,
  HardDrive,
  Download,
  Upload,
  RotateCcw,
  Check,
  Save,
  Sliders,
  Bell,
  Lock,
  Cpu,
  Clock,
  Eye,
  Volume2,
  Smartphone,
  Globe,
  Activity
} from 'lucide-react';
import { TerminalSettings, VaultSettings } from '../types';

interface SettingsViewProps {
  settings: TerminalSettings;
  vaultSettings: VaultSettings;
  onUpdateSettings: (newSettings: TerminalSettings) => void;
  onUpdateVaultSettings: (newVaultSettings: VaultSettings) => void;
  onResetDefaults: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  vaultSettings,
  onUpdateSettings,
  onUpdateVaultSettings,
  onResetDefaults,
}) => {
  const [localSettings, setLocalSettings] = useState<TerminalSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Network / Connection defaults
  const [sshKeepalive, setSshKeepalive] = useState<number>(60);
  const [sshTimeout, setSshTimeout] = useState<number>(15);
  const [enableCompression, setEnableCompression] = useState<boolean>(true);
  const [safePastePrompt, setSafePastePrompt] = useState<boolean>(true);
  const [audioBell, setAudioBell] = useState<boolean>(false);
  const [hapticFeedback, setHapticFeedback] = useState<boolean>(true);

  const [serialBaud, setSerialBaud] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nexusterm_serial_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.customBaudRate) return parsed.customBaudRate;
      }
    } catch {}
    return 115200;
  });
  const [serialCharDelay, setSerialCharDelay] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nexusterm_serial_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.charDelayMs === 'number') return parsed.charDelayMs;
      }
    } catch {}
    return 0;
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(localSettings);

    try {
      const existing = localStorage.getItem('nexusterm_serial_settings');
      const parsed = existing ? JSON.parse(existing) : {};
      localStorage.setItem(
        'nexusterm_serial_settings',
        JSON.stringify({
          ...parsed,
          customBaudRate: serialBaud,
          charDelayMs: serialCharDelay,
        })
      );
    } catch {}

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleExportBackup = () => {
    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      settings: localSettings,
      vault: {
        autoLockMinutes: vaultSettings.autoLockMinutes,
        biometricsEnabled: vaultSettings.biometricsEnabled,
      },
      connectionDefaults: {
        sshKeepalive,
        sshTimeout,
        enableCompression,
        safePastePrompt,
        audioBell,
        hapticFeedback,
      },
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `xterminalx-settings-backup-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.settings) {
          setLocalSettings(data.settings);
          onUpdateSettings(data.settings);
        }
        if (data.vault) {
          onUpdateVaultSettings({ ...vaultSettings, ...data.vault });
        }
        if (data.connectionDefaults) {
          if (typeof data.connectionDefaults.sshKeepalive === 'number') setSshKeepalive(data.connectionDefaults.sshKeepalive);
          if (typeof data.connectionDefaults.sshTimeout === 'number') setSshTimeout(data.connectionDefaults.sshTimeout);
          if (typeof data.connectionDefaults.enableCompression === 'boolean') setEnableCompression(data.connectionDefaults.enableCompression);
        }
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      } catch (err) {
        alert('Invalid settings configuration file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0A0A0B] text-[#E0E0E0] p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Workstation Settings</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              PREFERENCES
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Configure terminal typography, color schemes, command risk thresholds, and keystore security policies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-200 text-xs font-medium transition-colors flex items-center gap-1.5 border border-[#222224]"
            title="Import configuration JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-3.5 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-200 text-xs font-medium transition-colors flex items-center gap-1.5 border border-[#222224]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Backup</span>
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedSuccess ? 'Settings Saved' : 'Apply Preferences'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        {/* Terminal Appearance */}
        <div className="bg-[#111112] border border-[#222224] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-white text-sm">
            <Palette className="w-4 h-4 text-emerald-400" />
            <span>Terminal Display &amp; Typography</span>
          </div>

          <div>
            <label className="block text-gray-400 font-medium mb-1">Color Theme</label>
            <select
              value={localSettings.theme}
              onChange={(e) => setLocalSettings({ ...localSettings, theme: e.target.value as any })}
              className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="one-dark">One Dark Pro (Default)</option>
              <option value="dracula">Dracula Official</option>
              <option value="tokyo-night">Tokyo Night Storm</option>
              <option value="monokai">Monokai Pro</option>
              <option value="nord">Nord Arctic</option>
              <option value="solarized-dark">Solarized Dark</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 font-medium mb-1">Font Family</label>
              <select
                value={localSettings.fontFamily}
                onChange={(e) => setLocalSettings({ ...localSettings, fontFamily: e.target.value })}
                className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 focus:outline-hidden focus:border-emerald-500 font-mono"
              >
                <option value="JetBrains Mono, monospace">JetBrains Mono</option>
                <option value="Fira Code, monospace">Fira Code</option>
                <option value="MesloLGS NF, monospace">MesloLGS NF</option>
                <option value="ui-monospace, monospace">System Monospace</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 font-medium mb-1">Font Size ({localSettings.fontSize}px)</label>
              <input
                type="range"
                min={11}
                max={20}
                step={1}
                value={localSettings.fontSize}
                onChange={(e) => setLocalSettings({ ...localSettings, fontSize: Number(e.target.value) })}
                className="w-full accent-emerald-500 mt-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 font-medium mb-1">Cursor Style</label>
              <select
                value={localSettings.cursorStyle}
                onChange={(e) => setLocalSettings({ ...localSettings, cursorStyle: e.target.value as any })}
                className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="block">Solid Block (█)</option>
                <option value="underline">Underline (_)</option>
                <option value="bar">Vertical Bar (|)</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 font-medium mb-1">Scrollback Buffer</label>
              <select
                value={localSettings.scrollbackLines}
                onChange={(e) => setLocalSettings({ ...localSettings, scrollbackLines: Number(e.target.value) })}
                className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 focus:outline-hidden focus:border-emerald-500 font-mono"
              >
                <option value={1000}>1,000 lines</option>
                <option value={5000}>5,000 lines (Recommended)</option>
                <option value={10000}>10,000 lines</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="cursorBlink"
              checked={localSettings.cursorBlink}
              onChange={(e) => setLocalSettings({ ...localSettings, cursorBlink: e.target.checked })}
              className="rounded bg-[#1C1C1E] border-[#222224] text-emerald-500 focus:ring-0 accent-emerald-500"
            />
            <label htmlFor="cursorBlink" className="text-gray-300">
              Enable animated blinking cursor
            </label>
          </div>

          {/* Live Preview Box */}
          <div className="mt-3 p-3 bg-[#0A0A0B] rounded-lg border border-[#222224]">
            <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
              <span className="flex items-center gap-1 font-mono">
                <Eye className="w-3 h-3 text-emerald-400" />
                Live Terminal Preview
              </span>
              <span className="font-mono text-[10px] text-emerald-400">{localSettings.theme}</span>
            </div>
            <div
              className="p-2.5 rounded bg-black/70 border border-[#1f1f23] text-emerald-400 select-none overflow-hidden"
              style={{
                fontFamily: localSettings.fontFamily,
                fontSize: `${localSettings.fontSize}px`,
              }}
            >
              <div className="text-gray-400">admin@xterminalx:~$ <span className="text-white">uname -a &amp;&amp; uptime</span></div>
              <div className="text-cyan-400">Linux core-node-1 6.8.0-generic #42 SMP x86_64</div>
              <div className="text-gray-300"> 14:02:19 up 42 days, 3 users, load average: 0.12, 0.08, 0.05</div>
              <div className="flex items-center text-gray-400">
                admin@xterminalx:~$
                <span className={`inline-block ml-1 text-emerald-400 ${localSettings.cursorBlink ? 'animate-pulse' : ''}`}>
                  {localSettings.cursorStyle === 'block' ? '█' : localSettings.cursorStyle === 'underline' ? '_' : '|'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SSH Connection & Protocol Defaults */}
        <div className="bg-[#111112] border border-[#222224] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-white text-sm">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>Connection &amp; Protocol Defaults</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 font-medium mb-1">ServerAliveInterval (sec)</label>
              <input
                type="number"
                min="10"
                max="300"
                value={sshKeepalive}
                onChange={(e) => setSshKeepalive(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 font-mono text-xs focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 font-medium mb-1">Connect Timeout (sec)</label>
              <input
                type="number"
                min="5"
                max="60"
                value={sshTimeout}
                onChange={(e) => setSshTimeout(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 font-mono text-xs focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1C1C1E] border border-[#222224]">
              <div>
                <div className="font-medium text-gray-200">Enable Zlib Compression</div>
                <div className="text-[11px] text-gray-400">Reduces bandwidth on slow WAN connections.</div>
              </div>
              <input
                type="checkbox"
                checked={enableCompression}
                onChange={(e) => setEnableCompression(e.target.checked)}
                className="rounded bg-[#0A0A0B] border-[#222224] text-emerald-500 focus:ring-0 shrink-0 accent-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1C1C1E] border border-[#222224]">
              <div>
                <div className="font-medium text-gray-200">Safe Multi-Line Paste Warning</div>
                <div className="text-[11px] text-gray-400">Prompt before pasting multiple lines into active shells.</div>
              </div>
              <input
                type="checkbox"
                checked={safePastePrompt}
                onChange={(e) => setSafePastePrompt(e.target.checked)}
                className="rounded bg-[#0A0A0B] border-[#222224] text-emerald-500 focus:ring-0 shrink-0 accent-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1C1C1E] border border-[#222224]">
              <div>
                <div className="font-medium text-gray-200">Mobile Haptic Key Feedback</div>
                <div className="text-[11px] text-gray-400">Vibrate on keypress for Android &amp; touch screens.</div>
              </div>
              <input
                type="checkbox"
                checked={hapticFeedback}
                onChange={(e) => setHapticFeedback(e.target.checked)}
                className="rounded bg-[#0A0A0B] border-[#222224] text-emerald-500 focus:ring-0 shrink-0 accent-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Security & Safety Engine Policies */}
        <div className="bg-[#111112] border border-[#222224] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-white text-sm">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Command Safety Engine Policies</span>
          </div>

          <p className="text-gray-400 text-xs">
            NexusTerm actively inspects terminal inputs against a verified regex safety matrix to prevent destructive commands from firing without authorization.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#1C1C1E] border border-[#222224]">
              <div>
                <div className="font-medium text-gray-200">Typed Confirmation for CRITICAL Commands</div>
                <div className="text-[11px] text-gray-400">
                  Requires user to type "CONFIRM" before executing commands like <code>rm -rf /</code>, <code>mkfs</code>, or database drops.
                </div>
              </div>
              <input
                type="checkbox"
                defaultChecked={true}
                className="rounded bg-[#0A0A0B] border-[#222224] text-emerald-500 focus:ring-0 shrink-0 accent-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#1C1C1E] border border-[#222224]">
              <div>
                <div className="font-medium text-gray-200">Strict Host Key Signature Verification</div>
                <div className="text-[11px] text-gray-400">
                  Immediately halt connections if a recorded server fingerprint fails to match (Man-in-the-Middle protection).
                </div>
              </div>
              <input
                type="checkbox"
                defaultChecked={true}
                className="rounded bg-[#0A0A0B] border-[#222224] text-emerald-500 focus:ring-0 shrink-0 accent-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#1C1C1E] border border-[#222224]">
              <div>
                <div className="font-medium text-gray-200">Vault Auto-Lock Duration</div>
                <div className="text-[11px] text-gray-400">
                  Purge derived AES-GCM session keys from browser memory after period of inactivity.
                </div>
              </div>
              <select
                value={vaultSettings.autoLockMinutes}
                onChange={(e) =>
                  onUpdateVaultSettings({ ...vaultSettings, autoLockMinutes: Number(e.target.value) })
                }
                className="px-2.5 py-1 rounded-md bg-[#0A0A0B] border border-[#222224] text-gray-200 text-xs shrink-0 focus:outline-hidden focus:border-emerald-500"
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>
          </div>
        </div>

        {/* AI Copilot & Infrastructure Assistant */}
        <div className="bg-[#111112] border border-[#222224] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-white text-sm">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>AI Copilot &amp; Gemini Engine</span>
          </div>

          <p className="text-gray-400 text-xs">
            Assists with shell scripting, Docker containers, Kubernetes diagnostics, and complex regex command debugging.
          </p>

          <div className="space-y-2">
            <div className="text-[11px] text-gray-400 font-mono">
              Model Endpoint: <span className="text-emerald-400">gemini-2.5-flash (Server-Side Proxy)</span>
            </div>
            <div className="text-[11px] text-gray-400 font-mono">
              Safety Guard: <span className="text-emerald-400">Active (Output analyzed by regex safety engine)</span>
            </div>
          </div>
        </div>

        {/* Serial TTY Console & Hardware Defaults */}
        <div className="bg-[#111112] border border-[#222224] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-white text-sm">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>Serial TTY &amp; Microcontroller Console</span>
          </div>

          <p className="text-gray-400 text-xs">
            Configure default Web Serial baud rate, character pacing intervals, and hardware TTY flow control.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 font-medium mb-1">Default Baud Rate</label>
              <select
                value={serialBaud}
                onChange={(e) => setSerialBaud(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 font-mono text-xs focus:outline-hidden focus:border-emerald-500"
              >
                <option value={9600}>9600 bps (Cisco / Legacy)</option>
                <option value={19200}>19200 bps (Modbus)</option>
                <option value={38400}>38400 bps</option>
                <option value={57600}>57600 bps</option>
                <option value={74880}>74880 bps (ESP Bootloader)</option>
                <option value={115200}>115200 bps (Standard ESP32/ARM)</option>
                <option value={230400}>230400 bps</option>
                <option value={250000}>250000 bps (3D Printer / Marlin)</option>
                <option value={460800}>460800 bps</option>
                <option value={921600}>921600 bps</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 font-medium mb-1">Character Pacing Delay (ms)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={serialCharDelay}
                  onChange={(e) => setSerialCharDelay(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 font-mono text-xs focus:outline-hidden focus:border-emerald-500"
                />
                <span className="text-gray-500 font-mono text-[11px] shrink-0">ms</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-gray-400">
            For advanced settings (font geometry, ANSI palette, macro triggers, line endings), open the{' '}
            <span className="text-emerald-400 font-semibold">Settings (Alt+S)</span> dialog inside the Serial TTY Console.
          </div>
        </div>

        {/* Reset / Maintenance */}
        <div className="bg-[#111112] border border-[#222224] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-white text-sm">
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>Reset &amp; Maintenance</span>
          </div>

          <p className="text-gray-400 text-xs">
            Reset terminal settings to default workstation specifications if needed.
          </p>

          <button
            type="button"
            onClick={onResetDefaults}
            className="px-3.5 py-1.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-medium transition-colors"
          >
            Reset Settings to Defaults
          </button>
        </div>
      </form>
    </div>
  );
};
