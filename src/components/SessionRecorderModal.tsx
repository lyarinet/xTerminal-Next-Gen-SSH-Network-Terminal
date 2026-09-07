import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Terminal,
  Clock,
  Search,
  CheckCircle2,
  Calendar,
  X,
  Volume2,
  FastForward,
  Filter,
  Trash2,
  Upload,
  Film,
  Sparkles,
  ChevronRight,
  List
} from 'lucide-react';
import { SessionRecording, RecordingEvent } from '../types';

interface SessionRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  recording?: SessionRecording;
}

export const SessionRecorderModal: React.FC<SessionRecorderModalProps> = ({
  isOpen,
  onClose,
  recording: initialRecording,
}) => {
  const [savedRecordings, setSavedRecordings] = useState<SessionRecording[]>([]);
  const [currentRecording, setCurrentRecording] = useState<SessionRecording | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTimeMs, setPlaybackTimeMs] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);
  const [searchFilter, setSearchFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // xterm.js terminal instance & fit addon
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const lastPlayedMsRef = useRef<number>(0);
  const currentRecordingRef = useRef<SessionRecording | null>(null);
  currentRecordingRef.current = currentRecording;

  // Load recordings from localStorage whenever modal opens or initialRecording changes
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setPlaybackTimeMs(0);
      return;
    }

    try {
      const stored = localStorage.getItem('xterminal_session_recordings');
      const list: SessionRecording[] = stored ? JSON.parse(stored) : [];
      setSavedRecordings(list);

      if (initialRecording) {
        setCurrentRecording(initialRecording);
      } else if (list.length > 0) {
        setCurrentRecording(list[0]);
      } else {
        setCurrentRecording(null);
      }
    } catch {
      setSavedRecordings([]);
    }
  }, [isOpen, initialRecording]);

  const totalDurationMs = (currentRecording?.durationSeconds ?? 0) * 1000;

  // Initialize xterm.js terminal instance inside modal
  useEffect(() => {
    if (!isOpen || !terminalContainerRef.current) return;

    if (!termRef.current) {
      const term = new XTerm({
        theme: {
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
        fontSize: 13,
        fontFamily: 'Consolas, "Liberation Mono", Menlo, Courier, monospace',
        cursorBlink: true,
        disableStdin: true,
        convertEol: true,
        scrollback: 10000,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalContainerRef.current);
      termRef.current = term;
      fitAddonRef.current = fitAddon;

      setTimeout(() => {
        try {
          fitAddon.fit();
        } catch {}
      }, 50);
    } else {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
        } catch {}
      }, 50);
    }

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddonRef.current?.fit();
      } catch {}
    });

    if (terminalContainerRef.current) {
      resizeObserver.observe(terminalContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [isOpen, isHistoryOpen]);

  // Clean up xterm instance when modal is closed
  useEffect(() => {
    if (!isOpen) {
      termRef.current?.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
      lastPlayedMsRef.current = 0;
    }
  }, [isOpen]);

  // Replay Synchronizer: feeds terminal stream chunks into xterm.js
  const syncTerminalToTime = useCallback((targetMs: number, forceReset = false) => {
    const term = termRef.current;
    const rec = currentRecordingRef.current;
    if (!term || !rec) return;

    const events = rec.events || [];
    const hasOut = events.some((e) => e.type === 'out');

    if (forceReset || targetMs < lastPlayedMsRef.current) {
      term.reset();
      lastPlayedMsRef.current = 0;
      for (const evt of events) {
        if (evt.timeMs > targetMs) break;
        if (hasOut ? evt.type === 'out' : true) {
          term.write(evt.data);
        }
      }
      lastPlayedMsRef.current = targetMs;
      return;
    }

    // Incremental write between last played timestamp and targetMs
    for (const evt of events) {
      if (evt.timeMs > lastPlayedMsRef.current && evt.timeMs <= targetMs) {
        if (hasOut ? evt.type === 'out' : true) {
          term.write(evt.data);
        }
      }
    }
    lastPlayedMsRef.current = targetMs;
  }, []);

  // When recording changes, reset terminal and sync to 0
  useEffect(() => {
    if (currentRecording && termRef.current) {
      termRef.current.reset();
      lastPlayedMsRef.current = 0;
      setPlaybackTimeMs(0);
      setIsPlaying(false);
      syncTerminalToTime(0, true);
    }
  }, [currentRecording, syncTerminalToTime]);

  // Real-time playback timer (50ms tick interval)
  useEffect(() => {
    let timer: any;
    if (isPlaying && totalDurationMs > 0) {
      const intervalMs = 50;
      timer = setInterval(() => {
        setPlaybackTimeMs((prev) => {
          const next = prev + intervalMs * playbackSpeed;
          if (next >= totalDurationMs) {
            setIsPlaying(false);
            syncTerminalToTime(totalDurationMs);
            return totalDurationMs;
          }
          syncTerminalToTime(next);
          return next;
        });
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, totalDurationMs, syncTerminalToTime]);

  if (!isOpen) return null;

  const handleSelectRecording = (rec: SessionRecording) => {
    setCurrentRecording(rec);
    setPlaybackTimeMs(0);
    setIsPlaying(false);
    lastPlayedMsRef.current = 0;
    termRef.current?.reset();
    setIsHistoryOpen(false);
  };

  const handleDeleteRecording = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedRecordings.filter((r) => r.id !== id);
    setSavedRecordings(updated);
    try {
      localStorage.setItem('xterminal_session_recordings', JSON.stringify(updated));
    } catch {}
    if (currentRecording?.id === id) {
      setCurrentRecording(updated[0] || null);
      setPlaybackTimeMs(0);
      setIsPlaying(false);
      lastPlayedMsRef.current = 0;
      termRef.current?.reset();
    }
  };

  const handleRestart = () => {
    setPlaybackTimeMs(0);
    lastPlayedMsRef.current = 0;
    termRef.current?.reset();
    syncTerminalToTime(0, true);
    setIsPlaying(true);
  };

  const handleLoadDemoRecording = () => {
    const demo: SessionRecording = {
      id: `demo-${Date.now()}`,
      title: 'Ubuntu Gateway Server Diagnostics',
      hostName: 'prod-gateway.corp.internal',
      username: 'admin',
      createdAt: new Date().toISOString(),
      durationSeconds: 10,
      commandCount: 3,
      events: [
        { timeMs: 100, type: 'out', data: '\x1b[32;1madmin@prod-gateway\x1b[0m:\x1b[34;1m~\x1b[0m$ ' },
        { timeMs: 500, type: 'out', data: 'u' },
        { timeMs: 650, type: 'out', data: 'n' },
        { timeMs: 750, type: 'out', data: 'a' },
        { timeMs: 850, type: 'out', data: 'm' },
        { timeMs: 950, type: 'out', data: 'e' },
        { timeMs: 1050, type: 'out', data: ' -a\r\n' },
        { timeMs: 1400, type: 'out', data: 'Linux prod-gateway 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux\r\n\r\n' },
        { timeMs: 2000, type: 'out', data: '\x1b[32;1madmin@prod-gateway\x1b[0m:\x1b[34;1m~\x1b[0m$ ' },
        { timeMs: 2500, type: 'out', data: 'u' },
        { timeMs: 2600, type: 'out', data: 'p' },
        { timeMs: 2700, type: 'out', data: 't' },
        { timeMs: 2800, type: 'out', data: 'i' },
        { timeMs: 2900, type: 'out', data: 'm' },
        { timeMs: 3000, type: 'out', data: 'e\r\n' },
        { timeMs: 3300, type: 'out', data: ' 14:22:05 up 42 days,  3:18,  2 users,  load average: 0.14, 0.08, 0.05\r\n\r\n' },
        { timeMs: 4000, type: 'out', data: '\x1b[32;1madmin@prod-gateway\x1b[0m:\x1b[34;1m~\x1b[0m$ ' },
        { timeMs: 4500, type: 'out', data: 'netstat -tuln | grep 3000\r\n' },
        { timeMs: 5000, type: 'out', data: 'tcp        0      0 127.0.0.1:3000          0.0.0.0:*               LISTEN\r\n\r\n' },
        { timeMs: 5800, type: 'out', data: '\x1b[32;1madmin@prod-gateway\x1b[0m:\x1b[34;1m~\x1b[0m$ ' },
        { timeMs: 6300, type: 'out', data: 'echo "[xTerminal] System status: OPTIMAL"\r\n' },
        { timeMs: 6700, type: 'out', data: '\x1b[32;1m[xTerminal] System status: OPTIMAL\x1b[0m\r\n\r\n' },
        { timeMs: 7500, type: 'out', data: '\x1b[32;1madmin@prod-gateway\x1b[0m:\x1b[34;1m~\x1b[0m$ ' },
      ],
    };

    const updated = [demo, ...savedRecordings];
    setSavedRecordings(updated);
    try {
      localStorage.setItem('xterminal_session_recordings', JSON.stringify(updated));
    } catch {}
    setCurrentRecording(demo);
    setPlaybackTimeMs(0);
    setIsPlaying(true);
  };

  const handleImportCastFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        let title = file.name.replace(/\.(cast|json)$/i, '');
        let events: RecordingEvent[] = [];
        let durationSeconds = 0;

        // Try parsing JSON format or line-by-line Asciinema v2 format
        if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
          const parsed = JSON.parse(text);
          if (parsed.events && Array.isArray(parsed.events)) {
            title = parsed.title || title;
            events = parsed.events.map((ev: any) => {
              if (Array.isArray(ev)) {
                return {
                  timeMs: Math.round(Number(ev[0]) * 1000),
                  type: ev[1] === 'o' ? 'out' : 'in',
                  data: String(ev[2] || ''),
                };
              }
              return ev;
            });
          }
        } else {
          // Line-by-line Asciinema v2
          const lines = text.split(/\r?\n/).filter(Boolean);
          for (let i = 0; i < lines.length; i++) {
            try {
              const lineJson = JSON.parse(lines[i]);
              if (i === 0 && lineJson.version) {
                if (lineJson.title) title = lineJson.title;
              } else if (Array.isArray(lineJson) && lineJson.length >= 3) {
                events.push({
                  timeMs: Math.round(Number(lineJson[0]) * 1000),
                  type: lineJson[1] === 'o' ? 'out' : 'in',
                  data: String(lineJson[2] || ''),
                });
              }
            } catch {}
          }
        }

        if (events.length > 0) {
          const maxMs = Math.max(...events.map((e) => e.timeMs));
          durationSeconds = Math.max(1, Math.ceil(maxMs / 1000));

          const importedRec: SessionRecording = {
            id: `rec-import-${Date.now()}`,
            title,
            hostName: 'imported-file',
            username: 'user',
            createdAt: new Date().toISOString(),
            durationSeconds,
            commandCount: events.filter((e) => e.type === 'in').length,
            events,
          };

          const updated = [importedRec, ...savedRecordings];
          setSavedRecordings(updated);
          localStorage.setItem('xterminal_session_recordings', JSON.stringify(updated));
          setCurrentRecording(importedRec);
          setPlaybackTimeMs(0);
          setIsPlaying(false);
        }
      } catch (err) {
        console.error('Failed to import .cast recording:', err);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setPlaybackTimeMs(val);
    syncTerminalToTime(val, true);
  };

  const handleExportAsciinema = () => {
    if (!currentRecording) return;
    const castHeader = {
      version: 2,
      width: 100,
      height: 30,
      timestamp: Math.floor(new Date(currentRecording.createdAt).getTime() / 1000),
      title: currentRecording.title,
    };
    const lines = [
      JSON.stringify(castHeader),
      ...currentRecording.events.map((e) =>
        JSON.stringify([Number((e.timeMs / 1000).toFixed(3)), e.type === 'out' ? 'o' : 'i', e.data])
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'application/x-asciinema' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentRecording.title.replace(/\s+/g, '-').toLowerCase()}.cast`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatSeconds = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // If no recording is selected and history is empty, show modern empty state with demo & import
  if (!currentRecording && savedRecordings.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportCastFile}
          accept=".cast,.json"
          className="hidden"
        />
        <div className="w-full max-w-lg bg-[#141416] border border-[#2C2C2E] rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/5">
            <Terminal className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Session Recorder & Replay</h3>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              You haven't recorded any terminal sessions yet. Click the <span className="text-red-400 font-bold font-mono">● Record</span> button in the active terminal toolbar anytime to capture full keystrokes and output.
            </p>
          </div>

          <div className="w-full grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleLoadDemoRecording}
              className="py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Load Demo Session</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl bg-[#222224] hover:bg-[#2C2C2E] text-gray-200 border border-[#333336] text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Import .cast File</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 px-4 rounded-lg bg-[#1A1A1C] hover:bg-[#222224] text-gray-400 hover:text-white text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Filter events up to current playback time
  const visibleEvents = (currentRecording?.events || [])
    .filter((e) => e.timeMs <= playbackTimeMs)
    .filter((e) => !searchFilter || e.data.toLowerCase().includes(searchFilter.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportCastFile}
        accept=".cast,.json"
        className="hidden"
      />

      <div className="w-full max-w-5xl bg-[#141416] border border-[#2C2C2E] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#222224] bg-[#18181A] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <span>{currentRecording?.title || 'Recorded Session'}</span>
                {currentRecording && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#222224] text-gray-400 font-mono">
                    {currentRecording.username}@{currentRecording.hostName}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400">
                Asciinema v2 format • {savedRecordings.length} session{savedRecordings.length === 1 ? '' : 's'} recorded
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Recordings List Drawer Toggle */}
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                isHistoryOpen
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-[#222224] hover:bg-[#2C2C2E] text-gray-300 border-[#333336]'
              }`}
              title="View all recorded sessions"
            >
              <List className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recordings ({savedRecordings.length})</span>
            </button>

            {/* Import .cast */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-[#222224] hover:bg-[#2C2C2E] text-gray-300 text-xs flex items-center gap-1.5 transition-colors border border-[#333336]"
              title="Import Asciinema .cast file"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Import</span>
            </button>

            {/* Export .cast */}
            {currentRecording && (
              <button
                onClick={handleExportAsciinema}
                className="px-3 py-1.5 rounded-lg bg-[#222224] hover:bg-[#2C2C2E] text-gray-300 text-xs flex items-center gap-1.5 transition-colors border border-[#333336]"
                title="Export as Asciinema v2 .cast"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#222224] transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Layout with optional Recordings Sidebar */}
        <div className="flex-1 flex overflow-hidden min-h-[380px]">
          {/* Recordings History Sidebar */}
          {isHistoryOpen && (
            <div className="w-72 bg-[#121214] border-r border-[#222224] flex flex-col p-3 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-[#222224] text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <span>Saved Replays</span>
                <span>{savedRecordings.length}</span>
              </div>
              {savedRecordings.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500">No sessions saved.</div>
              ) : (
                savedRecordings.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => handleSelectRecording(rec)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-start justify-between group ${
                      currentRecording?.id === rec.id
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                        : 'bg-[#18181A] border-[#222224] hover:bg-[#202022] text-gray-300'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold truncate">{rec.title}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">
                        {rec.username}@{rec.hostName}
                      </div>
                      <div className="text-[10px] text-emerald-400/80 mt-1 font-mono">
                        {formatSeconds(rec.durationSeconds * 1000)} • {rec.events.length} events
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteRecording(rec.id, e)}
                      className="p-1 text-gray-500 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete recording"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Real Full-Screen xterm.js Terminal Replay Screen */}
          <div className="flex-1 bg-[#0A0A0B] relative flex flex-col overflow-hidden select-text p-2 min-h-[400px]">
            <div
              ref={terminalContainerRef}
              className="flex-1 w-full h-full overflow-hidden"
              style={{ minHeight: '400px' }}
            />
          </div>
        </div>

        {/* Timeline Player Scrubber & Controls */}
        <div className="p-4 bg-[#111112] space-y-3 border-t border-[#1C1C1E]">
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-gray-400 w-12 text-right">
              {formatSeconds(playbackTimeMs)}
            </span>
            <input
              type="range"
              min={0}
              max={totalDurationMs || 100}
              value={playbackTimeMs}
              onChange={handleSeek}
              className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-[#222224] rounded-lg"
            />
            <span className="text-xs font-mono text-gray-400 w-12">
              {formatSeconds(totalDurationMs)}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
              </button>

              <button
                onClick={handleRestart}
                className="p-2 rounded-lg bg-[#1C1C1E] hover:bg-[#252528] text-gray-400 hover:text-white border border-[#222224] transition-colors cursor-pointer"
                title="Restart from beginning"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1 bg-[#1C1C1E] p-1 rounded-lg border border-[#222224] text-xs">
                {[1, 2, 4].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed as any)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                      playbackSpeed === speed
                        ? 'bg-emerald-500 text-black font-bold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              {/* Quick Search in Replay */}
              <div className="relative ml-2">
                <Search className="w-3 h-3 text-gray-500 absolute left-2 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter replay output..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-7 pr-2 py-1 rounded-md bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 placeholder-gray-500 focus:outline-hidden focus:border-emerald-500 w-44 font-sans"
                />
              </div>
            </div>

            <div className="text-xs text-gray-500 font-mono">
              Events: {(currentRecording?.events || []).filter((e) => e.timeMs <= playbackTimeMs).length} / {currentRecording?.events?.length || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
