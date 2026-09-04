import React, { useState, useEffect, useRef } from 'react';
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
  Filter
} from 'lucide-react';
import { SessionRecording } from '../types';

interface SessionRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  recording?: SessionRecording;
}

export const SessionRecorderModal: React.FC<SessionRecorderModalProps> = ({
  isOpen,
  onClose,
  recording,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTimeMs, setPlaybackTimeMs] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);
  const [searchFilter, setSearchFilter] = useState('');

  const totalDurationMs = (recording?.durationSeconds ?? 0) * 1000;

  useEffect(() => {
    let timer: any;
    if (isPlaying && totalDurationMs > 0) {
      timer = setInterval(() => {
        setPlaybackTimeMs((prev) => {
          const next = prev + 100 * playbackSpeed;
          if (next >= totalDurationMs) {
            setIsPlaying(false);
            return totalDurationMs;
          }
          return next;
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, totalDurationMs]);

  if (!isOpen) return null;

  if (!recording) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
        <div className="w-full max-w-md bg-[#141416] border border-[#2C2C2E] rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No Session Recording Loaded</h3>
            <p className="text-xs text-gray-400 mt-1">
              Start and complete a terminal recording session to view, inspect, and export terminal replays here.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2 px-4 rounded-lg bg-[#222224] hover:bg-[#2C2C2E] text-white text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Filter events up to current playback time
  const visibleEvents = (recording.events || []).filter((e) => e.timeMs <= playbackTimeMs);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaybackTimeMs(Number(e.target.value));
  };

  const handleExportAsciinema = () => {
    const castData = {
      version: 2,
      width: 100,
      height: 30,
      timestamp: Math.floor(Date.now() / 1000),
      title: recording.title,
      events: recording.events.map((e) => [e.timeMs / 1000, e.type === 'out' ? 'o' : 'i', e.data]),
    };
    const blob = new Blob([JSON.stringify(castData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recording.title.replace(/\s+/g, '-').toLowerCase()}.cast`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatSeconds = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-4xl bg-[#141416] border border-[#2C2C2E] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#222224] bg-[#18181A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-2">
                {recording.title}
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#222224] text-gray-400 font-mono">
                  {recording.username}@{recording.hostName}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                Recorded session timeline playback (Asciinema v2 format compliant)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportAsciinema}
              className="px-3 py-1.5 rounded-lg bg-[#222224] hover:bg-[#2C2C2E] text-gray-300 text-xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .cast</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#222224] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Terminal Screen Simulation */}
        <div className="flex-1 bg-[#0A0A0B] p-4 overflow-y-auto font-mono text-xs text-emerald-400 min-h-[360px] border-b border-[#222224] select-text">
          {visibleEvents.map((evt, idx) => (
            <div key={idx} className="leading-relaxed whitespace-pre-wrap">
              {evt.type === 'in' ? (
                <div className="text-white font-bold my-1">
                  <span className="text-emerald-500 mr-1.5">{recording.username}@{recording.hostName}:~$</span>
                  {evt.data}
                </div>
              ) : (
                <div className="text-gray-300">{evt.data}</div>
              )}
            </div>
          ))}
          {isPlaying && (
            <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-0.5" />
          )}
        </div>

        {/* Timeline Player Scrubber & Controls */}
        <div className="p-4 bg-[#111112] space-y-3">
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-gray-400 w-10 text-right">
              {formatSeconds(playbackTimeMs)}
            </span>
            <input
              type="range"
              min={0}
              max={totalDurationMs}
              value={playbackTimeMs}
              onChange={handleSeek}
              className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-[#222224] rounded-lg"
            />
            <span className="text-xs font-mono text-gray-400 w-10">
              {formatSeconds(totalDurationMs)}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center font-bold transition-all shadow-md active:scale-95"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
              </button>

              <button
                onClick={() => {
                  setPlaybackTimeMs(0);
                  setIsPlaying(false);
                }}
                className="p-2 rounded-lg bg-[#1C1C1E] hover:bg-[#252528] text-gray-400 hover:text-white border border-[#222224] transition-colors"
                title="Restart"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1 bg-[#1C1C1E] p-1 rounded-lg border border-[#222224] text-xs">
                {[1, 2, 4].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed as any)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                      playbackSpeed === speed
                        ? 'bg-emerald-500 text-black font-bold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-gray-500 font-mono">
              Events: {visibleEvents.length} / {recording.events.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
