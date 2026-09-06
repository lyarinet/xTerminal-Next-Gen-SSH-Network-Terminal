import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Wifi,
  RefreshCw,
  Terminal as TerminalIcon,
  FileText,
  Settings,
  Share2,
  Camera,
  RotateCcw,
  Power,
  Battery,
  Cpu,
  Shield,
  Layers,
  Check,
  Copy,
  ExternalLink,
  Plus,
  Unplug,
  AlertTriangle,
  Play,
  Pause,
  Trash2,
  Download,
  Search
} from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface AdbDevice {
  id: string;
  state: 'device' | 'unauthorized' | 'offline' | 'recovery' | 'bootloader' | string;
  model: string;
  product?: string;
  device?: string;
  transportId?: string;
  isWireless?: boolean;
}

interface DeviceInfo {
  manufacturer: string;
  model: string;
  androidVersion: string;
  sdkLevel: string;
  buildId: string;
  cpuAbi: string;
  securityPatch: string;
  battery: {
    level: string;
    status: string;
    temperature: string;
  };
}

export const AdbManagerView: React.FC = () => {
  const [devices, setDevices] = useState<AdbDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'shell' | 'logcat' | 'actions' | 'remote'>('shell');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [adbStatus, setAdbStatus] = useState<{ installed: boolean; version?: string }>({ installed: false });

  // Connect Wireless Modal
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);
  const [connectIp, setConnectIp] = useState<string>('');
  const [connectPort, setConnectPort] = useState<number>(5555);
  const [pairCode, setPairCode] = useState<string>('');
  const [isPairing, setIsPairing] = useState<boolean>(false);
  const [connectStatusMsg, setConnectStatusMsg] = useState<string>('');

  // Device Info & Screenshot
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isTakingScreenshot, setIsTakingScreenshot] = useState<boolean>(false);
  const [installedPackages, setInstalledPackages] = useState<string[]>([]);
  const [packageSearch, setPackageSearch] = useState<string>('');

  // Logcat State
  const [logcatText, setLogcatText] = useState<string>('');
  const [logcatFilter, setLogcatFilter] = useState<string>('');
  const [isLogcatStreaming, setIsLogcatStreaming] = useState<boolean>(true);

  // Remote Bridge State
  const [remoteSessionId, setRemoteSessionId] = useState<string | null>(null);
  const [remoteShareUrl, setRemoteShareUrl] = useState<string>('');
  const [remoteCopied, setRemoteCopied] = useState<boolean>(false);
  const [remoteClientConnected, setRemoteClientConnected] = useState<boolean>(false);
  const [remoteClientInfo, setRemoteClientInfo] = useState<string>('');

  // Terminal Ref for ADB Shell
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const remoteWsRef = useRef<WebSocket | null>(null);

  // Fetch ADB status and devices list
  const fetchStatusAndDevices = async () => {
    try {
      setIsLoading(true);
      const [statusRes, devicesRes] = await Promise.all([
        fetch('/api/adb/status'),
        fetch('/api/adb/devices'),
      ]);
      const statusData = await statusRes.json();
      setAdbStatus({ installed: statusData.installed, version: statusData.version });

      const devicesData = await devicesRes.json();
      const list: AdbDevice[] = devicesData.devices || [];
      setDevices(list);

      if (list.length > 0) {
        setSelectedDeviceId((prev) => {
          if (!prev || !list.find((d) => d.id === prev)) {
            return list[0].id;
          }
          return prev;
        });
      }
    } catch (e) {
      console.error('Error fetching ADB status/devices:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Restart ADB Server (adb kill-server && adb start-server)
  const handleRestartAdbServer = async () => {
    try {
      setIsLoading(true);
      await fetch('/api/adb/restart-server', { method: 'POST' });
      await fetchStatusAndDevices();
    } catch (e: any) {
      alert(`ADB Restart error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndDevices();
    const interval = setInterval(() => {
      fetch('/api/adb/devices')
        .then((r) => r.json())
        .then((data) => {
          const list: AdbDevice[] = data.devices || [];
          setDevices(list);
          setSelectedDeviceId((prev) => {
            if (!prev && list.length > 0) return list[0].id;
            if (prev && !list.find((d) => d.id === prev) && list.length > 0) return list[0].id;
            return prev;
          });
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Poll Remote ADB Bridge Session Status (HTTP Fallback + Resilience)
  useEffect(() => {
    if (!remoteSessionId) return;
    const pollSession = () => {
      fetch(`/api/adb-bridge/session/${remoteSessionId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && (data.status === 'connected' || data.clientDeviceInfo || data.clientConnected)) {
            setRemoteClientConnected(true);
            if (data.clientDeviceInfo) setRemoteClientInfo(data.clientDeviceInfo);
          } else if (data && data.status === 'waiting') {
            setRemoteClientConnected(false);
          }
        })
        .catch(() => {});
    };

    pollSession();
    const interval = setInterval(pollSession, 2000);
    return () => clearInterval(interval);
  }, [remoteSessionId]);

  // Fetch Device Details when selected device changes or actions tab is clicked
  useEffect(() => {
    if (!selectedDeviceId) return;
    const selected = devices.find((d) => d.id === selectedDeviceId);
    if (selected && selected.state === 'device') {
      fetch('/api/adb/device-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: selectedDeviceId }),
      })
        .then((r) => r.json())
        .then((d) => setDeviceInfo(d))
        .catch(() => {});

      fetch('/api/adb/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: selectedDeviceId, thirdPartyOnly: true }),
      })
        .then((r) => r.json())
        .then((d) => setInstalledPackages(d.packages || []))
        .catch(() => {});
    } else {
      setDeviceInfo(null);
      setInstalledPackages([]);
    }
  }, [selectedDeviceId, devices]);

  // ADB Interactive Shell (xterm.js initialization)
  useEffect(() => {
    if (activeTab !== 'shell' || !terminalRef.current) return;

    if (!xtermRef.current) {
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        theme: {
          background: '#0A0B0E',
          foreground: '#E0E0E0',
          cursor: '#10B981',
          black: '#111112',
          green: '#10B981',
          yellow: '#F59E0B',
          cyan: '#06B6D4',
          white: '#F3F4F6',
        },
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      term.onData((data) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'input', data }));
        }
      });
    }

    // Connect WebSocket
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws/adb`);
    wsRef.current = ws;

    ws.onopen = () => {
      xtermRef.current?.writeln('\x1b[36m>>> Connecting to Android ADB Shell...\x1b[0m\r\n');
      ws.send(
        JSON.stringify({
          type: 'init',
          deviceId: selectedDeviceId || undefined,
          cols: xtermRef.current?.cols || 80,
          rows: xtermRef.current?.rows || 24,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'data') {
          xtermRef.current?.write(msg.data);
        } else if (msg.type === 'exit') {
          xtermRef.current?.writeln('\r\n\x1b[33m[ADB Shell Process Terminated]\x1b[0m');
        } else if (msg.type === 'error') {
          xtermRef.current?.writeln(`\r\n\x1b[31m[ADB Error: ${msg.message}]\x1b[0m`);
        }
      } catch {}
    };

    const handleResize = () => {
      fitAddonRef.current?.fit();
      if (ws.readyState === WebSocket.OPEN && xtermRef.current) {
        ws.send(
          JSON.stringify({
            type: 'resize',
            cols: xtermRef.current.cols,
            rows: xtermRef.current.rows,
          })
        );
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [activeTab, selectedDeviceId]);

  // Logcat snapshot poll
  useEffect(() => {
    if (activeTab !== 'logcat' || !isLogcatStreaming || !selectedDeviceId) return;

    const fetchLogs = () => {
      fetch('/api/adb/logcat-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: selectedDeviceId, lines: 150, filter: logcatFilter }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.logs) setLogcatText(d.logs);
        })
        .catch(() => {});
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 2500);
    return () => clearInterval(interval);
  }, [activeTab, isLogcatStreaming, selectedDeviceId, logcatFilter]);

  // Wireless connect handler
  const handleWirelessConnect = async () => {
    if (!connectIp.trim()) return;
    setConnectStatusMsg('Connecting to device...');
    try {
      if (isPairing && pairCode.trim()) {
        const pairRes = await fetch('/api/adb/pair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip: connectIp, port: connectPort, code: pairCode }),
        });
        const pairData = await pairRes.json();
        if (!pairData.success) {
          setConnectStatusMsg(`Pair failed: ${pairData.output || 'Unknown error'}`);
          return;
        }
      }

      const res = await fetch('/api/adb/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: connectIp, port: connectPort }),
      });
      const data = await res.json();
      setConnectStatusMsg(data.output || (data.success ? 'Connected successfully!' : 'Failed to connect'));
      if (data.success) {
        setTimeout(() => {
          setShowConnectModal(false);
          setConnectStatusMsg('');
          fetchStatusAndDevices();
        }, 1200);
      }
    } catch (e: any) {
      setConnectStatusMsg(`Error: ${e.message}`);
    }
  };

  // Switch USB to TCP/IP mode
  const handleSwitchTcpip = async () => {
    if (!selectedDeviceId) return;
    try {
      setIsLoading(true);
      const res = await fetch('/api/adb/tcpip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: selectedDeviceId, port: 5555 }),
      });
      const data = await res.json();
      alert(data.output || 'Device restarted in TCP/IP mode on port 5555.');
      fetchStatusAndDevices();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect device
  const handleDisconnect = async (target: string) => {
    try {
      await fetch('/api/adb/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      fetchStatusAndDevices();
    } catch (e) {}
  };

  // Take Screenshot
  const handleTakeScreenshot = async () => {
    if (!selectedDeviceId) return;
    try {
      setIsTakingScreenshot(true);
      const res = await fetch('/api/adb/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: selectedDeviceId }),
      });
      const data = await res.json();
      if (data.image) {
        setScreenshotUrl(data.image);
      } else {
        alert(data.error || 'Failed to capture screenshot');
      }
    } catch (e: any) {
      alert(`Screenshot failed: ${e.message}`);
    } finally {
      setIsTakingScreenshot(false);
    }
  };

  // Reboot device
  const handleReboot = async (mode: string) => {
    if (!selectedDeviceId) return;
    if (!confirm(`Are you sure you want to reboot device (${mode})?`)) return;
    try {
      await fetch('/api/adb/reboot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: selectedDeviceId, mode }),
      });
      alert(`Reboot command sent (${mode}).`);
      fetchStatusAndDevices();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  // Generate Remote ADB Client URL
  const handleCreateRemoteSession = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/adb-bridge/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Remote Android Client' }),
      });
      const data = await res.json();
      if (data.success) {
        setRemoteSessionId(data.session.id);
        const rawHost = localStorage.getItem('nexusterm_serial_remote_ip') || window.location.hostname;
        const host = rawHost.replace(/\/+$/, '').trim();
        const isLocal = host === 'localhost' || host === '127.0.0.1';
        const isDomain = !isLocal && !/^(\d{1,3}\.){3}\d{1,3}$/.test(host);
        const proto = window.location.protocol === 'https:' ? 'https:' : 'http:';
        const port = isDomain ? '' : (window.location.protocol === 'https:' ? ':3443' : ':3000');
        const sharePath = data.sharePath.startsWith('/') ? data.sharePath : `/${data.sharePath}`;
        const url = `${proto}//${host}${port}${sharePath}`;
        setRemoteShareUrl(url);

        // Connect Engineer WS to listen for client events
        if (remoteWsRef.current) {
          try { remoteWsRef.current.close(); } catch {}
        }
        const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${wsProto}//${window.location.host}/ws/adb-bridge`);
        remoteWsRef.current = ws;

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'join', sessionId: data.session.id, role: 'engineer' }));
        };
        ws.onmessage = (event) => {
          try {
            const m = JSON.parse(event.data);
            if (m.type === 'client:connected') {
              setRemoteClientConnected(true);
              setRemoteClientInfo(m.deviceInfo || 'Android Phone');
            } else if (m.type === 'session:state') {
              if (m.status === 'connected' || m.clientConnected) {
                setRemoteClientConnected(true);
                if (m.clientDeviceInfo) setRemoteClientInfo(m.clientDeviceInfo);
              }
            } else if (m.type === 'client:disconnected') {
              setRemoteClientConnected(false);
            }
          } catch {}
        };
      }
    } catch (e: any) {
      alert(`Failed to create session: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);

  return (
    <div className="flex flex-col h-full bg-[#0A0A0B] text-gray-200 select-none overflow-hidden">
      {/* Top Header / Devices Bar */}
      <div className="h-14 px-4 bg-[#111113] border-b border-[#222226] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <span>Android ADB Console</span>
          </div>

          <div className="h-4 w-px bg-gray-700 mx-1 hidden sm:block" />

          {/* Device Selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="px-2.5 py-1.5 rounded-md bg-[#1C1C20] border border-[#2A2B30] text-xs font-mono text-emerald-400 focus:outline-hidden focus:border-emerald-500"
            >
              {devices.length === 0 ? (
                <option value="">No Devices Attached</option>
              ) : (
                devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.model} ({d.id}) - [{d.state.toUpperCase()}]
                  </option>
                ))
              )}
            </select>

            {selectedDevice && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  selectedDevice.state === 'device'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : selectedDevice.state === 'unauthorized'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
                    : 'bg-red-500/15 text-red-400 border border-red-500/30'
                }`}
              >
                {selectedDevice.state}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStatusAndDevices}
            disabled={isLoading}
            className="p-1.5 rounded-md bg-[#1C1C20] hover:bg-[#25252A] text-gray-300 hover:text-white border border-[#2A2B30] text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Refresh Devices List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleRestartAdbServer}
            disabled={isLoading}
            className="p-1.5 rounded-md bg-[#1C1C20] hover:bg-[#25252A] text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Restart ADB Host Server (kill & restart adb daemon)"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reset ADB</span>
          </button>

          <button
            onClick={() => setShowConnectModal(true)}
            className="px-2.5 py-1.5 rounded-md bg-[#1C1C20] hover:bg-[#25252A] text-sky-400 hover:text-sky-300 border border-sky-500/30 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Connect Wireless Device via IP"
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Connect IP</span>
          </button>

          {selectedDevice && !selectedDevice.isWireless && selectedDevice.state === 'device' && (
            <button
              onClick={handleSwitchTcpip}
              className="px-2.5 py-1.5 rounded-md bg-[#1C1C20] hover:bg-[#25252A] text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Enable Wi-Fi Mode on port 5555"
            >
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Enable Wi-Fi ADB</span>
            </button>
          )}

          {selectedDevice && selectedDevice.isWireless && (
            <button
              onClick={() => handleDisconnect(selectedDevice.id)}
              className="px-2.5 py-1.5 rounded-md bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Disconnect Wireless Device"
            >
              <Unplug className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="h-10 px-4 bg-[#0E0F12] border-b border-[#202126] flex items-center gap-2">
        <button
          onClick={() => setActiveTab('shell')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'shell'
              ? 'bg-[#1C1D22] text-white shadow-xs'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span>Interactive ADB Shell</span>
        </button>

        <button
          onClick={() => setActiveTab('logcat')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'logcat'
              ? 'bg-[#1C1D22] text-white shadow-xs'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-sky-400" />
          <span>Live Logcat</span>
        </button>

        <button
          onClick={() => setActiveTab('actions')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'actions'
              ? 'bg-[#1C1D22] text-white shadow-xs'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5 text-purple-400" />
          <span>Device Info &amp; Control</span>
        </button>

        <button
          onClick={() => setActiveTab('remote')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'remote'
              ? 'bg-[#1C1D22] text-white shadow-xs'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Share2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Remote Client Tunnel (WebUSB)</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Warning if device is unauthorized */}
        {((selectedDevice && selectedDevice.state === 'unauthorized') || devices.some((d) => d.state === 'unauthorized')) && (
          <div className="p-3 bg-amber-500/15 border-b border-amber-500/30 text-amber-300 text-xs flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <strong>Device Unauthorized:</strong> Phone ki screen unlock karke <strong>"Always allow from this computer"</strong> tick karein aur <strong>"Allow"</strong> dabayein.
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleRestartAdbServer}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Reset ADB
              </button>
              <button
                onClick={fetchStatusAndDevices}
                className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Re-check
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: ADB SHELL */}
        <div className={`w-full h-full p-2 ${activeTab === 'shell' ? 'block' : 'hidden'}`}>
          <div ref={terminalRef} className="w-full h-full rounded-lg overflow-hidden border border-[#202126]" />
        </div>

        {/* TAB 2: LOGCAT VIEWER */}
        {activeTab === 'logcat' && (
          <div className="flex flex-col h-full p-4 gap-3">
            <div className="flex items-center justify-between gap-3 bg-[#111113] p-3 rounded-lg border border-[#222226]">
              <div className="flex items-center gap-2 flex-1">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter logcat by tag, PID, or message..."
                  value={logcatFilter}
                  onChange={(e) => setLogcatFilter(e.target.value)}
                  className="bg-transparent border-none text-xs text-white focus:outline-hidden flex-1 font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsLogcatStreaming(!isLogcatStreaming)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                    isLogcatStreaming
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {isLogcatStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isLogcatStreaming ? 'Streaming' : 'Paused'}</span>
                </button>

                <button
                  onClick={() => setLogcatText('')}
                  className="p-1 rounded bg-[#1C1C20] hover:bg-[#25252A] text-gray-400 hover:text-white"
                  title="Clear Log View"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#060709] border border-[#202126] rounded-lg p-3 font-mono text-xs overflow-y-auto whitespace-pre-wrap text-gray-300">
              {logcatText || 'Waiting for logcat output...'}
            </div>
          </div>
        )}

        {/* TAB 3: DEVICE ACTIONS & INFO */}
        {activeTab === 'actions' && (
          <div className="h-full overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Specs Card */}
              <div className="bg-[#111113] p-4 rounded-xl border border-[#222226] space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Device Specifications</span>
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between border-b border-[#202126] pb-1">
                    <span className="text-gray-400">Manufacturer:</span>
                    <span className="text-white">{deviceInfo?.manufacturer || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#202126] pb-1">
                    <span className="text-gray-400">Model:</span>
                    <span className="text-emerald-400">{deviceInfo?.model || selectedDevice?.model || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#202126] pb-1">
                    <span className="text-gray-400">Android Version:</span>
                    <span className="text-sky-400">{deviceInfo?.androidVersion || 'N/A'} (API {deviceInfo?.sdkLevel || '-'})</span>
                  </div>
                  <div className="flex justify-between border-b border-[#202126] pb-1">
                    <span className="text-gray-400">CPU ABI:</span>
                    <span className="text-white">{deviceInfo?.cpuAbi || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Security Patch:</span>
                    <span className="text-purple-300">{deviceInfo?.securityPatch || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Battery & Health Card */}
              <div className="bg-[#111113] p-4 rounded-xl border border-[#222226] space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Battery className="w-4 h-4 text-yellow-400" />
                  <span>Battery &amp; Power</span>
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between border-b border-[#202126] pb-1">
                    <span className="text-gray-400">Charge Level:</span>
                    <span className="text-yellow-400 font-bold">{deviceInfo?.battery.level || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#202126] pb-1">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-white">{deviceInfo?.battery.status || 'Normal'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Temperature:</span>
                    <span className="text-cyan-400">{deviceInfo?.battery.temperature || 'N/A'}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-gray-400 block mb-2">Reboot Controls:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleReboot('system')}
                      className="px-2 py-1.5 rounded bg-[#1C1C20] hover:bg-[#25252A] text-xs text-white border border-[#2A2B30] cursor-pointer"
                    >
                      System
                    </button>
                    <button
                      onClick={() => handleReboot('recovery')}
                      className="px-2 py-1.5 rounded bg-[#1C1C20] hover:bg-[#25252A] text-xs text-amber-400 border border-[#2A2B30] cursor-pointer"
                    >
                      Recovery
                    </button>
                    <button
                      onClick={() => handleReboot('bootloader')}
                      className="px-2 py-1.5 rounded bg-[#1C1C20] hover:bg-[#25252A] text-xs text-red-400 border border-[#2A2B30] cursor-pointer"
                    >
                      Bootloader
                    </button>
                  </div>
                </div>
              </div>

              {/* Screen Capture Card */}
              <div className="bg-[#111113] p-4 rounded-xl border border-[#222226] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <Camera className="w-4 h-4 text-sky-400" />
                      <span>Screen Capture</span>
                    </div>
                    <button
                      onClick={handleTakeScreenshot}
                      disabled={isTakingScreenshot}
                      className="px-2.5 py-1 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{isTakingScreenshot ? 'Capturing...' : 'Capture'}</span>
                    </button>
                  </div>
                </div>

                {screenshotUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={screenshotUrl} alt="Screen Preview" className="max-h-48 rounded-lg border border-[#222226] shadow-lg" />
                    <a
                      href={screenshotUrl}
                      download="screen-capture.png"
                      className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Download PNG
                    </a>
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500 text-xs border border-dashed border-[#222226] rounded-lg">
                    Click "Capture" to pull current display preview from device
                  </div>
                )}
              </div>
            </div>

            {/* Installed 3rd-Party Packages */}
            <div className="bg-[#111113] p-4 rounded-xl border border-[#222226] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Installed Apps &amp; Packages ({installedPackages.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search apps..."
                    value={packageSearch}
                    onChange={(e) => setPackageSearch(e.target.value)}
                    className="px-2.5 py-1 rounded bg-[#1C1C20] border border-[#2A2B30] text-xs text-white focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                {installedPackages
                  .filter((p) => p.toLowerCase().includes(packageSearch.toLowerCase()))
                  .map((pkg) => (
                    <div key={pkg} className="p-2 rounded bg-[#0D0E12] border border-[#1E1F26] text-xs font-mono text-gray-300 truncate">
                      {pkg}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: REMOTE CLIENT TUNNEL (WebUSB) */}
        {activeTab === 'remote' && (
          <div className="h-full overflow-y-auto p-6 flex flex-col items-center justify-center">
            <div className="w-full max-w-xl bg-[#111113] border border-[#222226] rounded-2xl p-6 space-y-5 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Remote Client Android ADB Tunnel</h3>
                  <p className="text-xs text-gray-400">
                    Allow a remote client to connect their Android phone via Chrome WebUSB without installing ADB or drivers!
                  </p>
                </div>
              </div>

              {!remoteSessionId ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 space-y-2">
                    <p className="font-semibold">How Remote ADB Tunnel Works:</p>
                    <p className="text-sky-200/80 leading-relaxed">
                      1. You click "Generate Remote Client Link" below.<br />
                      2. Send the link to your client via WhatsApp, Slack, or Email.<br />
                      3. Client opens it in Chrome, plugs their phone into USB, and clicks "Connect".<br />
                      4. Client's phone console appears right inside your xTerminal workstation!
                    </p>
                  </div>

                  <button
                    onClick={handleCreateRemoteSession}
                    disabled={isLoading}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Generate Remote Client Link</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Share this URL with your remote client:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={remoteShareUrl}
                        className="flex-1 px-3 py-2 rounded-lg bg-[#0A0B0E] border border-[#25262C] font-mono text-xs text-cyan-400 select-all"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(remoteShareUrl);
                          setRemoteCopied(true);
                          setTimeout(() => setRemoteCopied(false), 2000);
                        }}
                        className="px-3 py-2 rounded-lg bg-[#1C1C20] hover:bg-[#25252A] text-white border border-[#2A2B30] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {remoteCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{remoteCopied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0E0F13] border border-[#1F2026] flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-400">Tunnel Status:</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        remoteClientConnected
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
                      }`}
                    >
                      {remoteClientConnected ? `Connected: ${remoteClientInfo}` : 'Waiting for client'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={remoteShareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 rounded-lg bg-[#1C1C20] hover:bg-[#25252A] text-sky-400 border border-sky-500/20 text-center font-semibold text-xs flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Test Client Portal</span>
                    </a>
                    <button
                      onClick={() => {
                        setRemoteSessionId(null);
                        setRemoteShareUrl('');
                      }}
                      className="px-4 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-semibold cursor-pointer"
                    >
                      End Session
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CONNECT WIRELESS IP MODAL */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#121316] border border-[#222226] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#202126] pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Wifi className="w-4 h-4 text-sky-400" />
                <span>Connect Wireless Android Device</span>
              </h3>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">Device Wi-Fi IP Address:</label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.50"
                  value={connectIp}
                  onChange={(e) => setConnectIp(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0E0F12] border border-[#24252A] text-emerald-400 font-mono focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Port:</label>
                <input
                  type="number"
                  value={connectPort}
                  onChange={(e) => setConnectPort(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-[#0E0F12] border border-[#24252A] text-gray-200 font-mono focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                  <input
                    type="checkbox"
                    checked={isPairing}
                    onChange={(e) => setIsPairing(e.target.checked)}
                    className="rounded border-[#24252A] text-sky-500 focus:ring-0"
                  />
                  <span>Android 11+ Wireless Debugging Pairing Code Required</span>
                </label>
              </div>

              {isPairing && (
                <div>
                  <label className="block text-gray-300 font-medium mb-1">6-Digit Pairing Code:</label>
                  <input
                    type="text"
                    placeholder="e.g. 123456"
                    value={pairCode}
                    onChange={(e) => setPairCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0E0F12] border border-[#24252A] text-purple-300 font-mono focus:outline-hidden focus:border-purple-500 tracking-wider"
                  />
                </div>
              )}

              {connectStatusMsg && (
                <div className="p-2.5 rounded bg-[#18191E] border border-[#25262C] font-mono text-[11px] text-sky-300">
                  {connectStatusMsg}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#202126]">
              <button
                onClick={() => setShowConnectModal(false)}
                className="px-3 py-1.5 rounded-lg bg-[#1C1C20] hover:bg-[#25252A] text-gray-300 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleWirelessConnect}
                className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs cursor-pointer transition-colors"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
