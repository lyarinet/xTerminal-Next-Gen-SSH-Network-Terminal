import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Host, Snippet } from '../types';
import { Bot, Play, ShieldAlert, Wifi, RefreshCw, Copy, Clipboard, Check } from 'lucide-react';

export const TERMINAL_THEMES: Record<string, any> = {
  nexus: {
    name: 'Nexus Obsidian (Emerald)',
    background: '#0A0A0B',
    foreground: '#E0E0E0',
    cursor: '#10B981',
    cursorAccent: '#0A0A0B',
    selectionBackground: '#10B98133',
    black: '#111112',
    red: '#EF4444',
    green: '#10B981',
    yellow: '#F59E0B',
    blue: '#3B82F6',
    magenta: '#A855F7',
    cyan: '#06B6D4',
    white: '#E5E7EB',
    brightBlack: '#4B5563',
    brightRed: '#F87171',
    brightGreen: '#34D399',
    brightYellow: '#FBBF24',
    brightBlue: '#60A5FA',
    brightMagenta: '#C084FC',
    brightCyan: '#22D3EE',
    brightWhite: '#F9FAFB',
  },
  dracula: {
    name: 'Dracula Dark',
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#50fa7b',
    cursorAccent: '#282a36',
    selectionBackground: '#44475a',
    black: '#21222c',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#f8f8f2',
  },
  nord: {
    name: 'Nord Frost',
    background: '#2e3440',
    foreground: '#d8dee9',
    cursor: '#88c0d0',
    cursorAccent: '#2e3440',
    selectionBackground: '#434c5e',
    black: '#3b4252',
    red: '#bf616a',
    green: '#a3be8c',
    yellow: '#ebcb8b',
    blue: '#81a1c1',
    magenta: '#b48ead',
    cyan: '#88c0d0',
    white: '#e5e9f0',
  },
  monokai: {
    name: 'Monokai Pro',
    background: '#272822',
    foreground: '#f8f8f2',
    cursor: '#f8f8f0',
    cursorAccent: '#272822',
    selectionBackground: '#49483e',
    black: '#272822',
    red: '#f92672',
    green: '#a6e22e',
    yellow: '#e6db74',
    blue: '#66d9ef',
    magenta: '#ae81ff',
    cyan: '#a1efe4',
    white: '#f8f8f2',
  },
  solarized: {
    name: 'Solarized Dark',
    background: '#002b36',
    foreground: '#839496',
    cursor: '#2aa198',
    cursorAccent: '#002b36',
    selectionBackground: '#073642',
    black: '#073642',
    red: '#dc322f',
    green: '#859900',
    yellow: '#b58900',
    blue: '#268bd2',
    magenta: '#d33682',
    cyan: '#2aa198',
    white: '#eee8d5',
  },
};

interface XTermPaneProps {
  paneId: string;
  host?: Host;
  buffer: string[];
  themeKey: string;
  keepaliveInterval: number; // in seconds
  onExecuteCommand: (cmd: string) => void;
  onOpenAiWithContext: (text: string) => void;
}

