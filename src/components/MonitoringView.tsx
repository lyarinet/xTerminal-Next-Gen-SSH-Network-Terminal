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
  AlertTriangle,
  Globe,
  Copy,
  Check,
  Play
} from 'lucide-react';
import { Host } from '../types';

interface MonitoringViewProps {
  hosts: Host[];
}

interface FleetHostCheck {
  status: 'checking' | 'online' | 'offline';
  latencyMs?: number;
  error?: string;
  banner?: string | null;
}

export const MonitoringView: React.FC<MonitoringViewProps> = ({ hosts }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  // Probe Tool State
  const [probeHost, setProbeHost] = useState('127.0.0.1');
  const [probePort, setProbePort] = useState(22);
  const [isProbing, setIsProbing] = useState(false);
  const [probeReport, setProbeReport] = useState<any>(null);
  const [probeError, setProbeError] = useState<string | null>(null);

  // Managed Fleet Live Reachability State
  const [fleetChecks, setFleetChecks] = useState<Record<string, FleetHostCheck>>({});
  const [isCheckingFleet, setIsCheckingFleet] = useState(false);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

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
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const runProbe = async (targetH?: string, targetP?: number) => {
    const h = (targetH || probeHost).trim();
    const p = Number(targetP || probePort) || 22;
    if (!h) {
      setProbeError('Please enter a target host or IP address.');
      return;
    }

    setIsProbing(true);
    setProbeError(null);
    setProbeReport(null);

    try {
      // Primary endpoint /api/diagnostics/probe, fallback /api/network/probe
      let res = await fetch('/api/diagnostics/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: h, port: p }),
      });

      if (!res.ok) {
        res = await fetch('/api/network/probe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host: h, port: p }),
        });
      }

      if (res.ok) {
        const data = await res.json();
        setProbeReport(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setProbeError(errData.error || `Probe failed with HTTP ${res.status}`);
      }
    } catch (err: any) {
      console.error('Failed to run socket probe:', err);
      setProbeError(`Network error executing probe: ${err.message}`);
    } finally {
      setIsProbing(false);
    }
  };

  // Ping / Check Reachability of all fleet hosts in parallel
  const handleCheckAllFleet = async () => {
    if (hosts.length === 0) return;
    setIsCheckingFleet(true);

    const initial: Record<string, FleetHostCheck> = {};
    hosts.forEach((h) => {
      initial[h.id] = { status: 'checking' };
    });
    setFleetChecks(initial);

    await Promise.all(
      hosts.map(async (host) => {
        try {
          const res = await fetch('/api/diagnostics/probe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host: host.hostname, port: host.port || 22 }),
          });

          if (res.ok) {
            const data = await res.json();
            setFleetChecks((prev) => ({
              ...prev,
              [host.id]: {
                status: data.accessible ? 'online' : 'offline',
                latencyMs: data.totalDurationMs || 0,
                banner: data.banner || null,
              },
            }));
          } else {
            setFleetChecks((prev) => ({
              ...prev,
              [host.id]: { status: 'offline', error: 'HTTP error' },
            }));
          }
        } catch (err: any) {
          setFleetChecks((prev) => ({
            ...prev,
            [host.id]: { status: 'offline', error: err.message },
          }));
        }
      })
    );

    setIsCheckingFleet(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIp(text);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  // Metrics extractors
  const cpuModel = metrics?.cpu?.model ?? metrics?.cpuModel ?? 'Host System CPU';
  const cpuCores = metrics?.cpu?.cores ?? metrics?.cpuCores ?? 0;
  const cpuUsage = metrics?.cpu?.usagePercent ?? metrics?.cpuUsage ?? 0;
  const memTotal = metrics?.memory?.totalFormatted ?? '0 MB';
  const memUsed = metrics?.memory?.usedFormatted ?? '0 MB';
  const memPercent = metrics?.memory?.percentage ?? metrics?.memory?.percentUsed ?? 0;
  const uptimeSeconds = metrics?.uptimeSeconds ?? 0;
  const platform = metrics?.platform ?? '--';
  const arch = metrics?.arch ?? '--';
  const hostname = metrics?.hostname ?? 'localhost';
  const diskTotal = metrics?.disk?.totalFormatted ?? 'N/A';
  const diskUsed = metrics?.disk?.usedFormatted ?? 'N/A';
  const diskPercent = metrics?.disk?.percentage ?? 0;
  const diskMount = metrics?.disk?.mount ?? 'Root';
  const loadAverages = Array.isArray(metrics?.loadAverage)
    ? metrics.loadAverage
    : Array.isArray(metrics?.loadAvg)
    ? metrics.loadAvg
    : [0, 0, 0];

  // Extract active IPv4 network interfaces
  const activeInterfaces: { name: string; address: string; family: string; mac: string }[] = [];
  if (metrics?.networkInterfaces && typeof metrics.networkInterfaces === 'object') {
    Object.entries(metrics.networkInterfaces).forEach(([name, ifaces]: [string, any]) => {
      if (Array.isArray(ifaces)) {
        ifaces.forEach((item) => {
          if (item.family === 'IPv4' && !item.internal) {
            activeInterfaces.push({
              name,
              address: item.address,
              family: item.family,
              mac: item.mac || '',
            });
          }
        });
      }
    });
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0A0A0B] text-[#E0E0E0] p-6 space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E1E20] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Diagnostics &amp; System Health</h1>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  REALTIME TELEMETRY
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Live host runtime performance metrics, storage utilization, and end-to-end socket reachability diagnostics.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchMetrics}
            disabled={isLoadingMetrics}
            className="px-3.5 py-1.5 rounded-lg bg-[#1C1C1E] hover:bg-[#252528] text-gray-200 border border-[#2B2B2F] text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMetrics ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* Primary Metrics Row (CPU, RAM, Storage, Uptime, Load) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Card */}
        <div className="p-4 rounded-xl bg-[#111112] border border-[#222224] space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">CPU Utilization</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-white font-mono">{cpuUsage}%</div>
            <span className="text-xs text-gray-400 font-mono">{cpuCores} Cores Active</span>
          </div>
          {/* CPU Progress Bar */}
          <div className="w-full h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden border border-zinc-800">
            <div
              className={`h-full transition-all duration-300 ${
                cpuUsage > 85 ? 'bg-red-500' : cpuUsage > 60 ? 'bg-amber-500' : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.max(4, cpuUsage)}%` }}
            />
          </div>
          <div className="text-[11px] text-gray-400 font-mono truncate" title={cpuModel}>
            {cpuModel}
          </div>
        </div>

        {/* RAM Allocation Card */}
        <div className="p-4 rounded-xl bg-[#111112] border border-[#222224] space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">RAM Allocation</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-white font-mono">{memUsed}</div>
            <span className="text-xs font-bold text-blue-400 font-mono">{memPercent}% Used</span>
          </div>
          {/* RAM Progress Bar */}
          <div className="w-full h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden border border-zinc-800">
            <div
              className={`h-full transition-all duration-300 ${
                memPercent > 85 ? 'bg-red-500' : memPercent > 70 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.max(4, memPercent)}%` }}
            />
          </div>
          <div className="text-[11px] text-gray-400 font-mono">
            Total Capacity: {memTotal}
          </div>
        </div>

        {/* Disk Storage Card */}
        <div className="p-4 rounded-xl bg-[#111112] border border-[#222224] space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">Disk Storage ({diskMount})</span>
            <HardDrive className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-white font-mono">{diskUsed}</div>
            <span className="text-xs font-bold text-purple-400 font-mono">{diskPercent}% Used</span>
          </div>
          {/* Disk Progress Bar */}
          <div className="w-full h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden border border-zinc-800">
            <div
              className={`h-full transition-all duration-300 ${
                diskPercent > 90 ? 'bg-red-500' : diskPercent > 75 ? 'bg-amber-500' : 'bg-purple-500'
              }`}
              style={{ width: `${Math.max(4, diskPercent)}%` }}
            />
          </div>
          <div className="text-[11px] text-gray-400 font-mono">
            Total Capacity: {diskTotal}
          </div>
        </div>

        {/* System Uptime Card */}
        <div className="p-4 rounded-xl bg-[#111112] border border-[#222224] space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">System Uptime</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {Math.floor(uptimeSeconds / 3600)}h {Math.floor((uptimeSeconds % 3600) / 60)}m
          </div>
          <div className="text-[11px] text-gray-400 font-mono truncate">
            Host: <span className="text-gray-200">{hostname}</span>
          </div>
          <div className="text-[11px] text-gray-500 font-mono">
            OS: {platform} ({arch})
          </div>
        </div>
      </div>

      {/* Active Local Network Interfaces */}
      {activeInterfaces.length > 0 && (
        <div className="bg-[#111112] border border-[#222224] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-[#1E1E20] pb-2">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                Host Active Network Interfaces
              </h2>
            </div>
            <span className="text-[10px] text-gray-500 font-mono">Direct Local Binding</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {activeInterfaces.map((iface, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-[#161618] border border-[#222224] flex items-center justify-between font-mono text-xs"
              >
                <div>
                  <div className="text-white font-bold">{iface.name}</div>
                  <div className="text-emerald-400 text-[11px]">{iface.address}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(iface.address)}
                  className="p-1.5 rounded hover:bg-[#252528] text-gray-400 hover:text-white transition-colors"
                  title="Copy IP address"
                >
                  {copiedIp === iface.address ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Network Diagnostic Probe Tool */}
      <div className="bg-[#111112] border border-[#222224] rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E1E20] pb-3">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Live Network &amp; Port Reachability Probe</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
              End-to-End Handshake
            </span>
          </div>
          <span className="text-[11px] text-gray-400 font-mono">DNS Resolution + TCP Handshake + Service Banner</span>
        </div>

        <p className="text-xs text-gray-400">
          Executes real end-to-end socket handshakes to verify DNS resolution, firewall routing, and daemon banner responsiveness (SSH, HTTP, FTP, TFTP) before opening sessions.
        </p>

        {/* Quick Target Presets */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[11px] text-gray-400 uppercase font-mono">Presets:</span>
          <button
            onClick={() => {
              setProbeHost('127.0.0.1');
              setProbePort(22);
            }}
            className="px-2.5 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#2B2B2F] text-xs font-mono transition-colors"
          >
            Local SSH (127.0.0.1:22)
          </button>
          <button
            onClick={() => {
              setProbeHost('8.8.8.8');
              setProbePort(53);
            }}
            className="px-2.5 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#2B2B2F] text-xs font-mono transition-colors"
          >
            Google DNS (8.8.8.8:53)
          </button>
          <button
            onClick={() => {
              setProbeHost('1.1.1.1');
              setProbePort(443);
            }}
            className="px-2.5 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#2B2B2F] text-xs font-mono transition-colors"
          >
            Cloudflare HTTPS (1.1.1.1:443)
          </button>
          {hosts.slice(0, 3).map((h) => (
            <button
              key={h.id}
              onClick={() => {
                setProbeHost(h.hostname);
                setProbePort(h.port || 22);
              }}
              className="px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono transition-colors"
            >
              {h.name} ({h.hostname}:{h.port || 22})
            </button>
          ))}
        </div>

        {/* Probe Input Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <div className="flex-1">
            <input
              type="text"
              value={probeHost}
              onChange={(e) => setProbeHost(e.target.value)}
              placeholder="Target host (e.g. 192.168.1.1, github.com, or cisco-router.local)"
              className="w-full px-3.5 py-2 rounded-lg bg-[#1C1C1E] border border-[#2B2B2F] text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="w-28 shrink-0">
            <input
              type="number"
              value={probePort}
              onChange={(e) => setProbePort(Number(e.target.value))}
              placeholder="Port"
              className="w-full px-3.5 py-2 rounded-lg bg-[#1C1C1E] border border-[#2B2B2F] text-xs text-white font-mono focus:outline-hidden focus:border-emerald-500 transition-colors"
            />
          </div>

          <button
            onClick={() => runProbe()}
            disabled={isProbing || !probeHost.trim()}
            className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-40 shrink-0"
          >
            {isProbing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>{isProbing ? 'Probing Target...' : 'Execute Diagnostic Probe'}</span>
          </button>
        </div>

        {probeError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 font-mono">
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{probeError}</span>
          </div>
        )}

        {/* Probe Output Timeline */}
        {probeReport && (
          <div className="mt-4 p-4 rounded-xl bg-[#0A0A0B] border border-[#222224] space-y-3 font-mono text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#222224]">
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
                  Target: {probeReport.host}:{probeReport.port} {probeReport.resolvedIp && `(${probeReport.resolvedIp})`}
                </span>
              </div>

              <span className="text-[11px] text-gray-400">
                Total Latency: <strong className="text-white font-bold">{probeReport.totalDurationMs}ms</strong>
              </span>
            </div>

            {/* Steps Breakdown */}
            <div className="space-y-2">
              {probeReport.steps?.map((step: any, index: number) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-2.5 rounded-lg bg-[#161618] border border-[#222224] text-[11px]"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-gray-200">{step.name || step.step}</div>
                    <div className="text-gray-400">{step.details}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-gray-500">{step.durationMs || step.latencyMs}ms</span>
                    {step.status === 'success' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        PASS
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                        FAIL
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {probeReport.banner && (
              <div className="pt-2 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Captured Daemon Banner: <strong className="font-bold text-white">{probeReport.banner}</strong>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Target Fleet Health Grid with Live Parallel Pinging */}
      <div className="bg-[#111112] border border-[#222224] rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E1E20] pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              Managed Server Fleet Reachability Status
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Live socket handshake test across all configured SSH and management servers.
            </p>
          </div>

          {hosts.length > 0 && (
            <button
              onClick={handleCheckAllFleet}
              disabled={isCheckingFleet}
              className="px-3.5 py-1.5 rounded-lg bg-[#1C1C1E] hover:bg-[#252528] text-white border border-[#2B2B2F] text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingFleet ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isCheckingFleet ? 'Checking Fleet...' : 'Test All Hosts Now'}</span>
            </button>
          )}
        </div>

        {hosts.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500 font-mono">
            No managed hosts configured. Add hosts in the SSH Connections tab to monitor fleet telemetry and status.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {hosts.map((host) => {
              const check = fleetChecks[host.id];
              const isOnline = check?.status === 'online' || (!check && host.status === 'online');
              const isChecking = check?.status === 'checking';

              return (
                <div
                  key={host.id}
                  className="p-3.5 rounded-xl bg-[#161618] border border-[#222224] hover:border-[#2B2B2F] flex flex-col justify-between gap-2.5 text-xs transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isChecking
                            ? 'bg-blue-400 animate-ping'
                            : isOnline
                            ? 'bg-emerald-400'
                            : 'bg-red-400'
                        }`}
                      />
                      <div>
                        <div className="font-bold text-white">{host.name}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{host.hostname}:{host.port || 22}</div>
                      </div>
                    </div>

                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#1C1C1E] border border-[#2B2B2F] text-gray-300">
                      {host.environment || 'production'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 font-mono text-[11px]">
                    <div>
                      {isChecking ? (
                        <span className="text-blue-400">Probing...</span>
                      ) : check ? (
                        check.status === 'online' ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> {check.latencyMs}ms PASS
                          </span>
                        ) : (
                          <span className="text-red-400 font-bold flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> UNREACHABLE
                          </span>
                        )
                      ) : (
                        <span className="text-gray-400">Ready to test</span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setProbeHost(host.hostname);
                        setProbePort(host.port || 22);
                        runProbe(host.hostname, host.port || 22);
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <span>Diagnose</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

