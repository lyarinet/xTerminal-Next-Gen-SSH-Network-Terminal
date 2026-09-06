import React, { useState, useEffect } from 'react';
import {
  Search,
  Server,
  Terminal,
  FileCode,
  Shield,
  Radio,
  Zap,
  Lock,
  Settings,
  Activity,
  ArrowRight,
  X
} from 'lucide-react';
import { Host, Snippet, PortForward } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  hosts: Host[];
  snippets: Snippet[];
  portForwards: PortForward[];
  onSelectHost: (host: Host) => void;
  onSelectView: (view: string) => void;
  onLockVault: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  hosts,
  snippets,
  onSelectHost,
  onSelectView,
  onLockVault,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredHosts = hosts.filter(
    (h) =>
      h.name.toLowerCase().includes(query.toLowerCase()) ||
      h.hostname.toLowerCase().includes(query.toLowerCase()) ||
      h.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredSnippets = snippets.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.command.toLowerCase().includes(query.toLowerCase())
  );

  const quickActions = [
    { label: 'Open Terminal Workspace', view: 'terminal', icon: Terminal },
    { label: 'Browse SFTP File Manager', view: 'sftp', icon: FileCode },
    { label: 'Manage Port Forwarding Tunnels', view: 'forwarding', icon: Radio },
    { label: 'Network Diagnostics Toolkit', view: 'network', icon: Activity },
    { label: 'Diagnostics & System Health', view: 'monitoring', icon: Activity },
    { label: 'Inspect Known Hosts & Fingerprints', view: 'knownHosts', icon: Shield },
    { label: 'Open Encrypted Vault & Identities', view: 'vault', icon: Lock },
    { label: 'Workstation Preferences & Settings', view: 'settings', icon: Settings },
  ].filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[#111112] border border-[#222224] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[#222224] bg-[#0A0A0B]">
          <Search className="w-5 h-5 text-emerald-400 mr-3 shrink-0" />
          <input
            type="text"
            className="w-full bg-transparent text-gray-100 placeholder-gray-500 text-base focus:outline-hidden font-sans"
            placeholder="Search hosts, commands, snippets, or actions... (Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-gray-400 hover:text-white p-1 mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-2 py-0.5 text-xs text-gray-400 bg-[#1C1C1E] border border-[#222224] rounded font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto divide-y divide-[#222224] p-2 text-sm">
          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <div className="py-2">
              <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Navigation &amp; Actions
              </div>
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.view}
                    onClick={() => {
                      onSelectView(action.view);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#1C1C1E] text-gray-200 hover:text-white group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-[#1C1C1E] flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span>{action.label}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Hosts */}
          {filteredHosts.length > 0 && (
            <div className="py-2">
              <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                <span>Servers ({filteredHosts.length})</span>
                <span className="text-[10px] text-gray-500">Press enter to connect</span>
              </div>
              {filteredHosts.map((host) => (
                <button
                  key={host.id}
                  onClick={() => {
                    onSelectHost(host);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#1C1C1E] text-gray-200 hover:text-white group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md bg-[#1C1C1E] flex items-center justify-center text-emerald-400">
                      <Server className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-white flex items-center gap-2">
                        {host.name}
                        <span className="text-[11px] px-1.5 py-0.2 rounded-md bg-[#1C1C1E] border border-[#222224] text-emerald-400 font-mono">
                          {host.hostname}:{host.port}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{host.description || host.username}</div>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 group-hover:underline">Connect SSH →</span>
                </button>
              ))}
            </div>
          )}

          {/* Snippets */}
          {filteredSnippets.length > 0 && (
            <div className="py-2">
              <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Command Snippets ({filteredSnippets.length})
              </div>
              {filteredSnippets.map((snippet) => (
                <button
                  key={snippet.id}
                  onClick={() => {
                    onSelectView('snippets');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#1C1C1E] text-gray-200 hover:text-white group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md bg-[#1C1C1E] flex items-center justify-center text-amber-400">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-white">{snippet.name}</div>
                      <div className="text-xs text-gray-400 font-mono truncate max-w-md">{snippet.command}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-semibold ${
                    snippet.riskLevel === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-800' :
                    snippet.riskLevel === 'HIGH' ? 'bg-orange-950 text-orange-300' :
                    snippet.riskLevel === 'MEDIUM' ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'
                  }`}>
                    {snippet.riskLevel}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Security shortcut */}
          <div className="py-2">
            <button
              onClick={() => {
                onLockVault();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-950/40 text-red-300 group transition-colors"
            >
              <div className="w-7 h-7 rounded-md bg-red-900/30 flex items-center justify-center text-red-400">
                <Lock className="w-4 h-4" />
              </div>
              <span>Lock Encrypted Vault Immediately</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#0A0A0B] border-t border-[#222224] flex items-center justify-between text-xs text-gray-500">
          <span>Tip: Press <kbd className="font-mono text-gray-400">Ctrl + K</kbd> anywhere to open</span>
          <span className="text-emerald-500/80">NexusTerm Security Layer Active</span>
        </div>
      </div>
    </div>
  );
};