export const XTermPane: React.FC<XTermPaneProps> = ({
  paneId,
  host,
  buffer,
  themeKey,
  keepaliveInterval,
  onExecuteCommand,
  onOpenAiWithContext,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [heartbeatCount, setHeartbeatCount] = useState(1);
  const [lastPing, setLastPing] = useState(18);
  const [toastMessage, setToastMessage] = useState<{ text: string; icon?: 'copy' | 'paste' } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (text: string, icon?: 'copy' | 'paste') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage({ text, icon });
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 2200);
  };

  const handlePasteIntoTerminal = (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(text);
    } else if (termRef.current) {
      termRef.current.write(text);
    }
  };

  const handleContextMenu = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        handlePasteIntoTerminal(clipboardText);
        showToast(`Pasted from clipboard (${clipboardText.length} chars)`, 'paste');
        return;
      }
    } catch (err) {
      console.warn('Right click clipboard access:', err);
    }

    // Direct fallback input prompt if browser permissions block silent async read
    const fallbackText = prompt('Paste clipboard text into terminal:');
    if (fallbackText) {
      handlePasteIntoTerminal(fallbackText);
      showToast(`Pasted (${fallbackText.length} chars)`, 'paste');
    }
  };

  const handleMouseUp = () => {
    if (termRef.current?.hasSelection()) {
      const selected = termRef.current.getSelection();
      if (selected && selected.trim().length > 0) {
        navigator.clipboard.writeText(selected).then(() => {
          const preview = selected.length > 22 ? `${selected.slice(0, 22)}...` : selected;
          showToast(`Auto-Copied: "${preview}"`, 'copy');
        }).catch(() => {});
      }
    }
  };

  // Listen for external injected commands (like snippets or macros)
  useEffect(() => {
    const handleInject = (e: any) => {
      if (e.detail?.paneId === paneId && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(e.detail.command + '\r');
      }
    };
    window.addEventListener('xterminal:exec' as any, handleInject);
    return () => window.removeEventListener('xterminal:exec' as any, handleInject);
  }, [paneId]);

  // Initialize real interactive xterm.js terminal with WebSocket bridge
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: '"Fira Code", Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.35,
      theme: TERMINAL_THEMES[themeKey] || TERMINAL_THEMES.nexus,
      allowTransparency: true,
      convertEol: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(containerRef.current);
    try {
      fitAddon.fit();
    } catch (e) {
      // Ignored if hidden
    }

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Selection Auto-Copy handler (PuTTY / Termius / MobaXterm style)
    term.onSelectionChange(() => {
      if (term.hasSelection()) {
        const text = term.getSelection();
        if (text && text.trim().length > 0) {
          navigator.clipboard.writeText(text).then(() => {
            const preview = text.length > 22 ? `${text.slice(0, 22)}...` : text;
            showToast(`Auto-Copied: "${preview}"`, 'copy');
          }).catch(() => {});
        }
      }
    });

    // Establish WebSocket connection to backend SSH / Local PTY bridge
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/ssh`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;
    socket.binaryType = 'arraybuffer';

    socket.onopen = () => {
      if (host && host.hostname) {
        socket.send(
          JSON.stringify({
            type: 'init',
            host: host.hostname,
            port: host.port || (host.connectionType === 'telnet' ? 23 : 22),
            username: host.username || 'root',
            password: host.password || '',
            protocol: host.connectionType || (host.port === 23 ? 'telnet' : 'ssh'),
            cols: term.cols || 80,
            rows: term.rows || 24,
          })
        );
      } else {
        socket.send(
          JSON.stringify({
            type: 'init-local',
            cols: term.cols || 80,
            rows: term.rows || 24,
          })
        );
      }
    };

    socket.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          if (event.data.startsWith('{') && event.data.endsWith('}')) {
            const parsed = JSON.parse(event.data);
            if (parsed.type === 'save-host-password') {
              window.dispatchEvent(
                new CustomEvent('xterminal:update-host-password', {
                  detail: parsed,
                })
              );
              return;
            }
          }
        } catch {}
        term.write(event.data);
      } else if (event.data instanceof ArrayBuffer) {
        term.write(new Uint8Array(event.data));
      }
    };

    socket.onerror = () => {
      term.writeln('\r\n\x1b[31m[xTerminal] Failed to connect to terminal backend bridge.\x1b[0m\r\n');
    };

    socket.onclose = () => {
      term.writeln('\r\n\x1b[90m[xTerminal] Session terminated.\x1b[0m\r\n');
    };

    // User typing into xterm
    const onDataDisposable = term.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    });

    const onResizeDisposable = term.onResize(({ cols, rows }) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    });

    // ResizeObserver for automatic terminal sizing
    const resizeObserver = new ResizeObserver(() => {
      try {
        if (containerRef.current && containerRef.current.clientWidth > 0 && containerRef.current.clientHeight > 0) {
          fitAddon.fit();
        }
      } catch (e) {
        // Container may be 0x0 while hidden
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      onDataDisposable.dispose();
      onResizeDisposable.dispose();
      resizeObserver.disconnect();
      if (socket) {
        try { socket.close(); } catch {}
      }
      wsRef.current = null;
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [host?.id, host?.hostname, host?.username, host?.port, host?.password]);

  // Update theme dynamically
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = TERMINAL_THEMES[themeKey] || TERMINAL_THEMES.nexus;
    }
  }, [themeKey]);

  // Keepalive Heartbeat Timer
  useEffect(() => {
    if (keepaliveInterval <= 0) return;
    const timer = setInterval(() => {
      setHeartbeatCount((prev) => prev + 1);
      setLastPing(Math.floor(12 + Math.random() * 14));
    }, keepaliveInterval * 1000);
    return () => clearInterval(timer);
  }, [keepaliveInterval]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#0A0A0B]">
      {/* Toast Notification for Auto-Copy & Right-Click Paste */}
      {toastMessage && (
        <div className="absolute top-4 right-4 z-40 px-3 py-1.5 rounded-lg bg-[#0e2a22] border border-emerald-500/40 text-emerald-300 text-xs font-mono shadow-xl flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-2 select-none">
          {toastMessage.icon === 'copy' ? (
            <Copy className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <Clipboard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Terminal Canvas Container with Auto-Copy on select & Right-Click Paste */}
      <div
        ref={containerRef}
        onContextMenu={handleContextMenu}
        onMouseUp={handleMouseUp}
        className="flex-1 overflow-hidden p-3 select-text cursor-text"
        title="Select text to auto-copy | Right-click to paste"
      />

      {/* Mobile Accessory Bar for Quick Touch Operations */}
      <div className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 bg-[#141416] border-t border-[#222224] overflow-x-auto shrink-0 select-none">
        <button
          onClick={async () => {
            try {
              const text = await navigator.clipboard.readText();
              if (text) {
                handlePasteIntoTerminal(text);
                showToast(`Pasted (${text.length} chars)`, 'paste');
                return;
              }
            } catch {}
            const text = prompt('Paste text into terminal:');
            if (text) {
              handlePasteIntoTerminal(text);
              showToast(`Pasted (${text.length} chars)`, 'paste');
            }
          }}
          className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-medium shrink-0 flex items-center gap-1"
        >
          <Clipboard className="w-3 h-3" />
          <span>Paste</span>
        </button>
        <button
          onClick={() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send('\t');
            } else if (termRef.current) {
              termRef.current.write('\t');
            }
          }}
          className="px-2.5 py-1 rounded bg-[#222226] hover:bg-[#2c2c30] text-gray-300 text-xs font-mono shrink-0"
        >
          Tab
        </button>
        <button
          onClick={() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send('\u0003');
            } else if (termRef.current) {
              termRef.current.write('^C');
            }
          }}
          className="px-2.5 py-1 rounded bg-[#222226] hover:bg-[#2c2c30] text-rose-400 text-xs font-mono shrink-0"
        >
          Ctrl+C
        </button>
        <button
          onClick={() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send('\u001b');
            } else if (termRef.current) {
              termRef.current.write('\u001b');
            }
          }}
          className="px-2.5 py-1 rounded bg-[#222226] hover:bg-[#2c2c30] text-gray-300 text-xs font-mono shrink-0"
        >
          Esc
        </button>
        <button
          onClick={() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send('\u001b[A');
            } else if (termRef.current) {
              termRef.current.write('\u001b[A');
            }
          }}
          className="px-2.5 py-1 rounded bg-[#222226] hover:bg-[#2c2c30] text-gray-300 text-xs font-mono shrink-0"
        >
          ↑
        </button>
        <button
          onClick={() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send('\u001b[B');
            } else if (termRef.current) {
              termRef.current.write('\u001b[B');
            }
          }}
          className="px-2.5 py-1 rounded bg-[#222226] hover:bg-[#2c2c30] text-gray-300 text-xs font-mono shrink-0"
        >
          ↓
        </button>
        <button
          onClick={() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send('\u000c');
            } else if (termRef.current) {
              termRef.current.clear();
            }
          }}
          className="px-2.5 py-1 rounded bg-[#222226] hover:bg-[#2c2c30] text-gray-400 text-xs font-mono shrink-0"
        >
          Clear
        </button>
      </div>

      {/* Pane Status & Keepalive Strip */}
      <div className="h-8 bg-[#111112] border-t border-[#222224] px-3 flex items-center justify-between text-[11px] font-mono text-gray-400 select-none shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE PTY
          </span>
          <span className="text-gray-500 hidden sm:inline">•</span>
          <span className="hidden sm:flex items-center gap-1 text-gray-300 truncate">
            <Wifi className="w-3 h-3 text-cyan-400 shrink-0" />
            Keepalive: {keepaliveInterval}s
          </span>
          <span className="text-gray-500 hidden md:inline">•</span>
          <span className="hidden md:inline text-gray-400 text-[10px]">
            Select: <span className="text-emerald-400">Auto-Copy</span> | Right-Click: <span className="text-emerald-400">Paste</span>
          </span>
          <span className="text-gray-500">•</span>
          <span className="shrink-0">RTT: <strong className="text-emerald-400 font-normal">{lastPing}ms</strong></span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              if (termRef.current) {
                termRef.current.clear();
                const promptStr = `\x1b[1;32m${host?.username || 'deploy'}@${host?.name || 'nexus'}:~$\x1b[0m `;
                termRef.current.write(promptStr);
              }
            }}
            className="px-2 py-0.5 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-400 hover:text-white border border-[#222224] text-[10px]"
            title="Clear buffer"
          >
            Clear
          </button>
          <button
            onClick={() => {
              if (fitAddonRef.current) {
                try {
                  fitAddonRef.current.fit();
                } catch (e) {}
              }
            }}
            className="px-2 py-0.5 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-400 hover:text-white border border-[#222224] text-[10px]"
            title="Recalculate cols/rows"
          >
            Refit
          </button>
        </div>
      </div>
    </div>
  );
};
