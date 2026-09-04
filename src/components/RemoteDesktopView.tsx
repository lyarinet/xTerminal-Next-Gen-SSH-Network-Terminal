import React, { useState, useRef, useEffect } from 'react';
import {
  Monitor,
  Maximize2,
  Minimize2,
  RefreshCw,
  Power,
  Copy,
  Keyboard,
  Settings,
  Shield,
  Wifi,
  MousePointer,
  Volume2,
  VolumeX,
  Camera,
  Play,
  Check,
  AlertTriangle,
  Radio,
  Server,
  Terminal,
  Grid
} from 'lucide-react';

interface RdpSession {
  id: string;
  name: string;
  protocol: 'RDP' | 'VNC' | 'WINBOX';
  host: string;
  port: number;
  user: string;
  os: 'windows' | 'linux' | 'mikrotik';
  resolution: string;
  fps: number;
  latencyMs: number;
  status: 'connected' | 'reconnecting' | 'disconnected';
}

export const RemoteDesktopView: React.FC = () => {
  const [sessions, setSessions] = useState<RdpSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [displayScale, setDisplayScale] = useState<'fit' | '100%' | '125%'>('fit');
  const [compressionQuality, setCompressionQuality] = useState<'lossless' | 'high' | 'low'>('high');
  const [clipboardToast, setClipboardToast] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeWindowsTab, setActiveWindowsTab] = useState<'desktop' | 'taskmgr' | 'powershell'>('desktop');
  const [winboxActiveMenu, setWinboxActiveMenu] = useState<'interfaces' | 'routes' | 'firewall' | 'system'>('interfaces');

  const containerRef = useRef<HTMLDivElement>(null);
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const triggerClipboardSync = () => {
    setClipboardToast('Remote clipboard synchronized with local workstation');
    setTimeout(() => setClipboardToast(null), 2500);
  };

  const sendCtrlAltDel = () => {
    setClipboardToast('Sent [Ctrl + Alt + Del] SAS signal to host');
    setTimeout(() => setClipboardToast(null), 2500);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    setMousePos({ x, y });
  };

  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#070709] text-gray-300">
        <div className="w-16 h-16 rounded-2xl bg-[#141416] border border-[#222224] flex items-center justify-center mb-4 shadow-xl">
          <Monitor className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">No Active Remote Desktop Sessions</h2>
        <p className="text-xs text-gray-400 text-center max-w-md mb-6 font-sans">
          No RDP, VNC, or MikroTik Winbox sessions are currently active. Launch a remote desktop session from your hosts inventory to start viewing.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex flex-col h-full bg-[#070709] text-gray-200 overflow-hidden select-none ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* Top Remote Desktop Toolbar */}
      <div className="h-12 border-b border-[#222224] bg-[#111112] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#1C1C1E] p-1 rounded-lg border border-[#222224]">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-semibold transition-all ${
                  activeSessionId === s.id
                    ? s.protocol === 'RDP'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : s.protocol === 'VNC'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>{s.name}</span>
                <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-black/40 font-mono">
                  {s.protocol}
                </span>
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3 text-xs font-mono text-gray-400 ml-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {activeSession.status.toUpperCase()}
            </span>
            <span>{activeSession.host}:{activeSession.port}</span>
            <span>{activeSession.latencyMs}ms</span>
            <span>{activeSession.fps} FPS</span>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={sendCtrlAltDel}
            title="Send Ctrl + Alt + Delete"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 hover:text-white border border-[#222224] text-xs font-mono transition-colors"
          >
            <Keyboard className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Ctrl+Alt+Del</span>
          </button>

          <button
            onClick={triggerClipboardSync}
            title="Sync Bidirectional Clipboard"
            className="p-1.5 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 hover:text-white border border-[#222224] transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-400" />
          </button>

          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            title={audioEnabled ? 'Mute Remote Audio' : 'Unmute Remote Audio'}
            className="p-1.5 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 hover:text-white border border-[#222224] transition-colors"
          >
            {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-gray-500" />}
          </button>

          <div className="h-4 w-px bg-[#222224] mx-1" />

          {/* Display Scale */}
          <select
            value={displayScale}
            onChange={(e: any) => setDisplayScale(e.target.value)}
            className="px-2 py-1 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-gray-300 font-mono focus:outline-hidden"
          >
            <option value="fit">Scale: Fit Window</option>
            <option value="100%">Scale: 100% 1:1</option>
            <option value="125%">Scale: 125% DPI</option>
          </select>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title="Toggle Fullscreen"
            className="p-1.5 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 hover:text-white border border-[#222224] transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Disconnect */}
          <button
            title="Terminate Remote Desktop Session"
            className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Toast notification */}
      {clipboardToast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-emerald-500 text-black font-semibold text-xs shadow-xl animate-in fade-in flex items-center gap-2">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{clipboardToast}</span>
        </div>
      )}

      {/* Desktop Canvas Display Canvas */}
      <div
        onMouseMove={handleMouseMove}
        className="flex-1 bg-black flex items-center justify-center p-2 relative overflow-hidden cursor-default"
      >
        {activeSession.os === 'windows' && (
          <div className="w-full h-full max-w-6xl max-h-[850px] bg-[#004275] rounded-lg shadow-2xl border border-blue-900/50 flex flex-col overflow-hidden relative font-sans select-none">
            {/* Windows Desktop Top Icons */}
            <div className="flex-1 p-6 grid grid-cols-1 gap-6 content-start w-32">
              <div className="flex flex-col items-center gap-1 p-2 rounded hover:bg-white/10 cursor-pointer group text-center">
                <div className="w-10 h-10 bg-blue-500/80 rounded flex items-center justify-center text-white shadow-md">
                  <Server className="w-6 h-6" />
                </div>
                <span className="text-[11px] text-white font-medium drop-shadow-md">This PC</span>
              </div>

              <div className="flex flex-col items-center gap-1 p-2 rounded hover:bg-white/10 cursor-pointer group text-center">
                <div className="w-10 h-10 bg-black/80 rounded border border-gray-600 flex items-center justify-center text-emerald-400 shadow-md">
                  <Terminal className="w-6 h-6" />
                </div>
                <span className="text-[11px] text-white font-medium drop-shadow-md">PowerShell</span>
              </div>

              <div className="flex flex-col items-center gap-1 p-2 rounded hover:bg-white/10 cursor-pointer group text-center">
                <div className="w-10 h-10 bg-emerald-600/90 rounded flex items-center justify-center text-white shadow-md">
                  <Grid className="w-6 h-6" />
                </div>
                <span className="text-[11px] text-white font-medium drop-shadow-md">Server Mgr</span>
              </div>
            </div>

            {/* Active Window inside Windows: Server Manager & Task Manager */}
            <div className="absolute top-10 left-36 right-16 bottom-16 bg-[#18181b] border border-gray-700 rounded-lg shadow-2xl flex flex-col overflow-hidden">
              {/* Titlebar */}
              <div className="h-8 bg-[#202024] border-b border-gray-700 px-3 flex items-center justify-between text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-semibold">Server Manager Dashboard — {activeSession.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button className="text-gray-400 hover:text-white">—</button>
                  <button className="text-gray-400 hover:text-white">□</button>
                  <button className="text-gray-400 hover:text-red-400">✕</button>
                </div>
              </div>

              {/* Window Content */}
              <div className="flex-1 p-4 bg-[#121214] text-gray-200 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <div>
                    <h4 className="text-sm font-bold text-white">Local Server Properties</h4>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">Windows Server 2025 Datacenter Edition (Build 26100.1742)</p>
                  </div>
                  <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold">
                    DOMAIN CONTROLLER READY
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                  <div className="bg-[#1c1c20] p-3 rounded border border-gray-800">
                    <span className="text-gray-400 block">Computer Name</span>
                    <span className="text-white font-bold text-sm">{activeSession.name}</span>
                  </div>
                  <div className="bg-[#1c1c20] p-3 rounded border border-gray-800">
                    <span className="text-gray-400 block">IPv4 Address</span>
                    <span className="text-emerald-400 font-bold text-sm">{activeSession.host}</span>
                  </div>
                  <div className="bg-[#1c1c20] p-3 rounded border border-gray-800">
                    <span className="text-gray-400 block">Active Roles</span>
                    <span className="text-blue-400 font-bold text-sm">AD-DS, DNS, IIS</span>
                  </div>
                </div>

                {/* PowerShell Embedded Shell */}
                <div className="bg-black/90 rounded border border-gray-800 p-3 font-mono text-xs text-gray-300 space-y-1">
                  <div className="text-gray-500">Windows PowerShell Copyright (C) Microsoft Corp.</div>
                  <div className="text-yellow-400 font-bold">PS C:\Users\Administrator&gt; Get-Service -Name W3SVC, Spooler, WinRM</div>
                  <div className="text-gray-400">Status &nbsp; Name &nbsp; &nbsp; &nbsp; DisplayName</div>
                  <div className="text-emerald-400">Running &nbsp; W3SVC &nbsp; &nbsp; &nbsp;World Wide Web Publishing Service</div>
                  <div className="text-emerald-400">Running &nbsp; WinRM &nbsp; &nbsp; &nbsp;Windows Remote Management (WS-Management)</div>
                  <div className="text-gray-500">Stopped &nbsp; Spooler &nbsp; &nbsp; Print Spooler</div>
                  <div className="flex items-center gap-1 text-white pt-1">
                    <span className="text-yellow-400">PS C:\Users\Administrator&gt;</span>
                    <span className="animate-pulse bg-white text-black px-0.5">_</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Windows Taskbar */}
            <div className="h-10 bg-[#141416]/95 backdrop-blur-md border-t border-gray-700 px-3 flex items-center justify-between text-xs text-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-blue-600 rounded hover:bg-blue-500 flex items-center justify-center cursor-pointer shadow-sm">
                  <Grid className="w-4 h-4" />
                </div>
                <div className="px-3 py-1 rounded bg-white/10 font-medium text-xs flex items-center gap-2 border-b-2 border-blue-500">
                  <Server className="w-3.5 h-3.5 text-blue-400" />
                  <span>Server Manager</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-gray-300">
                <span>ENG</span>
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        )}

        {activeSession.os === 'linux' && (
          <div className="w-full h-full max-w-6xl max-h-[850px] bg-[#2d0922] rounded-lg shadow-2xl border border-purple-900/40 flex flex-col overflow-hidden relative font-sans select-none">
            {/* Top GNOME Bar */}
            <div className="h-7 bg-black/90 px-4 flex items-center justify-between text-xs text-white font-medium">
              <div className="flex items-center gap-4">
                <span className="font-bold text-orange-400">Activities</span>
                <span>Terminal</span>
                <span>Files</span>
              </div>
              <div className="font-semibold text-gray-300">
                {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} &nbsp;
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Wifi className="w-3.5 h-3.5 text-white" />
                <Volume2 className="w-3.5 h-3.5 text-white" />
                <Power className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            {/* GNOME Desktop & Terminal Window */}
            <div className="flex-1 p-6 flex items-center justify-center">
              <div className="w-full max-w-3xl bg-[#300a24] border border-orange-500/30 rounded-lg shadow-2xl overflow-hidden flex flex-col font-mono text-xs text-white">
                <div className="h-7 bg-[#200517] px-3 flex items-center justify-between border-b border-orange-500/20">
                  <span className="text-gray-300 font-bold">ubuntu@ubuntu-workstation: ~</span>
                  <div className="flex items-center gap-2 text-gray-500">
                    <span>—</span>
                    <span>□</span>
                    <span>✕</span>
                  </div>
                </div>
                <div className="p-4 space-y-2 leading-relaxed bg-[#300a24]/90 text-gray-200">
                  <div className="text-orange-400 font-bold">ubuntu@workstation:~$ uname -a</div>
                  <div className="text-gray-300">Linux ubuntu-workstation 6.8.0-40-generic #40-Ubuntu SMP PREEMPT_DYNAMIC x86_64</div>
                  <div className="text-orange-400 font-bold pt-2">ubuntu@workstation:~$ systemctl status docker</div>
                  <div className="text-emerald-400">● docker.service - Docker Application Container Engine</div>
                  <div className="text-gray-400">&nbsp; &nbsp; Loaded: loaded (/usr/lib/systemd/system/docker.service; enabled)</div>
                  <div className="text-gray-400">&nbsp; &nbsp; Active: <span className="text-emerald-400 font-bold">active (running)</span> since Mon 2026-09-01</div>
                  <div className="flex items-center gap-1 pt-2">
                    <span className="text-emerald-400 font-bold">ubuntu@workstation:~$</span>
                    <span className="animate-pulse bg-white text-black px-0.5">_</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSession.os === 'mikrotik' && (
          <div className="w-full h-full max-w-6xl max-h-[850px] bg-[#272b30] rounded-lg shadow-2xl border border-gray-700 flex flex-col overflow-hidden relative font-sans select-none">
            {/* WinBox Titlebar */}
            <div className="h-7 bg-[#1c1e22] border-b border-gray-700 px-3 flex items-center justify-between text-xs text-gray-200">
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-400">WinBox v3.41</span>
                <span className="text-gray-400 font-mono">admin@192.168.88.1 (CCR2004-16G-2S+) - RouterOS v7.15</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 font-mono text-[11px]">
                <span>CPU: 4%</span>
                <span>RAM: 3824 MiB</span>
                <span>Uptime: 48d 14h</span>
              </div>
            </div>

            {/* WinBox Body: Left Menu & Right Table */}
            <div className="flex-1 flex overflow-hidden">
              {/* WinBox Classic Side Nav */}
              <div className="w-36 bg-[#1f2226] border-r border-gray-700 p-1 space-y-0.5 text-xs font-medium text-gray-300">
                {(['interfaces', 'routes', 'firewall', 'system'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setWinboxActiveMenu(m)}
                    className={`w-full text-left px-2.5 py-1 rounded capitalize transition-colors ${
                      winboxActiveMenu === m
                        ? 'bg-blue-600 text-white font-bold'
                        : 'hover:bg-[#2c3036] text-gray-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* WinBox Active Subwindow */}
              <div className="flex-1 p-3 bg-[#181a1d] overflow-y-auto space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-gray-700 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white uppercase text-sm">Interface List</span>
                    <span className="text-gray-500">(16 Gigabit Ethernet + 2 SFP+ 10G)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px]">
                      + Add
                    </button>
                    <button className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[11px]">
                      - Disable
                    </button>
                  </div>
                </div>

                <table className="w-full text-left text-xs border border-gray-800">
                  <thead className="bg-[#24282e] text-gray-400 text-[11px]">
                    <tr>
                      <th className="p-2">Name</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">MTU</th>
                      <th className="p-2">MAC Address</th>
                      <th className="p-2">Tx Rate</th>
                      <th className="p-2">Rx Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    <tr className="hover:bg-white/5 text-gray-200">
                      <td className="p-2 font-bold text-emerald-400">sfp-sfpplus1 (WAN)</td>
                      <td className="p-2">10G SFP+</td>
                      <td className="p-2">1500</td>
                      <td className="p-2">48:A9:8A:21:44:01</td>
                      <td className="p-2 text-blue-400">842.1 Mbps</td>
                      <td className="p-2 text-emerald-400">1.24 Gbps</td>
                    </tr>
                    <tr className="hover:bg-white/5 text-gray-200">
                      <td className="p-2 font-bold text-emerald-400">ether1-lan-trunk</td>
                      <td className="p-2">Ethernet</td>
                      <td className="p-2">1500</td>
                      <td className="p-2">48:A9:8A:21:44:02</td>
                      <td className="p-2 text-blue-400">620.4 Mbps</td>
                      <td className="p-2 text-emerald-400">480.2 Mbps</td>
                    </tr>
                    <tr className="hover:bg-white/5 text-gray-200">
                      <td className="p-2 font-bold text-emerald-400">wireguard-vpn</td>
                      <td className="p-2">WireGuard</td>
                      <td className="p-2">1420</td>
                      <td className="p-2">-</td>
                      <td className="p-2 text-blue-400">42.8 Mbps</td>
                      <td className="p-2 text-emerald-400">38.1 Mbps</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
