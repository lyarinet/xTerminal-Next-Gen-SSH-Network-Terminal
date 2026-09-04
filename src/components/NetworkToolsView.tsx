import React, { useState } from 'react';
import {
  Globe,
  Radio,
  Search,
  Activity,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Send,
  RefreshCw,
  Power,
  Server,
  Layers,
  Sliders,
  ExternalLink,
  Calculator,
  Network
} from 'lucide-react';
import { PortScanResultItem, PingPacketItem } from '../types';

export const NetworkToolsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'portscan' | 'ping' | 'traceroute' | 'dns' | 'wol' | 'subnet' | 'ipscan'
  >('portscan');

  // --- 1. Port Scanner State ---
  const [scanHost, setScanHost] = useState('127.0.0.1');
  const [portPreset, setPortPreset] = useState<'top20' | 'common' | 'web' | 'custom'>('top20');
  const [customPorts, setCustomPorts] = useState('21, 22, 80, 443, 3000, 3306, 5432, 6379, 8080');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<{
    target: string;
    resolvedIp: string;
    totalPortsScanned: number;
    openPortsCount: number;
    durationMs: number;
    results: PortScanResultItem[];
  } | null>(null);

  // --- 2. ICMP Ping State ---
  const [pingHost, setPingHost] = useState('8.8.8.8');
  const [pingCount, setPingCount] = useState(4);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{
    host: string;
    resolvedIp: string;
    transmitted: number;
    received: number;
    lossPercent: number;
    minLatency: number;
    avgLatency: number;
    maxLatency: number;
    jitter: number;
    packets: PingPacketItem[];
  } | null>(null);

  // --- 3. Traceroute State ---
  const [traceHost, setTraceHost] = useState('1.1.1.1');
  const [isTracing, setIsTracing] = useState(false);
  const [hops, setHops] = useState<{ hop: number; ip: string; rtt1: string; rtt2: string; hostname: string; as: string }[]>([]);

  // --- 4. DNS / WHOIS State ---
  const [dnsDomain, setDnsDomain] = useState('google.com');
  const [dnsType, setDnsType] = useState('A');
  const [isResolvingDns, setIsResolvingDns] = useState(false);
  const [dnsRecords, setDnsRecords] = useState<any[]>([]);

  // --- 5. Wake on LAN (WoL) State ---
  const [wolMac, setWolMac] = useState('');
  const [wolBroadcast, setWolBroadcast] = useState('255.255.255.255');
  const [wolPort, setWolPort] = useState(9);
  const [wolStatus, setWolStatus] = useState<string | null>(null);

  // --- 6. Subnet Calculator State ---
  const [subnetIp, setSubnetIp] = useState('');
  const [subnetCidr, setSubnetCidr] = useState(24);

  // --- 7. IP Range Discovery Scanner State ---
  const [scanSubnet, setScanSubnet] = useState('');
  const [scanRangeStart, setScanRangeStart] = useState(1);
  const [scanRangeEnd, setScanRangeEnd] = useState(12);
  const [isSweeping, setIsSweeping] = useState(false);
  const [discoveredHosts, setDiscoveredHosts] = useState<
    { ip: string; hostname: string; status: 'online' | 'offline'; latencyMs: number; openPorts: number[]; vendor?: string }[]
  >([]);

  const calculateSubnet = (ipStr: string, prefix: number) => {
    const parts = ipStr.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return null;
    }
    const ipNum = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
    const maskNum = prefix === 0 ? 0 : ((~0 << (32 - prefix)) >>> 0);
    const wildcardNum = (~maskNum) >>> 0;
    const netNum = (ipNum & maskNum) >>> 0;
    const bcastNum = (ipNum | wildcardNum) >>> 0;

    const toDotted = (n: number) => [
      (n >>> 24) & 255,
      (n >>> 16) & 255,
      (n >>> 8) & 255,
      n & 255,
    ].join('.');

    const totalHosts = prefix >= 31 ? (prefix === 31 ? 2 : 1) : Math.pow(2, 32 - prefix);
    const usableHosts = prefix >= 31 ? (prefix === 31 ? 2 : 1) : Math.max(0, totalHosts - 2);

    return {
      ip: ipStr,
      prefix,
      network: toDotted(netNum),
      broadcast: toDotted(bcastNum),
      mask: toDotted(maskNum),
      wildcard: toDotted(wildcardNum),
      firstUsable: prefix >= 31 ? toDotted(netNum) : toDotted(netNum + 1),
      lastUsable: prefix >= 31 ? toDotted(bcastNum) : toDotted(bcastNum - 1),
      totalHosts,
      usableHosts,
      binaryMask: (maskNum >>> 0).toString(2).padStart(32, '0').match(/.{1,8}/g)?.join('.') || '',
    };
  };

  const handleSweepSubnet = async () => {
    setIsSweeping(true);
    try {
      const res = await fetch('/api/network/subnet-sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subnet: scanSubnet,
          start: scanRangeStart,
          end: scanRangeEnd,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDiscoveredHosts(data.results || []);
      }
    } catch (err) {
      console.error('Subnet sweep failed:', err);
    } finally {
      setIsSweeping(false);
    }
  };

  // Run Port Scan
  const handlePortScan = async () => {
    setIsScanning(true);
    let portsToScan: number[] = [21, 22, 80, 443, 3000, 3306, 5432, 6379, 8080];
    if (portPreset === 'top20') {
      portsToScan = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 993, 995, 1433, 1521, 3000, 3306, 3389, 5432, 6379, 8080];
    } else if (portPreset === 'web') {
      portsToScan = [80, 443, 3000, 8000, 8080, 8443, 9090, 9200];
    } else if (portPreset === 'custom') {
      portsToScan = customPorts
        .split(',')
        .map((p) => parseInt(p.trim(), 10))
        .filter((p) => !isNaN(p) && p > 0 && p <= 65535);
    }

    try {
      const res = await fetch('/api/network/portscan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: scanHost, ports: portsToScan }),
      });
      if (res.ok) {
        const data = await res.json();
        setScanResults(data);
      }
    } catch (err) {
      console.error('Port scan failed:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Run ICMP Ping
  const handlePing = async () => {
    setIsPinging(true);
    try {
      const res = await fetch('/api/network/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: pingHost, count: pingCount }),
      });
      if (res.ok) {
        const data = await res.json();
        setPingResult(data);
      }
    } catch (err) {
      console.error('Ping probe failed:', err);
    } finally {
      setIsPinging(false);
    }
  };

  // Run Traceroute probe
  const handleTraceroute = async () => {
    setIsTracing(true);
    try {
      const res = await fetch('/api/network/traceroute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: traceHost, maxHops: 15 }),
      });
      if (res.ok) {
        const data = await res.json();
        setHops(data.hops || []);
      }
    } catch (err) {
      console.error('Traceroute failed:', err);
    } finally {
      setIsTracing(false);
    }
  };

  // Run DNS query
  const handleDnsLookup = async () => {
    setIsResolvingDns(true);
    try {
      const res = await fetch('/api/network/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: dnsDomain, recordType: dnsType }),
      });
      if (res.ok) {
        const data = await res.json();
        setDnsRecords(data.records || []);
      }
    } catch (err) {
      console.error('DNS lookup failed:', err);
    } finally {
      setIsResolvingDns(false);
    }
  };

  // Broadcast Wake-on-LAN Magic Packet
  const handleSendWol = async () => {
    try {
      const res = await fetch('/api/network/wol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          macAddress: wolMac,
          broadcastIp: wolBroadcast,
          port: wolPort,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setWolStatus(`Magic packet (102 bytes) broadcasted to ${wolMac} via ${wolBroadcast}:${wolPort} successfully!`);
      } else {
        const err = await res.json();
        setWolStatus(`Error: ${err.error}`);
      }
    } catch (err: any) {
      setWolStatus(`Failed to send magic packet: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0B] text-[#E0E0E0] overflow-hidden font-sans">
      {/* Top Header */}
      <div className="bg-[#111112] border-b border-[#222224] p-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Network Diagnostics &amp; Tools</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Multithreaded port scanner, ICMP ping, traceroute, DNS query engine, and Wake on LAN (WoL).
              </p>
            </div>
          </div>

          {/* Tool Selector Tabs */}
          <div className="flex items-center bg-[#1C1C1E] p-1 rounded-lg border border-[#222224] flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('portscan')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'portscan'
                  ? 'bg-emerald-500 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Port Scanner</span>
            </button>
            <button
              onClick={() => setActiveTab('ping')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'ping'
                  ? 'bg-emerald-500 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>ICMP Ping</span>
            </button>
            <button
              onClick={() => setActiveTab('traceroute')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'traceroute'
                  ? 'bg-emerald-500 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Traceroute</span>
            </button>
            <button
              onClick={() => setActiveTab('dns')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'dns'
                  ? 'bg-emerald-500 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>DNS / WHOIS</span>
            </button>
            <button
              onClick={() => setActiveTab('wol')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'wol'
                  ? 'bg-emerald-500 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>Wake on LAN</span>
            </button>
            <button
              onClick={() => setActiveTab('subnet')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'subnet'
                  ? 'bg-emerald-500 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Subnet Calc</span>
            </button>
            <button
              onClick={() => setActiveTab('ipscan')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'ipscan'
                  ? 'bg-emerald-500 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>IP Discovery</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* TAB 1: PORT SCANNER */}
        {activeTab === 'portscan' && (
          <div className="space-y-4 max-w-5xl mx-auto">
            <div className="p-4 rounded-xl bg-[#111112] border border-[#222224] space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex-1 w-full">
                  <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                    Target Hostname or IP
                  </label>
                  <input
                    type="text"
                    value={scanHost}
                    onChange={(e) => setScanHost(e.target.value)}
                    placeholder="127.0.0.1 or server.domain.com"
                    className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-white font-mono text-xs focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="w-full sm:w-auto">
                  <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                    Port Preset
                  </label>
                  <select
                    value={portPreset}
                    onChange={(e) => setPortPreset(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-white font-mono text-xs focus:outline-hidden"
                  >
                    <option value="top20">Top 20 Common Ports</option>
                    <option value="web">Web &amp; Microservices (80, 443, 3000, 8080...)</option>
                    <option value="custom">Custom Port List</option>
                  </select>
                </div>

                <div className="w-full sm:w-auto self-end">
                  <button
                    onClick={handlePortScan}
                    disabled={isScanning || !scanHost}
                    className="w-full sm:w-auto px-5 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-40"
                  >
                    <Activity className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    <span>{isScanning ? 'Scanning...' : 'Scan Ports'}</span>
                  </button>
                </div>
              </div>

              {portPreset === 'custom' && (
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                    Comma-separated Ports
                  </label>
                  <input
                    type="text"
                    value={customPorts}
                    onChange={(e) => setCustomPorts(e.target.value)}
                    placeholder="21, 22, 80, 443, 3306..."
                    className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-white font-mono text-xs focus:outline-hidden"
                  />
                </div>
              )}
            </div>

            {/* Scan Results */}
            {scanResults && (
              <div className="rounded-xl bg-[#111112] border border-[#222224] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#222224] flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 text-white">
                    <span>Target: <strong>{scanResults.target}</strong> ({scanResults.resolvedIp})</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-emerald-400 font-bold">{scanResults.openPortsCount} Open</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-400">{scanResults.totalPortsScanned} Scanned</span>
                  </div>
                  <span className="text-gray-500">Scan duration: {scanResults.durationMs}ms</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0A0A0B] text-gray-400 font-mono text-[11px] border-b border-[#222224]">
                      <tr>
                        <th className="py-2.5 px-4">Port Number</th>
                        <th className="py-2.5 px-4">State</th>
                        <th className="py-2.5 px-4">Service Identification</th>
                        <th className="py-2.5 px-4">Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222224]">
                      {scanResults.results.map((r) => (
                        <tr
                          key={r.port}
                          className={r.status === 'open' ? 'bg-emerald-500/5' : 'hover:bg-[#161618]'}
                        >
                          <td className="py-2.5 px-4 font-mono font-bold text-white">
                            {r.port} / TCP
                          </td>
                          <td className="py-2.5 px-4 font-mono">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                r.status === 'open'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : r.status === 'filtered'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-[#1C1C1E] text-gray-500 border-[#222224]'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-gray-300">
                            {r.service}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-gray-400">
                            {r.latencyMs} ms
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ICMP PING */}
        {activeTab === 'ping' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl bg-[#111112] border border-[#222224] flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                  Target Host or IP
                </label>
                <input
                  type="text"
                  value={pingHost}
                  onChange={(e) => setPingHost(e.target.value)}
                  placeholder="8.8.8.8 or one.one.one.one"
                  className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-white font-mono text-xs focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="w-24">
                <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                  Packets
                </label>
                <select
                  value={pingCount}
                  onChange={(e) => setPingCount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-white font-mono text-xs focus:outline-hidden"
                >
                  <option value={4}>4</option>
                  <option value={8}>8</option>
                  <option value={10}>10</option>
                </select>
              </div>

              <div className="w-full sm:w-auto self-end">
                <button
                  onClick={handlePing}
                  disabled={isPinging || !pingHost}
                  className="w-full sm:w-auto px-5 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-40"
                >
                  <Radio className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                  <span>{isPinging ? 'Pinging...' : 'Send Ping'}</span>
                </button>
              </div>
            </div>

            {pingResult && (
              <div className="space-y-3">
                {/* Stats Summary Card */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 rounded-lg bg-[#111112] border border-[#222224]">
                    <span className="text-[10px] text-gray-500 uppercase font-mono block">Loss</span>
                    <span className="text-sm font-bold text-white font-mono">{pingResult.lossPercent}%</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#111112] border border-[#222224]">
                    <span className="text-[10px] text-gray-500 uppercase font-mono block">Min RTT</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">{pingResult.minLatency} ms</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#111112] border border-[#222224]">
                    <span className="text-[10px] text-gray-500 uppercase font-mono block">Avg RTT</span>
                    <span className="text-sm font-bold text-white font-mono">{pingResult.avgLatency} ms</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#111112] border border-[#222224]">
                    <span className="text-[10px] text-gray-500 uppercase font-mono block">Max RTT</span>
                    <span className="text-sm font-bold text-amber-400 font-mono">{pingResult.maxLatency} ms</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#111112] border border-[#222224]">
                    <span className="text-[10px] text-gray-500 uppercase font-mono block">Jitter</span>
                    <span className="text-sm font-bold text-gray-300 font-mono">{pingResult.jitter} ms</span>
                  </div>
                </div>

                {/* Packet List */}
                <div className="rounded-xl bg-[#111112] border border-[#222224] p-4 font-mono text-xs space-y-1.5">
                  <div className="text-gray-500 text-[11px] mb-2">
                    PING {pingResult.host} ({pingResult.resolvedIp}): 56 data bytes
                  </div>
                  {pingResult.packets.map((pkt) => (
                    <div key={pkt.seq} className="flex items-center justify-between text-gray-300">
                      <span>
                        64 bytes from {pingResult.resolvedIp}: icmp_seq={pkt.seq} time={pkt.latencyMs} ms
                      </span>
                      <span className="text-emerald-400 text-[10px]">SUCCESS</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TRACEROUTE */}
        {activeTab === 'traceroute' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl bg-[#111112] border border-[#222224] flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                  Destination Host
                </label>
                <input
                  type="text"
                  value={traceHost}
                  onChange={(e) => setTraceHost(e.target.value)}
                  placeholder="1.1.1.1"
                  className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-white font-mono text-xs focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="w-full sm:w-auto self-end">
                <button
                  onClick={handleTraceroute}
                  disabled={isTracing || !traceHost}
                  className="w-full sm:w-auto px-5 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-40"
                >
                  <Layers className={`w-3.5 h-3.5 ${isTracing ? 'animate-spin' : ''}`} />
                  <span>{isTracing ? 'Tracing Route...' : 'Start Trace'}</span>
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-[#111112] border border-[#222224] p-4 space-y-3">
              <div className="text-xs font-mono text-gray-400 border-b border-[#222224] pb-2">
                Traceroute to {traceHost}, 30 hops max, 60 byte packets
              </div>
              <div className="space-y-2 font-mono text-xs">
                {hops.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-xs">
                    No traceroute performed yet. Enter a target host and click "Run Trace".
                  </div>
                ) : (
                  hops.map((hop) => (
                    <div
                      key={hop.hop}
                      className="p-2.5 rounded-lg bg-[#0A0A0B] border border-[#222224] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#1C1C1E] text-emerald-400 flex items-center justify-center font-bold text-[11px]">
                          {hop.hop}
                        </span>
                        <div>
                          <div className="font-bold text-white">{hop.hostname} ({hop.ip})</div>
                          <div className="text-[11px] text-gray-500">{hop.as}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-emerald-400 font-mono text-[11px]">
                        <span>{hop.rtt1}</span>
                        <span className="text-gray-600">/</span>
                        <span>{hop.rtt2}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DNS / WHOIS */}
        {activeTab === 'dns' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl bg-[#111112] border border-[#222224] flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                  Domain Name
                </label>
                <input
                  type="text"
                  value={dnsDomain}
                  onChange={(e) => setDnsDomain(e.target.value)}
                  placeholder="google.com"
                  className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-white font-mono text-xs focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="w-28">
                <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                  Record Type
                </label>
                <select
                  value={dnsType}
                  onChange={(e) => setDnsType(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-white font-mono text-xs focus:outline-hidden"
                >
                  <option value="A">A (IPv4)</option>
                  <option value="AAAA">AAAA (IPv6)</option>
                  <option value="MX">MX (Mail)</option>
                  <option value="TXT">TXT (SPF/DKIM)</option>
                  <option value="NS">NS (Name Server)</option>
                  <option value="CNAME">CNAME</option>
                  <option value="SOA">SOA</option>
                </select>
              </div>

              <div className="w-full sm:w-auto self-end">
                <button
                  onClick={handleDnsLookup}
                  disabled={isResolvingDns || !dnsDomain}
                  className="w-full sm:w-auto px-5 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-40"
                >
                  <Search className={`w-3.5 h-3.5 ${isResolvingDns ? 'animate-spin' : ''}`} />
                  <span>Query DNS</span>
                </button>
              </div>
            </div>

            {/* DNS Records Output */}
            <div className="rounded-xl bg-[#111112] border border-[#222224] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#222224] pb-2 text-xs font-mono text-gray-400">
                <span>DNS Query: {dnsDomain} ({dnsType})</span>
                <span>{dnsRecords.length} records returned</span>
              </div>

              {dnsRecords.length === 0 ? (
                <div className="text-gray-500 text-xs py-4 text-center">No {dnsType} records found.</div>
              ) : (
                <div className="divide-y divide-[#222224] font-mono text-xs">
                  {dnsRecords.map((rec, i) => (
                    <div key={i} className="py-2.5 flex items-center justify-between text-gray-300">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          {rec.type || dnsType}
                        </span>
                        <span>{rec.address || rec.exchange || rec.value || rec.nameserver || rec.target || JSON.stringify(rec)}</span>
                      </div>
                      {rec.ttl && <span className="text-gray-500 text-[11px]">TTL: {rec.ttl}s</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: WAKE ON LAN */}
        {activeTab === 'wol' && (
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="p-5 rounded-xl bg-[#111112] border border-[#222224] space-y-4">
              <div className="flex items-center gap-2 border-b border-[#222224] pb-3">
                <Power className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">Wake on LAN (WoL) Magic Packet</h2>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                    Target MAC Address
                  </label>
                  <input
                    type="text"
                    value={wolMac}
                    onChange={(e) => setWolMac(e.target.value)}
                    placeholder="00:11:22:33:44:55 or AA-BB-CC-DD-EE-FF"
                    className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-white font-mono text-xs focus:outline-hidden focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Ethernet MAC address of the target server network interface card.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                      Broadcast IP
                    </label>
                    <input
                      type="text"
                      value={wolBroadcast}
                      onChange={(e) => setWolBroadcast(e.target.value)}
                      placeholder="255.255.255.255"
                      className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-white font-mono text-xs focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                      UDP Port (7 or 9)
                    </label>
                    <input
                      type="number"
                      value={wolPort}
                      onChange={(e) => setWolPort(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-white font-mono text-xs focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Magic Packet Payload Preview */}
                <div className="p-3 rounded-lg bg-[#0A0A0B] border border-[#222224] space-y-1">
                  <div className="text-[10px] text-gray-500 uppercase font-mono">
                    Constructed Magic Packet Payload (102 bytes total)
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400 break-all">
                    FF FF FF FF FF FF {wolMac.replace(/[^0-9A-Fa-f]/g, '').substring(0, 12).match(/.{1,2}/g)?.join(' ') || '00 11 22 33 44 55'} × 16
                  </div>
                </div>

                {wolStatus && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                    {wolStatus}
                  </div>
                )}

                <button
                  onClick={handleSendWol}
                  className="w-full py-2.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <Power className="w-4 h-4" />
                  <span>Broadcast Magic Packet</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. Subnet Calculator & CIDR Math */}
        {activeTab === 'subnet' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-[#111112] border border-[#222224] rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span>IPv4 Subnet &amp; CIDR Mask Calculator</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-medium">IP Address</label>
                  <input
                    type="text"
                    value={subnetIp}
                    onChange={(e) => setSubnetIp(e.target.value)}
                    placeholder="e.g. 192.168.1.10"
                    className="w-full px-3 py-2 rounded-lg bg-[#18181A] border border-[#222224] text-xs font-mono text-emerald-400 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-gray-400 font-medium">CIDR Prefix</label>
                    <span className="text-xs font-mono text-emerald-400">/{subnetCidr}</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={32}
                    value={subnetCidr}
                    onChange={(e) => setSubnetCidr(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-2 text-xs pt-1">
                <span className="text-gray-500">Quick Presets:</span>
                {[
                  { label: '/24 (Class C - 254 hosts)', cidr: 24 },
                  { label: '/28 (14 hosts)', cidr: 28 },
                  { label: '/29 (6 hosts)', cidr: 29 },
                  { label: '/30 (2 hosts - P2P)', cidr: 30 },
                  { label: '/16 (Class B - 65k hosts)', cidr: 16 },
                ].map((item) => (
                  <button
                    key={item.cidr}
                    onClick={() => setSubnetCidr(item.cidr)}
                    className={`px-2.5 py-1 rounded-md border text-[11px] font-mono transition-colors ${
                      subnetCidr === item.cidr
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold'
                        : 'bg-[#18181A] border-[#222224] text-gray-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calculated Results Table */}
            {(() => {
              if (!subnetIp.trim()) {
                return (
                  <div className="p-8 text-center text-xs text-gray-500 font-mono">
                    Enter an IPv4 address above to compute network boundaries, subnet mask, and host capacity.
                  </div>
                );
              }
              const calc = calculateSubnet(subnetIp, subnetCidr);
              if (!calc) {
                return (
                  <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 text-xs text-red-400">
                    Invalid IPv4 format. Please enter a valid address like 10.0.0.1 or 172.16.0.1.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                  <div className="bg-[#111112] border border-[#222224] rounded-xl p-4 space-y-3">
                    <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Network Boundaries
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between p-2 rounded bg-[#0A0A0B] border border-[#222224]">
                        <span className="text-gray-400">Network Address:</span>
                        <span className="text-emerald-400 font-bold">{calc.network}</span>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-[#0A0A0B] border border-[#222224]">
                        <span className="text-gray-400">Broadcast Address:</span>
                        <span className="text-amber-400 font-bold">{calc.broadcast}</span>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-[#0A0A0B] border border-[#222224]">
                        <span className="text-gray-400">Subnet Mask:</span>
                        <span className="text-white">{calc.mask}</span>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-[#0A0A0B] border border-[#222224]">
                        <span className="text-gray-400">Wildcard Mask:</span>
                        <span className="text-gray-300">{calc.wildcard}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#111112] border border-[#222224] rounded-xl p-4 space-y-3">
                    <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Usable Host Scope
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between p-2 rounded bg-[#0A0A0B] border border-[#222224]">
                        <span className="text-gray-400">First Usable Host:</span>
                        <span className="text-emerald-300 font-bold">{calc.firstUsable}</span>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-[#0A0A0B] border border-[#222224]">
                        <span className="text-gray-400">Last Usable Host:</span>
                        <span className="text-emerald-300 font-bold">{calc.lastUsable}</span>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-[#0A0A0B] border border-[#222224]">
                        <span className="text-gray-400">Total Usable Hosts:</span>
                        <span className="text-white font-bold">{calc.usableHosts.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-[#0A0A0B] border border-[#222224]">
                        <span className="text-gray-400">Binary Mask:</span>
                        <span className="text-gray-400 text-[10px] truncate">{calc.binaryMask}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 7. IP Range Discovery Scanner */}
        {activeTab === 'ipscan' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="bg-[#111112] border border-[#222224] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Network className="w-4 h-4 text-emerald-400" />
                  <span>Subnet Ping Sweep &amp; Service Discovery</span>
                </div>
                <span className="text-xs text-gray-400 font-mono">
                  Range: {scanSubnet}.{scanRangeStart} — {scanSubnet}.{scanRangeEnd}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-medium">Subnet Prefix</label>
                  <input
                    type="text"
                    value={scanSubnet}
                    onChange={(e) => setScanSubnet(e.target.value)}
                    placeholder="e.g. 192.168.1"
                    className="w-full px-3 py-2 rounded-lg bg-[#18181A] border border-[#222224] text-xs font-mono text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-medium">Start Host</label>
                  <input
                    type="number"
                    min={1}
                    max={254}
                    value={scanRangeStart}
                    onChange={(e) => setScanRangeStart(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#18181A] border border-[#222224] text-xs font-mono text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-medium">End Host</label>
                  <input
                    type="number"
                    min={scanRangeStart}
                    max={254}
                    value={scanRangeEnd}
                    onChange={(e) => setScanRangeEnd(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#18181A] border border-[#222224] text-xs font-mono text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                onClick={handleSweepSubnet}
                disabled={isSweeping}
                className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 disabled:opacity-40"
              >
                {isSweeping ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sweeping Subnet Range...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Scan Range ({scanRangeEnd - scanRangeStart + 1} Addresses)</span>
                  </>
                )}
              </button>
            </div>

            {/* Discovered Hosts Table */}
            <div className="bg-[#111112] border border-[#222224] rounded-xl overflow-hidden">
              <div className="p-3 bg-[#18181A] border-b border-[#222224] flex items-center justify-between text-xs font-semibold text-gray-300">
                <span>Discovered Network Devices ({discoveredHosts.filter((h) => h.status === 'online').length} Online)</span>
                <span className="font-mono text-gray-400">Fast SYN/ICMP Sweep</span>
              </div>

              <div className="divide-y divide-[#222224] max-h-96 overflow-y-auto">
                {discoveredHosts.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-xs">
                    No scan performed yet. Click "Start Sweep" to scan the selected subnet range.
                  </div>
                ) : (
                  discoveredHosts.map((host) => (
                    <div
                      key={host.ip}
                      className={`p-3 flex items-center justify-between text-xs transition-colors ${
                        host.status === 'online' ? 'hover:bg-[#1C1C1E]' : 'opacity-40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            host.status === 'online' ? 'bg-emerald-500' : 'bg-gray-600'
                          }`}
                        />
                        <div>
                          <div className="font-mono font-bold text-white flex items-center gap-2">
                            <span>{host.ip}</span>
                            {host.status === 'online' && (
                              <span className="text-[10px] font-sans font-normal text-gray-400">
                                ({host.hostname})
                              </span>
                            )}
                          </div>
                          {host.vendor && (
                            <div className="text-[10px] text-gray-500 font-sans">
                              Vendor: {host.vendor}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {host.status === 'online' && (
                          <>
                            <div className="flex items-center gap-1 font-mono text-[10px] text-gray-400">
                              <span>Open Ports:</span>
                              {host.openPorts.map((p) => (
                                <span
                                  key={p}
                                  className={`px-1.5 py-0.5 rounded font-bold ${
                                    p === 22
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-[#222224] text-gray-300'
                                  }`}
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                            <span className="font-mono text-[10px] text-gray-500">{host.latencyMs}ms</span>
                          </>
                        )}

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase ${
                            host.status === 'online'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-gray-800 text-gray-500'
                          }`}
                        >
                          {host.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
