import React, { useState } from 'react';
import {
  Puzzle,
  Download,
  Check,
  Star,
  Settings,
  Trash2,
  Search,
  ExternalLink,
  Code2,
  Power,
  Layers,
  Sparkles,
  Cloud,
  Terminal,
  Server,
  Zap,
  HardDrive
} from 'lucide-react';
import { PluginItem } from '../types';

export const PluginsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace' | 'sdk'>('installed');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [configPlugin, setConfigPlugin] = useState<PluginItem | null>(null);

  const [plugins, setPlugins] = useState<PluginItem[]>([
    {
      id: 'plugin-aws-ec2',
      name: 'AWS EC2 Dynamic Inventory',
      version: '1.4.2',
      author: 'xTerminalx Team',
      description: 'Automatically synchronizes and discovers AWS EC2 instances across regions with security group tagging.',
      category: 'integration',
      icon: 'cloud',
      installed: true,
      enabled: true,
      downloads: 48200,
      rating: 4.9,
      settings: {
        region: 'us-east-1',
        syncIntervalMinutes: 15,
        tagFilters: 'Environment=Production,Stack=Core',
      },
    },
    {
      id: 'plugin-k8s-pod-exec',
      name: 'Kubernetes Pod Shell & Logs',
      version: '2.0.1',
      author: 'CloudNative Labs',
      description: 'Stream logs and drop directly into interactive kubectl exec shells inside Kubernetes pods and namespaces.',
      category: 'protocol',
      icon: 'layers',
      installed: true,
      enabled: true,
      downloads: 62400,
      rating: 4.8,
      settings: {
        kubeconfigPath: '~/.kube/config',
        defaultNamespace: 'default',
      },
    },
    {
      id: 'plugin-docker-exec',
      name: 'Docker Engine Direct Terminal',
      version: '1.1.0',
      author: 'Mobius Containers',
      description: 'Direct interactive pseudo-terminal attachment into Docker containers without requiring an SSH daemon inside.',
      category: 'protocol',
      icon: 'terminal',
      installed: true,
      enabled: true,
      downloads: 39100,
      rating: 4.7,
      settings: {
        dockerSocket: '/var/run/docker.sock',
      },
    },
    {
      id: 'plugin-telnet-mosh',
      name: 'Mosh & Telnet Legacy Adapter',
      version: '1.0.8',
      author: 'NetOps Global',
      description: 'Adds mobile shell (Mosh) UDP roaming support and RFC 854 Telnet console emulation for legacy switches.',
      category: 'protocol',
      icon: 'zap',
      installed: false,
      enabled: false,
      downloads: 18400,
      rating: 4.6,
    },
    {
      id: 'plugin-ansible-runner',
      name: 'Ansible Playbook Orchestrator',
      version: '2.3.0',
      author: 'RedStack Systems',
      description: 'Execute ad-hoc Ansible commands and playbooks directly against your xTerminalx host inventory.',
      category: 'tool',
      icon: 'server',
      installed: false,
      enabled: false,
      downloads: 29500,
      rating: 4.9,
    },
    {
      id: 'plugin-zstd-sftp',
      name: 'Zstandard SFTP Accelerator',
      version: '1.2.4',
      author: 'xTerminalx HighPerf',
      description: 'Real-time LZ4/Zstandard compression streaming for 4x faster file transfers on slow network links.',
      category: 'tool',
      icon: 'harddrive',
      installed: false,
      enabled: false,
      downloads: 14100,
      rating: 4.8,
    },
  ]);

  const handleToggleEnable = (id: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const handleInstallPlugin = (id: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, installed: true, enabled: true } : p))
    );
  };

  const handleUninstallPlugin = (id: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, installed: false, enabled: false } : p))
    );
  };

  const filteredPlugins = plugins.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;

    if (activeTab === 'installed') {
      return p.installed && matchesSearch && matchesCategory;
    }
    if (activeTab === 'marketplace') {
      return matchesSearch && matchesCategory;
    }
    return true;
  });

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'cloud':
        return Cloud;
      case 'layers':
        return Layers;
      case 'terminal':
        return Terminal;
      case 'server':
        return Server;
      case 'zap':
        return Zap;
      case 'harddrive':
        return HardDrive;
      default:
        return Puzzle;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0B] text-[#E0E0E0] overflow-hidden font-sans">
      {/* Top Header */}
      <div className="p-4 border-b border-[#222224] bg-[#111112] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Puzzle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              Plugin Marketplace & SDK
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
                EXTENSIONS
              </span>
            </div>
            <div className="text-xs text-gray-400">
              Extend xTerminalx with custom protocols, cloud integrations, and terminal widgets.
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-[#1C1C1E] p-1 rounded-lg border border-[#222224] text-xs">
          <button
            onClick={() => setActiveTab('installed')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'installed'
                ? 'bg-emerald-500 text-black font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Installed ({plugins.filter((p) => p.installed).length})
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'marketplace'
                ? 'bg-emerald-500 text-black font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Marketplace
          </button>
          <button
            onClick={() => setActiveTab('sdk')}
            className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'sdk'
                ? 'bg-emerald-500 text-black font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Plugin SDK</span>
          </button>
        </div>
      </div>

      {activeTab !== 'sdk' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-[#222224] bg-[#0E0E10] flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search extensions by name or keyword..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#18181A] border border-[#222224] text-xs text-white placeholder-gray-500 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#18181A] border border-[#222224] text-xs text-gray-300 focus:outline-hidden"
              >
                <option value="all">All Categories</option>
                <option value="protocol">Protocols (Mosh, Telnet, K8s)</option>
                <option value="integration">Cloud & Providers</option>
                <option value="tool">Performance & Tools</option>
              </select>
            </div>
          </div>

          {/* Plugin Cards Grid */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlugins.map((plugin) => {
              const IconComp = getIcon(plugin.icon);
              return (
                <div
                  key={plugin.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    plugin.installed
                      ? 'bg-[#111112] border-[#222224]'
                      : 'bg-[#0E0E10] border-[#1C1C1E] hover:border-[#2C2C2E]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center text-emerald-400 shrink-0">
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">{plugin.name}</div>
                          <div className="text-[11px] text-gray-500">
                            v{plugin.version} by {plugin.author}
                          </div>
                        </div>
                      </div>

                      {plugin.installed && (
                        <button
                          onClick={() => handleToggleEnable(plugin.id)}
                          title={plugin.enabled ? 'Enabled' : 'Disabled'}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            plugin.enabled
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 leading-relaxed min-h-[38px]">
                      {plugin.description}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-gray-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3 text-gray-400" />
                        {plugin.downloads.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1 text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {plugin.rating}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#1C1C1E] text-gray-400 uppercase text-[9px]">
                        {plugin.category}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Action */}
                  <div className="mt-4 pt-3 border-t border-[#1C1C1E] flex items-center justify-between">
                    {plugin.installed ? (
                      <div className="flex items-center justify-between w-full">
                        <button
                          onClick={() => setConfigPlugin(plugin)}
                          className="px-2.5 py-1 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 text-xs flex items-center gap-1.5 border border-[#222224] transition-colors"
                        >
                          <Settings className="w-3 h-3" />
                          <span>Configure</span>
                        </button>

                        <button
                          onClick={() => handleUninstallPlugin(plugin.id)}
                          className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                        >
                          Uninstall
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleInstallPlugin(plugin.id)}
                        className="w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-98"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Install Plugin</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Plugin SDK Documentation & Manifest Viewer */
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto space-y-6">
          <div className="p-5 rounded-xl bg-[#111112] border border-[#222224] space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Code2 className="w-5 h-5 text-emerald-400" />
              <span>xTerminalx Plugin Architecture & SDK</span>
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              xTerminalx allows third-party developers to extend the client using TypeScript frontends and Rust backends.
              Plugins run in isolated web workers and communicate with the Tauri Stronghold vault and native network drivers.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#111112] border border-[#222224] space-y-3">
            <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Sample Plugin Manifest (`xterminalx.plugin.json`)
            </div>
            <pre className="p-4 rounded-lg bg-[#0A0A0B] border border-[#222224] font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">
{`{
  "id": "com.company.custom-protocol",
  "name": "Custom VPN Serial Bridge",
  "version": "1.0.0",
  "entrypoint": "dist/index.js",
  "capabilities": [
    "network:tcp",
    "vault:read-credentials",
    "terminal:custom-pane"
  ],
  "contributions": {
    "protocols": [
      {
        "scheme": "cisco-serial",
        "title": "Cisco Console Over Telnet",
        "defaultPort": 2001
      }
    ],
    "commands": [
      {
        "id": "custom-protocol.ping-sweep",
        "title": "Fast Subnet Sweep"
      }
    ]
  }
}`}
            </pre>
          </div>
        </div>
      )}

      {/* Plugin Configuration Modal */}
      {configPlugin && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#18181A] border border-[#2C2C2E] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-[#2C2C2E] flex items-center justify-between">
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400" />
                <span>Configure {configPlugin.name}</span>
              </div>
              <button
                onClick={() => setConfigPlugin(null)}
                className="text-gray-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-sans">
              {configPlugin.settings ? (
                Object.entries(configPlugin.settings).map(([key, val]) => (
                  <div key={key}>
                    <label className="block text-gray-300 mb-1 font-medium capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </label>
                    <input
                      type="text"
                      defaultValue={String(val)}
                      className="w-full px-3 py-2 rounded-lg bg-[#111112] border border-[#2C2C2E] text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                    />
                  </div>
                ))
              ) : (
                <div className="text-gray-500">No custom settings required for this extension.</div>
              )}
            </div>

            <div className="p-4 border-t border-[#2C2C2E] bg-[#141416] flex justify-end gap-2">
              <button
                onClick={() => setConfigPlugin(null)}
                className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => setConfigPlugin(null)}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-xs active:scale-95"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
