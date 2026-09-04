import React, { useState, useEffect } from 'react';
import {
  Server,
  Terminal,
  Radio,
  ShieldCheck,
  Zap,
  Activity,
  ArrowUpRight,
  Clock,
  HardDrive,
  Cpu,
  Bot,
  AlertTriangle,
  FolderSync,
  Star,
  Play,
  Pause,
  RotateCcw,
  X,
  CheckCircle2,
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  RefreshCw,
  FolderDown,
  Layers
} from 'lucide-react';
import { Host, PortForward, AuditEvent, VaultSettings, TransferQueueItem } from '../types';

interface DashboardViewProps {
  hosts: Host[];
  activeSessionsCount: number;
  portForwards: PortForward[];
  vaultSettings: VaultSettings;
  auditEvents: AuditEvent[];
  transfers: TransferQueueItem[];
  onToggleTransferStatus?: (id: string) => void;
  onCancelTransfer?: (id: string) => void;
  onConnectHost: (host: Host) => void;
  onOpenSftp?: (host: Host) => void;
  onToggleFavorite?: (hostId: string) => void;
  onOpenView: (view: string) => void;
  onOpenAiAssistant: () => void;
  onOpenQuickConnect: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  hosts,
  activeSessionsCount,
  portForwards,
  vaultSettings,
  auditEvents,
  transfers,
  onToggleTransferStatus,
  onCancelTransfer,
  onConnectHost,
  onOpenSftp,
  onToggleFavorite,
  onOpenView,
  onOpenAiAssistant,
  onOpenQuickConnect,
}) => {
  const [sessionFilter, setSessionFilter] = useState<'all' | 'favorites' | 'recent'>('all');
  const [systemMetrics, setSystemMetrics] = useState<{
    cpuPercent: number;
    ramPercent: number;
    cpuCores: number;
    cpuModel: string;
    ramUsed: string;
    ramTotal: string;
    loadAverage: number[];
  }>({
    cpuPercent: 0,
    ramPercent: 0,
    cpuCores: 0,
    cpuModel: '',
    ramUsed: '0 MB',
    ramTotal: '0 MB',
    loadAverage: [0, 0, 0],
  });

  // Poll system metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/system/metrics');
        if (res.ok) {
          const data = await res.json();
          setSystemMetrics({
            cpuPercent: data.cpuUsagePercent ?? data.cpu?.usagePercent ?? 0,
            ramPercent: data.memory?.percentage ?? data.memory?.percentUsed ?? data.memoryUsagePercent ?? 0,
            cpuCores: data.cpu?.cores ?? data.cpuCores ?? 0,
            cpuModel: data.cpu?.model ?? data.cpuModel ?? 'Host CPU',
            ramUsed: data.memory?.usedFormatted ?? '0 MB',
            ramTotal: data.memory?.totalFormatted ?? '0 MB',
            loadAverage: data.loadAverage ?? [0, 0, 0],
          });
        }
      } catch (err) {
        // Network or server offline
      }
    };

    fetchMetrics();
    const timer = setInterval(fetchMetrics, 4000);
    return () => clearInterval(timer);
  }, []);

  const onlineHosts = hosts.filter((h) => h.status === 'online');
  const favoriteHosts = hosts.filter((h) => h.favorite);
  const activeTunnels = portForwards.filter((p) => p.status === 'active');

  const filteredHosts = hosts.filter((h) => {
    if (sessionFilter === 'favorites') return h.favorite;
    if (sessionFilter === 'recent') return !!h.lastConnectedAt;
    return true;
  });

  // Gauge calculations
  const calculateCircleDash = (percent: number, radius: number = 44) => {
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    return { circumference, offset };
  };

  const cpuDash = calculateCircleDash(systemMetrics.cpuPercent);
  const ramDash = calculateCircleDash(systemMetrics.ramPercent);

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0A0A0B] p-6 text-[#E0E0E0] space-y-6 font-sans">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111112] border border-[#222224] rounded-xl p-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white">Workstation Dashboard</h1>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] rounded border border-emerald-500/20 uppercase tracking-widest font-mono font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SYSTEM HEALTHY
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            xTerminal encrypted workstation. Active sessions, background file transfers, and system performance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenQuickConnect}
            className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-xs transition-colors flex items-center gap-2"
          >
            <Server className="w-4 h-4 stroke-[2.5]" />
            <span>Connect to Server</span>
          </button>
          <button
            onClick={onOpenAiAssistant}
            className="px-4 py-2 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-200 hover:text-white font-medium text-xs border border-[#222224] transition-colors flex items-center gap-2"
          >
            <Bot className="w-4 h-4 text-emerald-400" />
            <span>AI Copilot</span>
          </button>
        </div>
      </div>

      {/* Dynamic Local System Resources Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CPU Gauge Card */}
        <div className="p-5 rounded-xl bg-[#111112] border border-[#222224] flex items-center justify-between gap-6">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 text-gray-400">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Local CPU Utilization</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white">
                {systemMetrics.cpuPercent}%
              </span>
              <span className="text-xs text-emerald-400 font-mono">
                {systemMetrics.cpuCores} Virtual Cores
              </span>
            </div>
            <div className="text-[11px] text-gray-500 font-mono truncate">
              Model: {systemMetrics.cpuModel}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400">
              <span>Load: {systemMetrics.loadAverage.join(' ')}</span>
            </div>
          </div>

          {/* SVG Radial Gauge */}
          <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="#1C1C1E"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="url(#cpuGradient)"
                strokeWidth="8"
                strokeDasharray={cpuDash.circumference}
                strokeDashoffset={cpuDash.offset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
              <defs>
                <linearGradient id="cpuGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-sm font-bold font-mono text-white">
                {systemMetrics.cpuPercent}%
              </span>
              <span className="text-[9px] uppercase font-mono text-gray-500">USAGE</span>
            </div>
          </div>
        </div>

        {/* RAM Gauge Card */}
        <div className="p-5 rounded-xl bg-[#111112] border border-[#222224] flex items-center justify-between gap-6">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 text-gray-400">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Local Memory Allocation</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white">
                {systemMetrics.ramPercent}%
              </span>
              <span className="text-xs text-cyan-400 font-mono">
                {systemMetrics.ramUsed} / {systemMetrics.ramTotal}
              </span>
            </div>
            <div className="w-full bg-[#1C1C1E] h-2 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-cyan-400 transition-all duration-500 rounded-full"
                style={{ width: `${systemMetrics.ramPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
              <span>Buffers / Cache: Active</span>
              <span className="text-emerald-400 font-semibold">Healthy</span>
            </div>
          </div>

          {/* SVG Radial Gauge */}
          <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="#1C1C1E"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="url(#ramGradient)"
                strokeWidth="8"
                strokeDasharray={ramDash.circumference}
                strokeDashoffset={ramDash.offset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
              <defs>
                <linearGradient id="ramGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-sm font-bold font-mono text-white">
                {systemMetrics.ramPercent}%
              </span>
              <span className="text-[9px] uppercase font-mono text-gray-500">RAM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feed of Recent and Favorite Sessions */}
      <div className="rounded-xl bg-[#111112] border border-[#222224] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#222224] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Server className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Recent &amp; Favorite Sessions Feed</h2>
            <span className="px-2 py-0.5 rounded-full bg-[#1C1C1E] text-gray-400 text-[10px] font-mono border border-[#222224]">
              {filteredHosts.length} hosts
            </span>
          </div>

          <div className="flex items-center bg-[#1C1C1E] p-0.5 rounded-md border border-[#222224] text-xs">
            <button
              onClick={() => setSessionFilter('all')}
              className={`px-3 py-1 rounded transition-colors ${
                sessionFilter === 'all'
                  ? 'bg-[#111112] text-white font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSessionFilter('favorites')}
              className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
                sessionFilter === 'favorites'
                  ? 'bg-[#111112] text-emerald-400 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              <span>Favorites ({favoriteHosts.length})</span>
            </button>
            <button
              onClick={() => setSessionFilter('recent')}
              className={`px-3 py-1 rounded transition-colors ${
                sessionFilter === 'recent'
                  ? 'bg-[#111112] text-white font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Recent
            </button>
          </div>
        </div>

        <div className="divide-y divide-[#222224]">
          {filteredHosts.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">
              No matching sessions found for current filter.
            </div>
          ) : (
            filteredHosts.slice(0, 6).map((host) => (
              <div
                key={host.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#161618] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-2.5 h-10 rounded-full shrink-0"
                    style={{ backgroundColor: host.color || '#10B981' }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white truncate">{host.name}</span>
                      <button
                        onClick={() => onToggleFavorite?.(host.id)}
                        className="text-gray-500 hover:text-amber-400 transition-colors"
                        title="Toggle Favorite"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            host.favorite ? 'text-amber-400 fill-current' : ''
                          }`}
                        />
                      </button>
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-[#1C1C1E] text-gray-400 border border-[#222224]">
                        {host.environment}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {host.connectionType.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-xs text-gray-400 font-mono mt-0.5 truncate flex items-center gap-3">
                      <span>{host.username}@{host.hostname}:{host.port}</span>
                      {host.lastConnectedAt && (
                        <span className="text-gray-500 text-[11px]">
                          Last connected: {new Date(host.lastConnectedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {host.tags && host.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {host.tags.map((t) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#1C1C1E] text-gray-400 border border-[#222224]"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => onConnectHost(host)}
                    className="px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>SSH Terminal</span>
                  </button>

                  <button
                    onClick={() => onOpenSftp?.(host)}
                    className="px-3 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 hover:text-white border border-[#222224] text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <FolderSync className="w-3.5 h-3.5 text-emerald-400" />
                    <span>SFTP</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Background Transfers Queue */}
      <div className="rounded-xl bg-[#111112] border border-[#222224] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#222224] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderSync className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Background Transfers Queue</h2>
            <span className="px-2 py-0.5 rounded-full bg-[#1C1C1E] text-gray-400 text-[10px] font-mono border border-[#222224]">
              {transfers.filter((t) => t.status === 'transferring').length} active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenView('sftp')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
            >
              <span>Manage in SFTP</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-[#222224]">
          {transfers.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">
              No files in the transfer queue. Start an upload or download from the SFTP Browser.
            </div>
          ) : (
            transfers.map((item) => (
              <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      item.direction === 'upload'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    }`}
                  >
                    {item.direction === 'upload' ? (
                      <ArrowUpCircle className="w-4 h-4" />
                    ) : (
                      <ArrowDownCircle className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white font-mono truncate">{item.name}</span>
                      <span className="text-[11px] font-mono text-gray-400">
                        {item.speed} • ETA: {item.eta}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#1C1C1E] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          item.status === 'completed'
                            ? 'bg-emerald-500'
                            : item.status === 'failed'
                            ? 'bg-red-500'
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 mt-1">
                      <span className="truncate max-w-xs">{item.localPath} → {item.remotePath}</span>
                      <span>
                        {formatBytes(item.transferredBytes)} / {formatBytes(item.size)} ({item.progress}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                      item.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : item.status === 'transferring'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : 'bg-[#1C1C1E] text-gray-400 border-[#222224]'
                    }`}
                  >
                    {item.status}
                  </span>

                  {item.status === 'transferring' && onToggleTransferStatus && (
                    <button
                      onClick={() => onToggleTransferStatus(item.id)}
                      className="p-1.5 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-400 hover:text-white border border-[#222224]"
                      title="Pause Transfer"
                    >
                      <Pause className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {onCancelTransfer && (
                    <button
                      onClick={() => onCancelTransfer(item.id)}
                      className="p-1.5 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-400 hover:text-white border border-[#222224]"
                      title="Cancel / Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
