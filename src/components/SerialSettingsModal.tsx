import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Terminal,
  Cpu,
  Clock,
  Zap,
  RotateCcw,
  Check,
  Plus,
  Trash2,
  Sparkles,
  Download,
  Upload,
  Radio,
  SlidersHorizontal,
  Bell,
  Eye,
  Layers,
  Palette,
  Globe,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { SerialPortConfig } from '../types';

export interface SerialTerminalSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;
  theme: string;
  scrollbackLines: number;
  bellStyle: 'none' | 'visual' | 'sound';
  convertEol: boolean;
  smoothScroll: boolean;
  charDelayMs: number;
  lineDelayMs: number;
  localEcho: boolean;
  showTimestamps: boolean;
  autoReconnect: boolean;
  invertSignals: boolean;
  defaultLineEnding: 'crlf' | 'lf' | 'cr' | 'none';
  defaultInputFormat: 'ascii' | 'hex';
  macros: Array<{ id: string; label: string; cmd: string; description?: string }>;
}

export const DEFAULT_SERIAL_SETTINGS: SerialTerminalSettings = {
  fontFamily: '"Fira Code", Menlo, Monaco, "Courier New", monospace',
  fontSize: 13,
  lineHeight: 1.35,
  cursorStyle: 'block',
  cursorBlink: true,
  theme: 'nexus',
  scrollbackLines: 5000,
  bellStyle: 'visual',
  convertEol: true,
  smoothScroll: true,
  charDelayMs: 0,
  lineDelayMs: 0,
  localEcho: true,
  showTimestamps: false,
  autoReconnect: false,
  invertSignals: false,
  defaultLineEnding: 'crlf',
  defaultInputFormat: 'ascii',
  macros: [
    { id: 'm1', label: 'AT', cmd: 'AT', description: 'Modem AT handshake' },
    { id: 'm2', label: 'AT+GMR', cmd: 'AT+GMR', description: 'Firmware version' },
    { id: 'm3', label: 'STATUS', cmd: 'STATUS', description: 'Device sensor status' },
    { id: 'm4', label: 'GPIO READ', cmd: 'GPIO READ', description: 'Inspect IO voltages' },
    { id: 'm5', label: 'WIFI SCAN', cmd: 'WIFI SCAN', description: 'Scan 2.4/5GHz APs' },
    { id: 'm6', label: 'I2C SCAN', cmd: 'I2C SCAN', description: 'Scan 7-bit I2C bus' },
    { id: 'm7', label: 'REBOOT', cmd: 'REBOOT', description: 'Hardware soft reboot' },
    { id: 'm8', label: 'CLEAR', cmd: 'CLEAR', description: 'Clear terminal screen' },
  ],
};

