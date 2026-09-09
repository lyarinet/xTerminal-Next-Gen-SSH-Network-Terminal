import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Menu, Plus, RefreshCw, Clipboard, Server, Terminal as TerminalIcon, X } from 'lucide-react';
import { getBackendWsUrl, isMobileApp, getStoredBackendUrl } from '../lib/networkConfig';

interface TermuxSession {
  id: string;
  title: string;
}

interface TermuxEmulatorViewProps {
  onOpenMenu?: () => void;
  onOpenSsh?: () => void;
  onOpenQuickConnect?: () => void;
}

export const TermuxEmulatorView: React.FC<TermuxEmulatorViewProps> = ({
  onOpenMenu,
  onOpenSsh,
  onOpenQuickConnect,
}) => {
  const [sessions, setSessions] = useState<TermuxSession[]>([
    { id: 'session-1', title: 'Session 1' },
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>('session-1');

  // Sticky modifier keys
  const [isCtrlActive, setIsCtrlActive] = useState(false);
  const [isAltActive, setIsAltActive] = useState(false);
  const isCtrlActiveRef = useRef(false);
  const isAltActiveRef = useRef(false);
  isCtrlActiveRef.current = isCtrlActive;
  isAltActiveRef.current = isAltActive;

  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (text: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(text);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 2000);
  };

  const sendKeySequence = (key: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(key);
    } else if (termRef.current) {
      termRef.current.write(key);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        sendKeySequence(text);
        showToast(`Pasted (${text.length} chars)`);
        return;
      }
    } catch {}
    const text = prompt('Paste text into terminal:');
    if (text) {
      sendKeySequence(text);
      showToast(`Pasted (${text.length} chars)`);
    }
  };

  const handleNewSession = () => {
    const nextNum = sessions.length + 1;
    const newId = `session-${Date.now()}`;
    const newSession: TermuxSession = {
      id: newId,
      title: `Session ${nextNum}`,
    };
    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newId);
  };

  const handleCloseSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) return;
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (activeSessionId === id) {
      setActiveSessionId(remaining[remaining.length - 1].id);
    }
  };

  // Terminal lifecycle
  useEffect(() => {
    if (!containerRef.current) return;

    // Termux aesthetic: Crisp green/white font on pitch-black background
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: '"Fira Code", monospace, "Courier New"',
      fontSize: 13,
      lineHeight: 1.3,
      theme: {
        background: '#000000',
        foreground: '#E0E0E0',
        cursor: '#50FA7B',
        cursorAccent: '#000000',
        selectionBackground: '#44475A',
        black: '#000000',
        red: '#FF5555',
        green: '#50FA7B',
        yellow: '#F1FA8C',
        blue: '#8BE9FD',
        magenta: '#FF79C6',
        cyan: '#8BE9FD',
        white: '#BFBFBF',
      },
      convertEol: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);

    try {
      fitAddon.fit();
    } catch {}

    // Android IME configuration
    const helperTextarea = containerRef.current.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement;
    if (helperTextarea) {
      helperTextarea.setAttribute('autocapitalize', 'none');
      helperTextarea.setAttribute('autocorrect', 'off');
      helperTextarea.setAttribute('autocomplete', 'off');
      helperTextarea.setAttribute('spellcheck', 'false');
      helperTextarea.setAttribute('enterkeyhint', 'go');
      helperTextarea.setAttribute('inputmode', 'url');
      helperTextarea.addEventListener('compositionupdate', (e) => e.stopPropagation());
      helperTextarea.addEventListener('compositionend', () => { helperTextarea.value = ''; });
    }

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    let autoRetryAttempts = 0;

    const connectShell = (isReconnect = false) => {
      if (wsRef.current) {
        try {
          wsRef.current.onclose = null;
          wsRef.current.onerror = null;
          wsRef.current.close();
        } catch {}
        wsRef.current = null;
      }

      if (isReconnect) {
        term.writeln('\r\n\x1b[33m[xTerminal] 🔄 Reconnecting local Android shell...\x1b[0m\r\n');
      }

      const wsUrl = getBackendWsUrl('/ws/ssh');
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;
      socket.binaryType = 'arraybuffer';

      socket.onopen = () => {
        autoRetryAttempts = 0;
        if (isReconnect) {
          term.writeln('\x1b[32m✔ Connected to local station.\x1b[0m\r\n');
        }
        socket.send(
          JSON.stringify({
            type: 'init-local',
            cols: term.cols || 80,
            rows: term.rows || 24,
          })
        );
      };

      socket.onmessage = (event) => {
        if (typeof event.data === 'string') {
          term.write(event.data);
        } else if (event.data instanceof ArrayBuffer) {
          term.write(new Uint8Array(event.data));
        }
      };

      socket.onerror = () => {
        if (isMobileApp() && autoRetryAttempts < 3) {
          autoRetryAttempts++;
          setTimeout(() => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
              connectShell(false);
            }
          }, 800);
          return;
        }
        term.writeln(`\r\n\x1b[31m[xTerminal] Local shell bridge not reachable at ${wsUrl}.\x1b[0m\r\n`);
      };

      socket.onclose = () => {
        if (autoRetryAttempts > 0 && autoRetryAttempts <= 3) return;
        term.writeln('\r\n\x1b[90m[xTerminal] Session closed. Tap 🔄 to restart shell.\x1b[0m\r\n');
      };
    };

    connectShell(false);

    // Keystroke handler with sticky CTRL / ALT
    const onDataDisposable = term.onData((data) => {
      let finalData = data;
      if (isCtrlActiveRef.current) {
        setIsCtrlActive(false);
        const code = data.charCodeAt(0);
        if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
          finalData = String.fromCharCode(code & 0x1f);
        }
      } else if (isAltActiveRef.current) {
        setIsAltActive(false);
        finalData = '\u001b' + data;
      }

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(finalData);
      }
    });

    const onResizeDisposable = term.onResize(({ cols, rows }) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      try {
        if (containerRef.current && containerRef.current.clientWidth > 0) {
          fitAddon.fit();
        }
      } catch {}
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      onDataDisposable.dispose();
      onResizeDisposable.dispose();
      resizeObserver.disconnect();
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
      }
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [activeSessionId]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#000000] text-[#E0E0E0] overflow-hidden select-none font-mono relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-12 right-3 z-50 px-3 py-1.5 rounded-md bg-[#102A1E] border border-emerald-500/50 text-emerald-300 text-xs shadow-xl animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* Slim Termux Header */}
      <header className="h-10 bg-[#0A0A0A] border-b border-[#222224] px-2 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onOpenMenu}
            className="p-1.5 rounded-md bg-[#161618] text-gray-300 hover:text-white border border-[#262628] active:scale-95"
            aria-label="Open Menu Drawer"
            title="Open Drawer (Hosts, SFTP, Settings)"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 font-bold text-xs text-white truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">Termux</span>
            <span className="text-[10px] text-gray-500 hidden sm:inline font-normal">(/system/bin/sh)</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (termRef.current) {
                termRef.current.writeln('\r\n\x1b[33m[xTerminal] Restarting shell station...\x1b[0m');
                termRef.current.clear();
              }
              setActiveSessionId((prev) => `${prev.split('-')[0]}-${Date.now()}`);
            }}
            className="p-1.5 rounded-md bg-[#161618] text-gray-300 hover:text-emerald-400 hover:bg-[#202022] border border-[#262628] active:scale-95"
            title="Restart / Reconnect Shell"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNewSession}
            className="p-1.5 rounded-md bg-[#161618] text-gray-300 hover:text-white hover:bg-[#202022] border border-[#262628] active:scale-95"
            title="New Terminal Session"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onOpenSsh || onOpenQuickConnect}
            className="px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1 active:scale-95 shadow-xs"
            title="Switch to SSH Workstation or connect to remote server"
          >
            <Server className="w-3 h-3" />
            <span>SSH</span>
          </button>
        </div>
      </header>

      {/* Multi-Session Tab Strip (Visible only when 2+ sessions open) */}
      {sessions.length > 1 && (
        <div className="flex items-center gap-1 px-2 pt-1 bg-[#0D0D0F] border-b border-[#222224] overflow-x-auto shrink-0 select-none">
          {sessions.map((sess) => {
            const isSelected = sess.id === activeSessionId;
            return (
              <div
                key={sess.id}
                onClick={() => setActiveSessionId(sess.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-t-md text-xs font-mono font-medium cursor-pointer transition-all border-t border-x ${
                  isSelected
                    ? 'bg-[#000000] text-emerald-400 border-[#2A2A2E]'
                    : 'bg-[#141416] text-gray-400 border-transparent hover:text-white'
                }`}
              >
                <TerminalIcon className="w-3 h-3 text-emerald-400" />
                <span>{sess.title}</span>
                <button
                  type="button"
                  onClick={(e) => handleCloseSession(sess.id, e)}
                  className="p-0.5 rounded text-gray-500 hover:text-white hover:bg-[#252528] ml-1"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Full-Screen Terminal Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden select-text cursor-text relative bg-[#000000] p-1.5"
      />

      {/* Termux Accessory Keyboard Bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[#0D0D0F] border-t border-[#222224] overflow-x-auto scrollbar-none shrink-0 select-none">
        <button
          type="button"
          onClick={() => sendKeySequence('\u001b')}
          className="px-2.5 py-1 rounded bg-[#1C1C1E] hover:bg-[#262628] active:scale-95 text-gray-200 text-xs font-mono font-semibold shrink-0"
        >
          ESC
        </button>
        <button
          type="button"
          onClick={() => sendKeySequence('\t')}
          className="px-2.5 py-1 rounded bg-[#1C1C1E] hover:bg-[#262628] active:scale-95 text-gray-200 text-xs font-mono font-semibold shrink-0"
        >
          TAB
        </button>
        <button
          type="button"
          onClick={() => setIsCtrlActive((prev) => !prev)}
          className={`px-2.5 py-1 rounded text-xs font-mono font-bold shrink-0 transition-colors active:scale-95 ${
            isCtrlActive
              ? 'bg-emerald-500 text-black shadow-xs ring-2 ring-emerald-400'
              : 'bg-[#1C1C1E] hover:bg-[#262628] text-emerald-400 border border-emerald-500/30'
          }`}
          title="Sticky Ctrl modifier (tap CTRL then any letter e.g. C to send ^C)"
        >
          CTRL
        </button>
        <button
          type="button"
          onClick={() => setIsAltActive((prev) => !prev)}
          className={`px-2.5 py-1 rounded text-xs font-mono font-bold shrink-0 transition-colors active:scale-95 ${
            isAltActive
              ? 'bg-cyan-500 text-black shadow-xs ring-2 ring-cyan-400'
              : 'bg-[#1C1C1E] hover:bg-[#262628] text-cyan-400 border border-cyan-500/30'
          }`}
          title="Sticky Alt modifier"
        >
          ALT
        </button>
        <button
          type="button"
          onClick={() => sendKeySequence('\u0003')}
          className="px-2.5 py-1 rounded bg-[#1C1C1E] hover:bg-[#262628] active:scale-95 text-rose-400 text-xs font-mono font-bold shrink-0"
          title="Send Ctrl+C"
        >
          ^C
        </button>
        <button
          type="button"
          onClick={() => sendKeySequence('-')}
          className="w-7 py-1 rounded bg-[#1C1C1E] hover:bg-[#262628] active:scale-95 text-gray-200 text-xs font-mono font-semibold text-center shrink-0"
        >
          -
        </button>
        <button
          type="button"
          onClick={() => sendKeySequence('/')}
          className="w-7 py-1 rounded bg-[#1C1C1E] hover:bg-[#262628] active:scale-95 text-gray-200 text-xs font-mono font-semibold text-center shrink-0"
        >
          /
        </button>
        <button
          type="button"
          onClick={() => sendKeySequence('|')}
          className="w-7 py-1 rounded bg-[#1C1C1E] hover:bg-[#262628] active:scale-95 text-gray-200 text-xs font-mono font-semibold text-center shrink-0"
        >
          |
        </button>
        <button
          type="button"
          onClick={() => sendKeySequence('~')}
          className="w-7 py-1 rounded bg-[#1C1C1E] hover:bg-[#262628] active:scale-95 text-gray-200 text-xs font-mono font-semibold text-center shrink-0"
        >
          ~
        </button>
        <button
          type="button"
          onClick={() => sendKeySequence('\u001b[A')}
          className="w-7 py-1 rounded bg-[#1C1C1E] hover:bg-[#262628] active:scale-95 text-gray-200 text-xs font-mono font-bold text-center shrink-0"
          title="Arrow Up (History)"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => sendKeySequence('\u001b[B')}
          className="w-7 py-1 rounded bg-[#1C1C1E] hover:bg-[#262628] active:scale-95 text-gray-200 text-xs font-mono font-bold text-center shrink-0"
          title="Arrow Down (History)"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => sendKeySequence('\u001b[D')}
          className="w-7 py-1 rounded bg-[#1C1C1E] hover:bg-[#262628] active:scale-95 text-gray-200 text-xs font-mono font-bold text-center shrink-0"
          title="Arrow Left"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => sendKeySequence('\u001b[C')}
          className="w-7 py-1 rounded bg-[#1C1C1E] hover:bg-[#262628] active:scale-95 text-gray-200 text-xs font-mono font-bold text-center shrink-0"
          title="Arrow Right"
        >
          →
        </button>
        <button
          type="button"
          onClick={handlePaste}
          className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-medium shrink-0 flex items-center gap-1"
          title="Paste from clipboard"
        >
          <Clipboard className="w-3 h-3" />
          <span>Paste</span>
        </button>
      </div>
    </div>
  );
};
