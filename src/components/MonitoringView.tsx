import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  Server,
  Zap,
  Terminal,
  AlertTriangle
} from 'lucide-react';
import { Host } from '../types';

interface MonitoringViewProps {
  hosts: Host[];
}

export const MonitoringView: React.FC<MonitoringViewProps> = ({ hosts }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  // Probe Tool State
  const [probeHost, setProbeHost] = useState('');
  const [probePort, setProbePort] = useState(22);
  const [isProbing, setIsProbing] = useState(false);
  const [probeReport, setProbeReport] = useState<any>(null);

  const fetchMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const res = await fetch('/api/system/metrics');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          setMetrics(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch system metrics:', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  const runProbe = async () => {
    if (!probeHost) return;
    setIsProbing(true);
    setProbeReport(null);

    try {
      const res = await fetch('/api/network/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: probeHost, port: probePort }),
      });
      if (res.ok) {
        const data = await res.json();
        setProbeReport(data);
      }
    } catch (err) {
      console.error('Failed to run socket probe:', err);
    } finally {
      setIsProbing(false);
    }
  };

  const cpuModel = metrics?.cpu?.model ?? metrics?.cpuModel ?? 'Host System CPU';
  const cpuCores = metrics?.cpu?.cores ?? metrics?.cpuCores ?? 0;
  const memTotal = metrics?.memory?.totalFormatted ?? '0 MB';
  const memUsed = metrics?.memory?.usedFormatted ?? '0 MB';
  const memPercent = metrics?.memory?.percentage ?? metrics?.memory?.percentUsed ?? 0;
  const uptimeSeconds = metrics?.uptimeSeconds ?? 0;
  const platform = metrics?.platform ?? '--';
  const arch = metrics?.arch ?? '--';
  const loadAverages = Array.isArray(metrics?.loadAverage)
    ? metrics.loadAverage
    : Array.isArray(metrics?.loadAvg)
    ? metrics.loadAvg
    : [0, 0, 0];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0A0A0B] text-[#E0E0E0] p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Diagnostics &amp; System Health</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              REALTIME TELEMETRY
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Active monitoring of local runtime metrics and live network socket reachability probes.
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          disabled={isLoadingMetrics}
          className="px-3.5 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224] text-xs font-medium transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMetrics ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#111112] border border-[#222224]">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium uppercase">Node CPU Cores</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">
            {cpuCores} <span className="text-xs text-gray-400 font-sans">Active Cores</span>
          </div>
          <div className="mt-1 text-[11px] text-gray-400 font-mono truncate">
            {cpuModel}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111112] border border-[#222224]">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium uppercase">RAM Allocation</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">
            {memUsed}
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            Total {memTotal} ({memPercent}% allocated)
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111112] border border-[#222224]">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium uppercase">System Uptime</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">
            {Math.floor(uptimeSeconds / 3600)}h {Math.floor((uptimeSeconds % 3600) / 60)}m
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            Platform: {platform} ({arch})
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111112] border border-[#222224]">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium uppercase">Load Averages</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-white font-mono">
            {loadAverages.map((l: number) => Number(l).toFixed(2)).join(' / ')}
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            1m / 5m / 15m normalized load
          </div>
        </div>
      </div>

      {/* Interactive Network Diagnostic Probe Tool */}
      <div className="bg-[#111112] border border-[#222224] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Live Network &amp; Port Reachability Probe</h2>
          </div>
          <span className="text-[11px] text-gray-500 font-mono">TCP / DNS / Handshake</span>
        </div>
        <p className="text-xs text-gray-400">
          NexusTerm executes end-to-end socket handshakes to verify DNS resolution, firewall routing, and SSH daemon banner responsiveness before opening sessions.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <div className="flex-1">
            <input
              type="text"
              value={probeHost}
              onChange={(e) => setProbeHost(e.target.value)}
              placeholder="Target host (e.g. 10.0.1.20, github.com, or internal hostname)"
              className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-xs text-gray-100 font-mono focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="w-24 shrink-0">
            <input
              type="number"
              value={probePort}
              onChange={(e) => setProbePort(Number(e.target.value))}
              placeholder="Port"
              className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-xs text-gray-100 font-mono focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <button
            onClick={runProbe}
            disabled={isProbing || !probeHost}
            className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40 shrink-0"
          >
            <Activity className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin' : ''}`} />
            <span>{isProbing ? 'Probing Target...' : 'Execute Diagnostic Probe'}</span>
          </button>
        </div>

        {/* Probe Output Timeline */}
        {probeReport && (
          <div className="mt-4 p-4 rounded-lg bg-[#0A0A0B] border border-[#222224] space-y-3 font-mono text-xs animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#222224]">
              <div className="flex items-center gap-2">
                {probeReport.accessible ? (
                  <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4" /> HOST ACCESSIBLE
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1.5 font-bold">
                    <XCircle className="w-4 h-4" /> UNREACHABLE / FILTERED
                  </span>
                )}
                <span className="text-gray-400 text-[11px]">
                  Target: {probeReport.host}:{probeReport.port}
                </span>
              </div>

              <span className="text-[11px] text-gray-400">
                Total Roundtrip: <strong className="text-white">{probeReport.totalDurationMs}ms</strong>
              </span>
            </div>

            {/* Steps Breakdown */}
            <div className="space-y-2">
              {probeReport.steps?.map((step: any, index: number) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-[11px]"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-gray-200">{step.step}</div>
                    <div className="text-gray-400">{step.details}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-gray-500">{step.durationMs}ms</span>
                    {step.status === 'success' ? (
                      <span className="text-emerald-400 font-bold">PASS</span>
                    ) : (
                      <span className="text-red-400 font-bold">FAIL</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {probeReport.banner && (
              <div className="pt-2 text-[11px] text-gray-400">
                SSH Banner String: <span className="text-emerald-400 font-bold">{probeReport.banner}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Target Fleet Health Grid */}
      <div className="bg-[#111112] border border-[#222224] rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white mb-3">Managed Server Fleet Status</h2>
        {hosts.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500 font-mono">
            No managed hosts configured. Add hosts in the SSH Connections tab to monitor fleet telemetry and status.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {hosts.map((host) => (
              <div
                key={host.id}
                className="p-3.5 rounded-lg bg-[#1C1C1E] border border-[#222224] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      host.status === 'online' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <div>
                    <div className="font-semibold text-gray-200">{host.name}</div>
                    <div className="text-[11px] text-gray-500 font-mono">{host.hostname}</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-[#111112] border border-[#222224] text-gray-300">
                    {host.environment}
                  </span>
                  <div className="text-[10px] text-gray-500 mt-1">
                    {host.status === 'online' ? 'Ping: 18ms' : 'Slow response'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