export const SERIAL_PRESETS = [
  {
    id: 'esp32',
    name: 'ESP32 / ESP8266 DevKit',
    badge: '115200 8N1',
    description: 'Espressif SoC FreeRTOS bootloader & debugging. Auto-reset with DTR/RTS pulses.',
    baudRate: 115200,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: 'none',
    dtr: true,
    rts: false,
    localEcho: true,
    lineEnding: 'crlf',
    charDelayMs: 0,
    lineDelayMs: 5,
    theme: 'nexus',
  },
  {
    id: 'cisco',
    name: 'Cisco / Juniper Console',
    badge: '9600 8N1',
    description: 'RJ45 to DB9 rollover serial cable for managed switches, routers, and firewalls.',
    baudRate: 9600,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: 'hardware',
    dtr: true,
    rts: true,
    localEcho: false,
    lineEnding: 'cr',
    charDelayMs: 5,
    lineDelayMs: 50,
    theme: 'amberCRT',
  },
  {
    id: 'printer3d',
    name: '3D Printer (Marlin RepRap)',
    badge: '250000 8N1',
    description: 'High-speed G-Code serial streaming controller for Ender, Voron, and Prusa boards.',
    baudRate: 250000,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: 'none',
    dtr: false,
    rts: false,
    localEcho: false,
    lineEnding: 'crlf',
    charDelayMs: 2,
    lineDelayMs: 20,
    theme: 'monokai',
  },
  {
    id: 'rpi',
    name: 'Raspberry Pi Mini UART',
    badge: '115200 8N1',
    description: 'Linux kernel serial console attached to GPIO pins 14 (TXD) and 15 (RXD).',
    baudRate: 115200,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: 'none',
    dtr: false,
    rts: false,
    localEcho: false,
    lineEnding: 'lf',
    charDelayMs: 0,
    lineDelayMs: 0,
    theme: 'greenPhosphor',
  },
  {
    id: 'gps',
    name: 'GPS NMEA 0183 Receiver',
    badge: '9600 8N1',
    description: 'Raw GPS/GLONASS tracking stream ($GPGGA, $GPRMC) with live timestamping.',
    baudRate: 9600,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: 'none',
    dtr: false,
    rts: false,
    localEcho: false,
    lineEnding: 'crlf',
    charDelayMs: 0,
    lineDelayMs: 0,
    theme: 'nexus',
  },
  {
    id: 'modbus',
    name: 'Industrial RS-485 Modbus RTU',
    badge: '19200 8E1',
    description: 'SCADA, PLC, and energy meter automation with Even Parity and 2 stop bits.',
    baudRate: 19200,
    dataBits: 8,
    parity: 'even',
    stopBits: 2,
    flowControl: 'none',
    dtr: false,
    rts: true,
    localEcho: false,
    lineEnding: 'none',
    charDelayMs: 10,
    lineDelayMs: 100,
    theme: 'dracula',
  },
];

interface SerialSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SerialTerminalSettings;
  config: SerialPortConfig;
  onSaveSettings: (newSettings: SerialTerminalSettings, newConfig?: Partial<SerialPortConfig>) => void;
  themes: Record<string, { name: string; background: string; foreground: string; cursor: string }>;
}

