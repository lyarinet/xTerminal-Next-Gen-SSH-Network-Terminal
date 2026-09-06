import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Monitor,
  Maximize2,
  Minimize2,
  Power,
  Copy,
  Keyboard,
  Shield,
  Wifi,
  MousePointer,
  Check,
  AlertTriangle,
  Server,
  Plus,
  X,
  Eye,
  Lock,
  RefreshCw,
  Layers
} from 'lucide-react';
import RFB from '@novnc/novnc';

export interface VncSession {
  id: string;
  name: string;
  protocol: 'VNC';
  host: string;
  port: number;
  password?: string;
  viewOnly?: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  errorMessage?: string;
}

const STORAGE_KEY = 'xterminal_vnc_sessions';

export const RemoteDesktopView: React.FC = () => {
  const [sessions, setSessions] = useState<VncSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s: any) => ({
            ...s,
            protocol: 'VNC' as const,
            status: 'disconnected' as const,
          }));
        }
      }
    } catch {}
    return [
      {
        id: 'vnc-default',
        name: 'Local VNC Host',
        protocol: 'VNC',
        host: '127.0.0.1',
        port: 5900,
        password: '',
        viewOnly: false,
        status: 'disconnected',
      },
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || 'vnc-default';
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [displayScale, setDisplayScale] = useState<'fit' | '100%'>('fit');
  const [clipboardToast, setClipboardToast] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [customClipboardText, setCustomClipboardText] = useState('');
  const [showClipboardInput, setShowClipboardInput] = useState(false);

  // New connection form states
  const [formName, setFormName] = useState('');
  const [formHost, setFormHost] = useState('');
  const [formPort, setFormPort] = useState(5900);
  const [formPassword, setFormPassword] = useState('');
  const [formViewOnly, setFormViewOnly] = useState(false);

  // VNC Canvas Container & RFB refs
  const containerRef = useRef<HTMLDivElement>(null);
  const vncScreenRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<any>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {}
  }, [sessions]);

  const updateSessionStatus = useCallback((
    id: string,
    status: 'connected' | 'connecting' | 'disconnected' | 'error',
    errorMessage?: string
  ) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, errorMessage } : s))
    );
  }, []);

  // Connect / Disconnect active noVNC session
  useEffect(() => {
    if (!activeSession) return;
    if (!vncScreenRef.current) return;

    // Disconnect any existing session
    if (rfbRef.current) {
      try {
        rfbRef.current.disconnect();
      } catch {}
      rfbRef.current = null;
    }

    // Clean container children
    vncScreenRef.current.innerHTML = '';

    updateSessionStatus(activeSession.id, 'connecting');

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/vnc?host=${encodeURIComponent(
      activeSession.host
    )}&port=${encodeURIComponent(activeSession.port)}`;

    try {
      const rfb = new RFB(vncScreenRef.current, wsUrl, {
        credentials: { password: activeSession.password || '' },
        shared: true,
      });

      rfb.viewOnly = Boolean(activeSession.viewOnly);
      rfb.scaleViewport = displayScale === 'fit';
      rfb.resizeSession = false;
      rfb.clipViewport = false;

      rfb.addEventListener('connect', () => {
        updateSessionStatus(activeSession.id, 'connected');
      });

      rfb.addEventListener('disconnect', (e: any) => {
        const clean = e.detail?.clean;
        updateSessionStatus(
          activeSession.id,
          'disconnected',
          clean ? undefined : 'VNC remote host closed connection'
        );
      });

      rfb.addEventListener('securityfailure', (e: any) => {
        console.warn('VNC Security/Auth Failure:', e.detail);
        updateSessionStatus(
          activeSession.id,
          'error',
          'VNC Authentication failed (Invalid password or unsupported encryption)'
        );
      });

      rfb.addEventListener('clipboard', (e: any) => {
        if (e.detail?.text) {
          navigator.clipboard?.writeText(e.detail.text).catch(() => {});
          setClipboardToast('Remote clipboard copied to local clipboard');
          setTimeout(() => setClipboardToast(null), 3000);
        }
      });

      rfbRef.current = rfb;
    } catch (err: any) {
      console.error('Failed to init RFB:', err);
      updateSessionStatus(activeSession.id, 'error', `RFB Engine failed: ${err.message}`);
    }

    return () => {
      if (rfbRef.current) {
        try {
          rfbRef.current.disconnect();
        } catch {}
        rfbRef.current = null;
      }
    };
  }, [
    activeSession?.id,
    activeSession?.host,
    activeSession?.port,
    activeSession?.password,
    activeSession?.viewOnly,
    updateSessionStatus,
  ]);

  // Handle dynamic viewport scale changes
  useEffect(() => {
    if (rfbRef.current) {
      rfbRef.current.scaleViewport = displayScale === 'fit';
    }
  }, [displayScale]);

  // Keyboard and Action Helpers
  const handleSendCtrlAltDel = () => {
    if (rfbRef.current) {
      rfbRef.current.sendCtrlAltDel();
      setClipboardToast('Sent Ctrl+Alt+Del signal');
      setTimeout(() => setClipboardToast(null), 2500);
    }
  };

  const handleSendKey = (keysym: number, code: string) => {
    if (rfbRef.current) {
      rfbRef.current.sendKey(keysym, code, true);
      setTimeout(() => {
        if (rfbRef.current) rfbRef.current.sendKey(keysym, code, false);
      }, 50);
      setClipboardToast(`Sent key: ${code}`);
      setTimeout(() => setClipboardToast(null), 2000);
    }
  };

  const handleSendClipboardText = (text: string) => {
    if (!text.trim()) return;
    if (rfbRef.current) {
      rfbRef.current.clipboardPasteFrom(text);
      setClipboardToast(`Pasted ${text.length} chars to remote session`);
      setTimeout(() => setClipboardToast(null), 2500);
      setCustomClipboardText('');
      setShowClipboardInput(false);
    }
  };

  const handlePasteFromLocalClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleSendClipboardText(text);
      }
    } catch {
      setShowClipboardInput(true);
    }
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleDisconnect = () => {
    if (rfbRef.current) {
      try {
        rfbRef.current.disconnect();
      } catch {}
      rfbRef.current = null;
    }
    if (activeSession) {
      updateSessionStatus(activeSession.id, 'disconnected');
    }
  };

  const handleReconnect = () => {
    if (!activeSession) return;
    updateSessionStatus(activeSession.id, 'connecting');
    const current = activeSession.id;
    setActiveSessionId('');
    setTimeout(() => setActiveSessionId(current), 80);
  };

  const handleToggleViewOnly = () => {
    if (!activeSession) return;
    const nextVal = !activeSession.viewOnly;
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSession.id ? { ...s, viewOnly: nextVal } : s))
    );
    if (rfbRef.current) {
      rfbRef.current.viewOnly = nextVal;
    }
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formHost.trim()) return;

    const newSess: VncSession = {
      id: `vnc-${Date.now()}`,
      name: formName.trim() || `${formHost.trim()}:${formPort || 5900}`,
      protocol: 'VNC',
      host: formHost.trim(),
      port: Number(formPort) || 5900,
      password: formPassword.trim() || undefined,
      viewOnly: formViewOnly,
      status: 'disconnected',
    };

    setSessions((prev) => [...prev, newSess]);
    setActiveSessionId(newSess.id);
    setShowNewModal(false);

    // Reset Form
    setFormName('');
    setFormHost('');
    setFormPort(5900);
    setFormPassword('');
    setFormViewOnly(false);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) return;
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      const remaining = sessions.filter((s) => s.id !== id);
      setActiveSessionId(remaining[0]?.id || '');
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-[#0d1117] text-slate-100 font-sans select-none overflow-hidden"
    >
      {/* Top Protocol Bar & Tab Navigator */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-slate-800 text-xs shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold tracking-wide">
            <Monitor className="w-3.5 h-3.5" />
            <span>noVNC Workstation</span>
            <span className="text-[10px] px-1 py-0.2 bg-emerald-500/20 text-emerald-300 rounded uppercase font-bold">
              Pure In-App RFB
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Session Tabs */}
          {sessions.map((s) => {
            const isActive = s.id === activeSessionId;
            return (
              <div
                key={s.id}
                onClick={() => setActiveSessionId(s.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-all border ${
                  isActive
                    ? 'bg-slate-800 border-slate-700 text-white shadow-sm'
                    : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    s.status === 'connected'
                      ? 'bg-emerald-400 ring-2 ring-emerald-500/30'
                      : s.status === 'connecting'
                      ? 'bg-amber-400 animate-pulse'
                      : s.status === 'error'
                      ? 'bg-rose-500'
                      : 'bg-slate-500'
                  }`}
                />
                <span className="font-medium truncate max-w-[130px]">{s.name}</span>
                <span className="text-[10px] text-slate-500">:{s.port}</span>

                {sessions.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    className="p-0.5 hover:bg-slate-700 rounded text-slate-500 hover:text-rose-400 transition-colors"
                    title="Remove Session"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-slate-800/60 hover:bg-slate-700/80 border border-dashed border-slate-700 text-slate-300 hover:text-white transition-all text-xs"
            title="Add New VNC Connection"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Host</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {clipboardToast && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded text-[11px] animate-fadeIn">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>{clipboardToast}</span>
            </div>
          )}

          {/* Special Keys Menu */}
          <div className="relative group">
            <button
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
              title="Send Special Keys"
            >
              <Keyboard className="w-3.5 h-3.5 text-blue-400" />
              <span>Keys</span>
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-[#161b22] border border-slate-700 rounded-md shadow-xl py-1 z-50 w-44">
              <button
                onClick={handleSendCtrlAltDel}
                className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-left text-xs text-slate-200"
              >
                <span>Ctrl + Alt + Del</span>
                <span className="text-[10px] text-slate-500">Security SAS</span>
              </button>
              <button
                onClick={() => handleSendKey(0xffeb, 'Super_L')}
                className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-left text-xs text-slate-200"
              >
                <span>Windows / Super</span>
                <span className="text-[10px] text-slate-500">WinKey</span>
              </button>
              <button
                onClick={() => handleSendKey(0xff1b, 'Escape')}
                className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-left text-xs text-slate-200"
              >
                <span>Escape</span>
                <span className="text-[10px] text-slate-500">Esc</span>
              </button>
              <button
                onClick={() => handleSendKey(0xff09, 'Tab')}
                className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-800 text-left text-xs text-slate-200"
              >
                <span>Tab</span>
                <span className="text-[10px] text-slate-500">Tab</span>
              </button>
            </div>
          </div>

          {/* Clipboard Sync */}
          <button
            onClick={handlePasteFromLocalClipboard}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title="Paste Local Clipboard into Remote Host"
          >
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            <span>Paste Clipboard</span>
          </button>

          {/* View Only Toggle */}
          <button
            onClick={handleToggleViewOnly}
            className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors ${
              activeSession?.viewOnly
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="Toggle View-Only Observer Mode"
          >
            {activeSession?.viewOnly ? (
              <>
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>View Only</span>
              </>
            ) : (
              <>
                <MousePointer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Interactive</span>
              </>
            )}
          </button>

          {/* Scale Mode */}
          <button
            onClick={() => setDisplayScale((prev) => (prev === 'fit' ? '100%' : 'fit'))}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title="Switch Scale Mode"
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span className="capitalize">{displayScale}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={handleToggleFullscreen}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Disconnect / Reconnect Button */}
          {activeSession?.status === 'connected' ? (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 text-rose-300 transition-colors"
              title="Disconnect Session"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              onClick={handleReconnect}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 transition-colors"
              title="Connect / Reconnect"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${activeSession?.status === 'connecting' ? 'animate-spin' : ''}`} />
              <span>Connect</span>
            </button>
          )}
        </div>
      </div>

      {/* Manual Clipboard Input Drawer */}
      {showClipboardInput && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#1c2128] border-b border-slate-700 text-xs shrink-0 animate-fadeIn">
          <Copy className="w-4 h-4 text-amber-400 shrink-0" />
          <input
            type="text"
            value={customClipboardText}
            onChange={(e) => setCustomClipboardText(e.target.value)}
            placeholder="Type text to send to remote VNC clipboard..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 outline-none focus:border-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendClipboardText(customClipboardText);
            }}
          />
          <button
            onClick={() => handleSendClipboardText(customClipboardText)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
          >
            Send Text
          </button>
          <button
            onClick={() => setShowClipboardInput(false)}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Remote Display Area */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-auto p-1">
        {/* Active VNC Canvas Element */}
        <div
          ref={vncScreenRef}
          className={`vnc-canvas-wrapper w-full h-full flex items-center justify-center ${
            displayScale === 'fit' ? 'overflow-hidden' : 'overflow-auto'
          }`}
          style={{ minHeight: '100%' }}
        />

        {/* State Overlays */}
        {activeSession?.status === 'disconnected' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6 z-20 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 shadow-xl">
              <Monitor className="w-7 h-7 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-1">
              VNC Session Disconnected
            </h3>
            <p className="text-sm text-slate-400 max-w-md mb-5">
              Ready to connect to{' '}
              <span className="text-emerald-400 font-mono font-medium">
                {activeSession.host}:{activeSession.port}
              </span>
              . The embedded RFB engine connects without any external software.
            </p>
            <button
              onClick={handleReconnect}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-950 transition-all hover:scale-102"
            >
              <Wifi className="w-4 h-4" />
              <span>Connect to Host</span>
            </button>
          </div>
        )}

        {activeSession?.status === 'connecting' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6 z-20 animate-fadeIn">
            <div className="w-12 h-12 rounded-full border-3 border-emerald-500/30 border-t-emerald-400 animate-spin mb-4" />
            <h4 className="text-base font-semibold text-slate-200 mb-1">
              Establishing In-App VNC Tunnel...
            </h4>
            <p className="text-xs text-slate-400 font-mono">
              Connecting to RFB server at {activeSession.host}:{activeSession.port}
            </p>
          </div>
        )}

        {activeSession?.status === 'error' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6 z-20 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-800 flex items-center justify-center mb-4 shadow-xl">
              <AlertTriangle className="w-7 h-7 text-rose-400" />
            </div>
            <h3 className="text-lg font-semibold text-rose-200 mb-1">
              Connection Failed
            </h3>
            <p className="text-sm text-rose-300/80 max-w-md mb-2 font-mono text-xs">
              {activeSession.errorMessage || 'Unable to connect to target VNC server.'}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mb-5">
              Verify that the VNC server is running on {activeSession.host}:{activeSession.port} and allows connections.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReconnect}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition-all"
              >
                <span>Edit Host Settings</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#161b22] border-t border-slate-800 text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-slate-500" />
            <span>Target:</span>
            <span className="text-slate-200 font-mono font-medium">
              {activeSession?.host}:{activeSession?.port}
            </span>
          </span>

          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <span>Protocol:</span>
            <span className="text-emerald-400 font-semibold font-mono">RFB 3.8 (noVNC)</span>
          </span>

          <span className="flex items-center gap-1.5">
            <MousePointer className="w-3.5 h-3.5 text-slate-500" />
            <span>Mode:</span>
            <span className="text-slate-200">
              {activeSession?.viewOnly ? 'View-Only (Observer)' : 'Full Interactive Control'}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-500">In-Built WebSocket RFB Tunnel</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </div>
      </div>

      {/* New / Edit VNC Connection Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-md bg-[#161b22] border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-scaleUp">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700 bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Add VNC Host Connection</h3>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="p-5 space-y-4 text-xs">
              {/* Display Name */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Session Label</label>
                <input
                  type="text"
                  placeholder="e.g. Ubuntu VNC Server, Proxmox VM, Mac Desktop"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              {/* Host & Port */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">
                    Hostname / IP <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="127.0.0.1 or 192.168.1.100"
                    value={formHost}
                    onChange={(e) => setFormHost(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Port</label>
                  <input
                    type="number"
                    value={formPort}
                    onChange={(e) => setFormPort(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* VNC Password */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  VNC Password <span className="text-slate-500 font-normal">(if configured)</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Leave blank if no authentication"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 outline-none focus:border-emerald-500 font-mono"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="viewOnlyCheck"
                  checked={formViewOnly}
                  onChange={(e) => setFormViewOnly(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                />
                <label htmlFor="viewOnlyCheck" className="text-slate-300 cursor-pointer">
                  View-only mode (prevent mouse and keyboard interaction)
                </label>
              </div>

              {/* Quick Presets */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[11px] text-slate-500 block mb-1.5">Common Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setFormName('Local VNC (Display :0)');
                      setFormHost('127.0.0.1');
                      setFormPort(5900);
                    }}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] transition-colors"
                  >
                    127.0.0.1:5900 (:0)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormName('Linux Display :1');
                      setFormHost('127.0.0.1');
                      setFormPort(5901);
                    }}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] transition-colors"
                  >
                    127.0.0.1:5901 (:1)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormName('Proxmox / QEMU VNC');
                      setFormHost('192.168.1.100');
                      setFormPort(5900);
                    }}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] transition-colors"
                  >
                    Proxmox / KVM
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-medium shadow-md transition-colors"
                >
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemoteDesktopView;
