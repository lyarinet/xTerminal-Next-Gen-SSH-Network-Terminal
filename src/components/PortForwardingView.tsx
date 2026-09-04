import React, { useState } from 'react';
import {
  Radio,
  Plus,
  Play,
  Square,
  ArrowRight,
  Server,
  Activity,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  X
} from 'lucide-react';
import { PortForward, Host } from '../types';

interface PortForwardingViewProps {
  portForwards: PortForward[];
  hosts: Host[];
  onToggleTunnel: (tunnelId: string) => void;
  onSaveTunnel: (tunnel: PortForward) => void;
  onDeleteTunnel: (tunnelId: string) => void;
}

export const PortForwardingView: React.FC<PortForwardingViewProps> = ({
  portForwards,
  hosts,
  onToggleTunnel,
  onSaveTunnel,
  onDeleteTunnel,
}) => {
  const [selectedTunnelLogs, setSelectedTunnelLogs] = useState<PortForward | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formHostId, setFormHostId] = useState(hosts[0]?.id || '');
  const [formType, setFormType] = useState<'local' | 'remote' | 'dynamic'>('local');
  const [formBindAddress, setFormBindAddress] = useState('127.0.0.1');
  const [formBindPort, setFormBindPort] = useState(8080);
  const [formTargetHost, setFormTargetHost] = useState('127.0.0.1');
  const [formTargetPort, setFormTargetPort] = useState(80);
  const [formAutoStart, setFormAutoStart] = useState(true);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return;

    const newTunnel: PortForward = {
      id: `pf-${Date.now()}`,
      name: formName,
      hostId: formHostId,
      type: formType,
      bindAddress: formBindAddress,
      bindPort: Number(formBindPort),
      targetHost: formType === 'dynamic' ? '*' : formTargetHost,
      targetPort: formType === 'dynamic' ? 0 : Number(formTargetPort),
      status: 'stopped',
      autoStart: formAutoStart,
      bytesTransferred: 0,
      logs: [`[${new Date().toLocaleTimeString()}] Tunnel definition initialized`],
    };

    onSaveTunnel(newTunnel);
    setIsAddModalOpen(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0B] text-[#E0E0E0] p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">SSH Port Forwarding &amp; Tunnels</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              LOCAL / REMOTE / SOCKS5
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Forward database ports, private web apps, and establish encrypted SOCKS proxies.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-3.5 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Tunnel</span>
        </button>
      </div>

      {/* Tunnels List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {portForwards.map((pf) => {
          const host = hosts.find((h) => h.id === pf.hostId);
          const isActive = pf.status === 'active';

          return (
            <div
              key={pf.id}
              className={`p-4 rounded-xl border transition-all ${
                isActive
                  ? 'bg-[#111112] border-emerald-500/40 shadow-sm shadow-emerald-500/5'
                  : 'bg-[#111112] border-[#222224] hover:border-[#333336]'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Info & Topology */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'
                      }`}
                    />
                    <h3 className="font-semibold text-white text-sm tracking-tight">{pf.name}</h3>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-emerald-400 font-medium">
                      {pf.type.toUpperCase()} FORWARD
                    </span>
                    {pf.autoStart && (
                      <span className="text-[10px] font-mono text-gray-400">AUTO-START</span>
                    )}
                  </div>

                  {/* Visual Topology Diagram */}
                  <div className="flex items-center gap-2 text-xs font-mono text-gray-300 bg-[#0A0A0B] px-3 py-1.5 rounded-md border border-[#222224] inline-flex">
                    <span className="text-emerald-400">
                      {pf.bindAddress}:{pf.bindPort}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-300 flex items-center gap-1">
                      <Server className="w-3 h-3 text-emerald-400" />
                      {host?.name || 'SSH Host'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-emerald-400">
                      {pf.type === 'dynamic' ? 'SOCKS5 Dynamic' : `${pf.targetHost}:${pf.targetPort}`}
                    </span>
                  </div>
                </div>

                {/* Right: Telemetry & Controls */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="text-right">
                    <div className="text-[11px] text-gray-400">Transferred</div>
                    <div className="font-mono text-gray-200 font-medium">{formatBytes(pf.bytesTransferred)}</div>
                  </div>

                  <button
                    onClick={() => setSelectedTunnelLogs(pf)}
                    className="p-2 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224] transition-colors"
                    title="View Tunnel Activity Logs"
                  >
                    <FileText className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDeleteTunnel(pf.id)}
                    className="p-2 rounded-md bg-[#1C1C1E] hover:bg-red-950/40 text-gray-400 hover:text-red-400 border border-[#222224] transition-colors"
                    title="Delete Tunnel"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onToggleTunnel(pf.id)}
                    className={`px-4 py-2 rounded-md font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs ${
                      isActive
                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Logs Modal */}
      {selectedTunnelLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-xl bg-[#111112] border border-[#222224] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-5 py-3.5 border-b border-[#222224] flex items-center justify-between bg-[#0A0A0B]">
              <h3 className="font-semibold text-white text-sm">
                Tunnel Logs: {selectedTunnelLogs.name}
              </h3>
              <button
                onClick={() => setSelectedTunnelLogs(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-[#0A0A0B] font-mono text-xs text-gray-300 overflow-y-auto space-y-1 flex-1">
              {selectedTunnelLogs.logs.map((log, idx) => (
                <div key={idx} className="whitespace-pre-wrap">{log}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Tunnel Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#111112] border border-[#222224] rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-[#222224] flex items-center justify-between bg-[#0A0A0B]">
              <h3 className="font-semibold text-white text-sm">Create SSH Port Forward</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 font-medium mb-1">Tunnel Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Postgres DB Local Tunnel"
                  className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 focus:outline-hidden focus:border-emerald-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Tunnel Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="local">Local Forward</option>
                    <option value="remote">Remote Forward</option>
                    <option value="dynamic">Dynamic SOCKS5</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 font-medium mb-1">SSH Server</label>
                  <select
                    value={formHostId}
                    onChange={(e) => setFormHostId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 focus:outline-hidden focus:border-emerald-500"
                  >
                    {hosts.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Local Bind Address</label>
                  <input
                    type="text"
                    value={formBindAddress}
                    onChange={(e) => setFormBindAddress(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Local Port *</label>
                  <input
                    type="number"
                    required
                    value={formBindPort}
                    onChange={(e) => setFormBindPort(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {formType !== 'dynamic' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 font-medium mb-1">Remote Target Host</label>
                    <input
                      type="text"
                      value={formTargetHost}
                      onChange={(e) => setFormTargetHost(e.target.value)}
                      placeholder="127.0.0.1"
                      className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 focus:outline-hidden focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 font-medium mb-1">Remote Target Port</label>
                    <input
                      type="number"
                      value={formTargetPort}
                      onChange={(e) => setFormTargetPort(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 focus:outline-hidden focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autostart"
                  checked={formAutoStart}
                  onChange={(e) => setFormAutoStart(e.target.checked)}
                  className="rounded bg-[#1C1C1E] border-[#222224] text-emerald-500 focus:ring-0 accent-emerald-500"
                />
                <label htmlFor="autostart" className="text-gray-300">
                  Auto-start tunnel on application launch
                </label>
              </div>

              <div className="pt-3 border-t border-[#222224] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-sm"
                >
                  Create Tunnel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