export const SerialSettingsModal: React.FC<SerialSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  config,
  onSaveSettings,
  themes,
}) => {
  const [activeTab, setActiveTab] = useState<'terminal' | 'timing' | 'presets' | 'macros' | 'remote' | 'backup'>('terminal');
  const [tempSettings, setTempSettings] = useState<SerialTerminalSettings>(settings);
  const [tempConfig, setTempConfig] = useState<SerialPortConfig>(config);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Remote Bridge Host IP state
  const [detectedIps, setDetectedIps] = useState<Array<{ iface: string; address: string }>>([]);
  const [assignedIp, setAssignedIp] = useState<string>(() => {
    return localStorage.getItem('nexusterm_serial_remote_ip') || '';
  });
  const [assignedPort, setAssignedPort] = useState<number>(() => {
    const saved = localStorage.getItem('nexusterm_serial_remote_port');
    return saved ? Number(saved) : 3000;
  });
  const [isDetectingIp, setIsDetectingIp] = useState(false);
  const [customIp, setCustomIp] = useState('');

  const handleDetectIps = () => {
    setIsDetectingIp(true);
    fetch('/api/system/network-info')
      .then((r) => r.json())
      .then((data) => {
        if (data.addresses) {
          setDetectedIps(data.addresses);
          if (!assignedIp) {
            const p = data.primaryIp || data.addresses[0]?.address || '127.0.0.1';
            setAssignedIp(p);
            localStorage.setItem('nexusterm_serial_remote_ip', p);
          }
        }
        if (data.port) {
          setAssignedPort(data.port);
          localStorage.setItem('nexusterm_serial_remote_port', String(data.port));
        }
      })
      .catch(() => {})
      .finally(() => setIsDetectingIp(false));
  };

  useEffect(() => {
    if (isOpen) {
      handleDetectIps();
    }
  }, [isOpen]);

  // New macro form
  const [newMacroLabel, setNewMacroLabel] = useState('');
  const [newMacroCmd, setNewMacroCmd] = useState('');
  const [newMacroDesc, setNewMacroDesc] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (assignedIp) {
      localStorage.setItem('nexusterm_serial_remote_ip', assignedIp);
      localStorage.setItem('nexusterm_serial_remote_port', String(assignedPort));
    }
    onSaveSettings(tempSettings, tempConfig);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 400);
  };

  const handleResetDefaults = () => {
    setTempSettings(DEFAULT_SERIAL_SETTINGS);
  };

  const handleApplyPreset = (preset: typeof SERIAL_PRESETS[0]) => {
    setTempConfig((prev) => ({
      ...prev,
      baudRate: preset.baudRate,
      dataBits: preset.dataBits as 7 | 8,
      parity: preset.parity as any,
      stopBits: preset.stopBits as 1 | 2,
      flowControl: preset.flowControl as any,
      dtr: preset.dtr,
      rts: preset.rts,
    }));

    setTempSettings((prev) => ({
      ...prev,
      localEcho: preset.localEcho,
      defaultLineEnding: preset.lineEnding as any,
      charDelayMs: preset.charDelayMs,
      lineDelayMs: preset.lineDelayMs,
      theme: preset.theme,
    }));
  };

  const handleAddMacro = () => {
    if (!newMacroLabel.trim() || !newMacroCmd.trim()) return;
    const newEntry = {
      id: `macro-${Date.now()}`,
      label: newMacroLabel.trim(),
      cmd: newMacroCmd.trim(),
      description: newMacroDesc.trim() || undefined,
    };
    setTempSettings((prev) => ({
      ...prev,
      macros: [...prev.macros, newEntry],
    }));
    setNewMacroLabel('');
    setNewMacroCmd('');
    setNewMacroDesc('');
  };

  const handleDeleteMacro = (id: string) => {
    setTempSettings((prev) => ({
      ...prev,
      macros: prev.macros.filter((m) => m.id !== id),
    }));
  };

  const handleExportJson = () => {
    const data = {
      version: '2.4.0',
      exportedAt: new Date().toISOString(),
      serialSettings: tempSettings,
      portConfig: tempConfig,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexusterm-serial-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl bg-[#111112] border border-[#222224] rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#222224] flex items-center justify-between bg-[#141416] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Serial TTY Console Settings</h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  xterm.js Engine
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Configure terminal emulation, character pacing, baud presets, and macro scripts.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#222224] rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-[#222224] bg-[#111112] shrink-0 overflow-x-auto">
          {[
            { id: 'terminal', label: 'Terminal & Font', icon: Terminal },
            { id: 'timing', label: 'Serial & Delays', icon: Clock },
            { id: 'presets', label: 'Hardware Presets', icon: Cpu },
            { id: 'macros', label: 'Quick Macros', icon: Zap },
            { id: 'remote', label: 'Remote IP Tunnel', icon: Globe },
            { id: 'backup', label: 'Backup & Reset', icon: Download },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: TERMINAL & FONT */}
          {activeTab === 'terminal' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Font Family */}
                <div>
                  <label className="text-xs font-medium text-gray-300 block mb-1.5">
                    Terminal Font Family
                  </label>
                  <select
                    value={tempSettings.fontFamily}
                    onChange={(e) => setTempSettings({ ...tempSettings, fontFamily: e.target.value })}
                    className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value='"Fira Code", Menlo, Monaco, "Courier New", monospace'>Fira Code (Ligatures)</option>
                    <option value='"JetBrains Mono", monospace'>JetBrains Mono</option>
                    <option value='Menlo, Monaco, "Courier New", monospace'>Menlo / Monaco</option>
                    <option value='"Source Code Pro", monospace'>Source Code Pro</option>
                    <option value='Consolas, "Courier New", monospace'>Consolas</option>
                    <option value='"Courier New", monospace'>Courier New (Vintage)</option>
                  </select>
                </div>

                {/* Theme Selector */}
                <div>
                  <label className="text-xs font-medium text-gray-300 block mb-1.5 flex items-center justify-between">
                    <span>Color Palette &amp; CRT Profile</span>
                    <span className="text-[10px] text-gray-500 font-mono">VT100 ANSI</span>
                  </label>
                  <select
                    value={tempSettings.theme}
                    onChange={(e) => setTempSettings({ ...tempSettings, theme: e.target.value })}
                    className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500"
                  >
                    {Object.entries(themes).map(([key, t]: [string, any]) => (
                      <option key={key} value={key}>
                        {t.name || key}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Font Size */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-300">Font Size</label>
                    <span className="text-xs font-mono text-emerald-400">{tempSettings.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="22"
                    step="1"
                    value={tempSettings.fontSize}
                    onChange={(e) => setTempSettings({ ...tempSettings, fontSize: Number(e.target.value) })}
                    className="w-full accent-emerald-500 h-1.5 bg-[#222224] rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
                    <span>10px (Compact)</span>
                    <span>14px</span>
                    <span>22px (Large)</span>
                  </div>
                </div>

                {/* Line Height */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-300">Line Spacing</label>
                    <span className="text-xs font-mono text-emerald-400">{tempSettings.lineHeight.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="1.8"
                    step="0.05"
                    value={tempSettings.lineHeight}
                    onChange={(e) => setTempSettings({ ...tempSettings, lineHeight: Number(e.target.value) })}
                    className="w-full accent-emerald-500 h-1.5 bg-[#222224] rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
                    <span>1.0 (Dense)</span>
                    <span>1.35 (Standard)</span>
                    <span>1.8 (Spacious)</span>
                  </div>
                </div>

                {/* Cursor Style */}
                <div>
                  <label className="text-xs font-medium text-gray-300 block mb-1.5">Cursor Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['block', 'underline', 'bar'] as const).map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setTempSettings({ ...tempSettings, cursorStyle: style })}
                        className={`px-3 py-2 rounded-md border text-xs font-mono capitalize transition-colors cursor-pointer ${
                          tempSettings.cursorStyle === style
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold'
                            : 'bg-[#1C1C1E] text-gray-400 border-[#222224] hover:text-white'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scrollback Lines */}
                <div>
                  <label className="text-xs font-medium text-gray-300 block mb-1.5">
                    Scrollback Buffer (Lines)
                  </label>
                  <select
                    value={tempSettings.scrollbackLines}
                    onChange={(e) => setTempSettings({ ...tempSettings, scrollbackLines: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value={1000}>1,000 lines (Fast)</option>
                    <option value={5000}>5,000 lines (Recommended)</option>
                    <option value={10000}>10,000 lines</option>
                    <option value={25000}>25,000 lines</option>
                    <option value={50000}>50,000 lines (Max)</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-[#222224]">
                <label className="flex items-center justify-between p-3 rounded-lg bg-[#18181A] border border-[#222224] cursor-pointer hover:border-gray-700">
                  <div>
                    <div className="text-xs font-medium text-white">Cursor Blinking</div>
                    <div className="text-[10px] text-gray-400">Pulsing cursor animation in idle states</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempSettings.cursorBlink}
                    onChange={(e) => setTempSettings({ ...tempSettings, cursorBlink: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg bg-[#18181A] border border-[#222224] cursor-pointer hover:border-gray-700">
                  <div>
                    <div className="text-xs font-medium text-white">Convert EOL (\n to \r\n)</div>
                    <div className="text-[10px] text-gray-400">Ensures correct newline carriage returns in RAW TTY</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempSettings.convertEol}
                    onChange={(e) => setTempSettings({ ...tempSettings, convertEol: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg bg-[#18181A] border border-[#222224] cursor-pointer hover:border-gray-700">
                  <div>
                    <div className="text-xs font-medium text-white">Visual Bell Alert</div>
                    <div className="text-[10px] text-gray-400">Screen border flashes on ASCII 0x07 (BEL)</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempSettings.bellStyle === 'visual'}
                    onChange={(e) =>
                      setTempSettings({
                        ...tempSettings,
                        bellStyle: e.target.checked ? 'visual' : 'none',
                      })
                    }
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg bg-[#18181A] border border-[#222224] cursor-pointer hover:border-gray-700">
                  <div>
                    <div className="text-xs font-medium text-white">Smooth Scrolling</div>
                    <div className="text-[10px] text-gray-400">Smooth kinetic scroll interpolation</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempSettings.smoothScroll}
                    onChange={(e) => setTempSettings({ ...tempSettings, smoothScroll: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                </label>
              </div>

              {/* Live Preview Box */}
              <div className="p-3 rounded-lg bg-[#0A0A0B] border border-[#222224] font-mono text-xs">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Eye className="w-3 h-3 text-emerald-400" />
                  <span>Live Font &amp; Theme Preview</span>
                </div>
                <div
                  style={{
                    fontFamily: tempSettings.fontFamily,
                    fontSize: `${tempSettings.fontSize}px`,
                    lineHeight: tempSettings.lineHeight,
                    color: themes[tempSettings.theme]?.foreground || '#E0E0E0',
                    backgroundColor: themes[tempSettings.theme]?.background || '#0A0A0B',
                  }}
                  className="p-3 rounded border border-gray-800 transition-all"
                >
                  <div><span className="text-emerald-400 font-bold">{"esp32-s3:/>"}</span> system --info</div>
                  <div className="text-gray-400">UART 115200 8N1 | Core Temp: 36.4°C | Uptime: 1429s</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-emerald-400">{"esp32-s3:/>"}</span>
                    <span className="animate-pulse bg-emerald-400 text-black px-0.5">_</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SERIAL & DELAYS */}
          {activeTab === 'timing' && (
            <div className="space-y-5">
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-gray-300 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">Character &amp; Line Transmission Pacing:</span> Some
                  low-frequency microcontrollers (e.g. 8MHz ATmega, PIC, or bootROMs) drop characters if commands
                  are transmitted instantly. Setting a 2-10ms delay between characters prevents buffer overflows.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Character Delay */}
                <div className="p-3 rounded-lg bg-[#18181A] border border-[#222224]">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-white">Inter-Character Delay (ms)</label>
                    <span className="text-xs font-mono text-emerald-400">{tempSettings.charDelayMs} ms</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mb-2">Pause between each byte sent over UART</p>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={tempSettings.charDelayMs}
                    onChange={(e) => setTempSettings({ ...tempSettings, charDelayMs: Number(e.target.value) })}
                    className="w-full accent-emerald-500 h-1.5 bg-[#222224] rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
                    <span>0ms (Instant)</span>
                    <span>10ms (MCU Safe)</span>
                    <span>50ms</span>
                  </div>
                </div>

                {/* Line Delay */}
                <div className="p-3 rounded-lg bg-[#18181A] border border-[#222224]">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-white">Inter-Line Delay (ms)</label>
                    <span className="text-xs font-mono text-emerald-400">{tempSettings.lineDelayMs} ms</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mb-2">Pause between lines when pasting multi-line scripts</p>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="10"
                    value={tempSettings.lineDelayMs}
                    onChange={(e) => setTempSettings({ ...tempSettings, lineDelayMs: Number(e.target.value) })}
                    className="w-full accent-emerald-500 h-1.5 bg-[#222224] rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
                    <span>0ms</span>
                    <span>50ms</span>
                    <span>500ms (Pasted Scripts)</span>
                  </div>
                </div>

                {/* Default Line Ending */}
                <div>
                  <label className="text-xs font-medium text-gray-300 block mb-1.5">
                    Default Line Ending
                  </label>
                  <select
                    value={tempSettings.defaultLineEnding}
                    onChange={(e) => setTempSettings({ ...tempSettings, defaultLineEnding: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="crlf">CR+LF (\r\n) - Standard Windows &amp; AT</option>
                    <option value="lf">LF (\n) - Standard Linux &amp; Unix</option>
                    <option value="cr">CR (\r) - Classic Apple / Cisco</option>
                    <option value="none">No Ending - Raw Stream</option>
                  </select>
                </div>

                {/* Default Input Format */}
                <div>
                  <label className="text-xs font-medium text-gray-300 block mb-1.5">
                    Default Input Format
                  </label>
                  <select
                    value={tempSettings.defaultInputFormat}
                    onChange={(e) => setTempSettings({ ...tempSettings, defaultInputFormat: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="ascii">ASCII String Characters</option>
                    <option value="hex">HEX Byte Sequences (e.g. 41 54 0D 0A)</option>
                  </select>
                </div>
              </div>

              {/* Checkbox Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#222224]">
                <label className="flex items-center justify-between p-3 rounded-lg bg-[#18181A] border border-[#222224] cursor-pointer hover:border-gray-700">
                  <div>
                    <div className="text-xs font-medium text-white">Local Echo (Character feedback)</div>
                    <div className="text-[10px] text-gray-400">Echo typed characters back to the terminal screen</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempSettings.localEcho}
                    onChange={(e) => setTempSettings({ ...tempSettings, localEcho: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg bg-[#18181A] border border-[#222224] cursor-pointer hover:border-gray-700">
                  <div>
                    <div className="text-xs font-medium text-white">Show RX Timestamps</div>
                    <div className="text-[10px] text-gray-400">Prepend clock time [HH:MM:SS] to incoming frames</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempSettings.showTimestamps}
                    onChange={(e) => setTempSettings({ ...tempSettings, showTimestamps: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg bg-[#18181A] border border-[#222224] cursor-pointer hover:border-gray-700">
                  <div>
                    <div className="text-xs font-medium text-white">Auto-Reconnect on USB Glitch</div>
                    <div className="text-[10px] text-gray-400">Automatically re-open port if disconnected</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempSettings.autoReconnect}
                    onChange={(e) => setTempSettings({ ...tempSettings, autoReconnect: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg bg-[#18181A] border border-[#222224] cursor-pointer hover:border-gray-700">
                  <div>
                    <div className="text-xs font-medium text-white">Invert CTS/DSR Control Signals</div>
                    <div className="text-[10px] text-gray-400">Active-Low hardware handshake inversion</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempSettings.invertSignals}
                    onChange={(e) => setTempSettings({ ...tempSettings, invertSignals: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: HARDWARE PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="text-xs text-gray-400">
                Select an embedded architecture or hardware profile to load optimized baud rate, flow control,
                signals, and pacing parameters:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SERIAL_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-3.5 rounded-lg bg-[#18181A] border border-[#222224] hover:border-emerald-500/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="font-bold text-xs text-white flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{preset.name}</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mb-3">{preset.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-[#222224] text-[10px] font-mono text-gray-400">
                      <span>Flow: {preset.flowControl} | End: {preset.lineEnding}</span>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        Apply Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: QUICK MACROS */}
          {activeTab === 'macros' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">Custom Quick Action Macros</h3>
                  <p className="text-[11px] text-gray-400">
                    Pill buttons displayed below the terminal for single-click execution.
                  </p>
                </div>
              </div>

              {/* Add Macro Form */}
              <div className="p-3 rounded-lg bg-[#18181A] border border-[#222224] grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  placeholder="Button Label (e.g. GET TEMP)"
                  value={newMacroLabel}
                  onChange={(e) => setNewMacroLabel(e.target.value)}
                  className="px-2.5 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-white font-mono placeholder-gray-500 focus:outline-hidden focus:border-emerald-500"
                />
                <input
                  type="text"
                  placeholder="Command String (e.g. AT+TEMP?)"
                  value={newMacroCmd}
                  onChange={(e) => setNewMacroCmd(e.target.value)}
                  className="px-2.5 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-white font-mono placeholder-gray-500 focus:outline-hidden focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddMacro}
                  disabled={!newMacroLabel.trim() || !newMacroCmd.trim()}
                  className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Macro</span>
                </button>
              </div>

              {/* Macro Items List */}
              <div className="space-y-2">
                {tempSettings.macros.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-lg bg-[#18181A] border border-[#222224] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-[#111112] text-emerald-400 border border-[#222224] font-mono font-bold text-[11px]">
                        {m.label}
                      </span>
                      <span className="font-mono text-gray-300">{m.cmd}</span>
                      {m.description && <span className="text-gray-500 text-[10px]">({m.description})</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMacro(m.id)}
                      className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Delete Macro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: BACKUP & RESET */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#18181A] border border-[#222224] flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white mb-1">Export Settings JSON</h4>
                    <p className="text-[11px] text-gray-400 mb-3">
                      Save current baud configuration, delays, macros, and theme settings as a portable JSON file.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="px-3 py-2 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-200 border border-[#222224] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download JSON Backup</span>
                  </button>
                </div>

                <div className="p-4 rounded-lg bg-[#18181A] border border-[#222224] flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white mb-1">Factory Reset</h4>
                    <p className="text-[11px] text-gray-400 mb-3">
                      Revert all serial console options, font geometries, and macro scripts to defaults.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="px-3 py-2 rounded-md bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Restore Default Settings</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: REMOTE IP TUNNEL */}
          {activeTab === 'remote' && (
            <div className="space-y-5">
              <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs text-sky-200 flex items-start gap-2.5">
                <Globe className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">Remote Serial Bridge Host IP:</span> Select which PC network IP address should be used when generating shareable console URLs for remote clients on your LAN or VPN.
                </div>
              </div>

              {/* Assigned IP Card */}
              <div className="p-3.5 rounded-lg bg-[#18181A] border border-[#222224] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400">Assigned Remote Bridge URL</span>
                  <div className="text-xs font-mono font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>http://{assignedIp || '127.0.0.1'}:{assignedPort}/serial-bridge.html?...</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDetectIps}
                  disabled={isDetectingIp}
                  className="px-2.5 py-1.5 rounded bg-[#222226] hover:bg-[#2A2A30] text-sky-400 border border-sky-500/30 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isDetectingIp ? 'animate-spin' : ''}`} />
                  <span>{isDetectingIp ? 'Detecting...' : 'Get IP Detect'}</span>
                </button>
              </div>

              {/* Detected Interfaces */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-300">Available PC Network Interfaces:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {detectedIps.map((net) => {
                    const isSelected = assignedIp === net.address;
                    return (
                      <div
                        key={net.address}
                        onClick={() => {
                          setAssignedIp(net.address);
                          localStorage.setItem('nexusterm_serial_remote_ip', net.address);
                        }}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-sky-500/15 border-sky-500/50 text-white'
                            : 'bg-[#18181A] border-[#222224] text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-gray-200">{net.iface}</div>
                          <div className="font-mono text-sky-400 text-[11px]">{net.address}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${isSelected ? 'bg-emerald-500 text-black' : 'bg-[#252528] text-gray-400'}`}>
                          {isSelected ? 'Assigned' : 'Assign'}
                        </span>
                      </div>
                    );
                  })}
                  <div
                    onClick={() => {
                      setAssignedIp('127.0.0.1');
                      localStorage.setItem('nexusterm_serial_remote_ip', '127.0.0.1');
                    }}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                      assignedIp === '127.0.0.1'
                        ? 'bg-sky-500/15 border-sky-500/50 text-white'
                        : 'bg-[#18181A] border-[#222224] text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-gray-200">Localhost Loopback</div>
                      <div className="font-mono text-sky-400 text-[11px]">127.0.0.1</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${assignedIp === '127.0.0.1' ? 'bg-emerald-500 text-black' : 'bg-[#252528] text-gray-400'}`}>
                      {assignedIp === '127.0.0.1' ? 'Assigned' : 'Assign'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Custom Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Or enter custom IP / DDNS domain..."
                  value={customIp}
                  onChange={(e) => setCustomIp(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customIp.trim()) {
                      setAssignedIp(customIp.trim());
                      localStorage.setItem('nexusterm_serial_remote_ip', customIp.trim());
                      setCustomIp('');
                    }
                  }}
                  disabled={!customIp.trim()}
                  className="px-3 py-1.5 rounded-md bg-[#252528] hover:bg-emerald-500 hover:text-black disabled:opacity-40 text-xs font-semibold text-gray-200 transition-colors cursor-pointer"
                >
                  Assign Custom
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#222224] bg-[#141416] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Applied!</span>
                </>
              ) : (
                <span>Save &amp; Apply</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
