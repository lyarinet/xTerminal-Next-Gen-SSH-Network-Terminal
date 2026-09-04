import React, { useState } from 'react';
import { Server, ArrowRight, X, Shield, Terminal, Key, Eye, EyeOff } from 'lucide-react';
import { Host, Identity } from '../types';

interface QuickConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  hosts: Host[];
  identities: Identity[];
  onConnect: (connectionDetails: {
    name: string;
    hostname: string;
    port: number;
    username: string;
    password?: string;
    identityId?: string;
  }) => void;
}

export const QuickConnectModal: React.FC<QuickConnectModalProps> = ({
  isOpen,
  onClose,
  hosts,
  identities,
  onConnect,
}) => {
  const [protocol, setProtocol] = useState<string>('SSH');
  const [quickString, setQuickString] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedSavedHostId, setSelectedSavedHostId] = useState('');
  const [selectedIdentityId, setSelectedIdentityId] = useState(identities[0]?.id || '');
  const [error, setError] = useState('');

  const protocols = [
    { id: 'SSH', label: 'SSH', port: 22 },
    { id: 'SFTP', label: 'SFTP', port: 22 },
    { id: 'TELNET', label: 'Telnet', port: 23 },
    { id: 'MOSH', label: 'Mosh', port: 60001 },
    { id: 'SERIAL', label: 'Serial TTY', port: 115200 },
    { id: 'DOCKER', label: 'Docker Exec', port: 2375 },
    { id: 'K8S', label: 'K8s Exec', port: 6443 },
    { id: 'RDP', label: 'RDP Desktop', port: 3389 },
    { id: 'VNC', label: 'VNC Desktop', port: 5900 },
    { id: 'WINBOX', label: 'WinBox', port: 8291 },
    { id: 'FTP', label: 'FTP/FTPS', port: 21 },
    { id: 'LOCAL', label: 'Local Shell', port: 0 },
  ];

  if (!isOpen) return null;

  const handleSelectProtocol = (p: typeof protocols[0]) => {
    setProtocol(p.id);
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedSavedHostId) {
      const h = hosts.find((item) => item.id === selectedSavedHostId);
      if (h) {
        onConnect({
          name: h.name,
          hostname: h.hostname,
          port: h.port,
          username: h.username,
          password: password.trim() || h.password,
          identityId: h.identityId || selectedIdentityId,
        });
        onClose();
        return;
      }
    }

    if (protocol === 'LOCAL') {
      onConnect({
        name: 'Local Workstation Terminal',
        hostname: 'localhost',
        port: 0,
        username: 'local',
      });
      onClose();
      return;
    }

    if (!quickString.trim()) {
      setError('Please provide a host or select a saved server.');
      return;
    }

    // Default port based on protocol
    const defPort = protocols.find((p) => p.id === protocol)?.port || 22;
    let username = 'deploy';
    let hostname = quickString.trim();
    let port = defPort;

    if (hostname.includes('@')) {
      const [u, rest] = hostname.split('@');
      username = u;
      hostname = rest;
    }

    if (hostname.includes(':')) {
      const [h, p] = hostname.split(':');
      hostname = h;
      const parsedPort = parseInt(p, 10);
      if (!isNaN(parsedPort)) port = parsedPort;
    }

    if (!hostname) {
      setError('Invalid hostname format');
      return;
    }

    onConnect({
      name: `[${protocol}] ${username}@${hostname}`,
      hostname,
      port,
      username,
      password: password.trim() || undefined,
      identityId: selectedIdentityId || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-[#111112] border border-[#222224] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-[#222224] flex items-center justify-between bg-[#0A0A0B]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-white text-sm">Universal Remote Connect</h3>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {protocol}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Protocol Selector Chips */}
        <div className="p-3 border-b border-[#222224] bg-[#0E0E10] flex items-center gap-1.5 overflow-x-auto">
          {protocols.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectProtocol(p)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium shrink-0 transition-colors ${
                protocol === p.id
                  ? 'bg-emerald-500 text-black font-bold shadow-xs'
                  : 'bg-[#1C1C1E] text-gray-400 hover:text-white hover:bg-[#252528]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleConnect} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-gray-300 font-medium mb-1">
              Direct Address / SSH String
            </label>
            <input
              type="text"
              value={quickString}
              onChange={(e) => {
                setQuickString(e.target.value);
                setSelectedSavedHostId('');
              }}
              placeholder="e.g. root@192.168.1.50 or deploy@my-server.com:2222"
              className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 font-mono focus:outline-hidden focus:border-emerald-500 placeholder-gray-600"
              autoFocus
            />
            <span className="text-[11px] text-gray-500 mt-1 block">
              Format: <code>username@host:port</code> (port defaults to 22)
            </span>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#222224] w-full" />
            <span className="bg-[#111112] px-2 text-[10px] text-gray-500 uppercase font-mono tracking-wider absolute">
              or select saved
            </span>
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-1">Saved Inventory Server</label>
            <select
              value={selectedSavedHostId}
              onChange={(e) => {
                setSelectedSavedHostId(e.target.value);
                if (e.target.value) setQuickString('');
              }}
              className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-200 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="">-- Choose from inventory ({hosts.length} available) --</option>
              {hosts.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.username}@{h.hostname}:{h.port}) - {h.environment}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-1">Authentication Identity</label>
            <select
              value={selectedIdentityId}
              onChange={(e) => setSelectedIdentityId(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-200 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="">Default (Password prompt / Agent)</option>
              {identities.map((id) => (
                <option key={id.id} value={id.id}>
                  {id.name} ({id.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-1">
              Server Password <span className="text-gray-500 font-normal">(Optional - or type in terminal)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full px-3 py-2 pr-10 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 font-mono focus:outline-hidden focus:border-emerald-500 placeholder-gray-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                title={showPassword ? 'Hide' : 'Show'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && <div className="text-red-400 text-xs font-medium">{error}</div>}

          <div className="pt-2 border-t border-[#222224] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224] font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center gap-1.5 shadow-sm"
            >
              <span>Connect Tab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
