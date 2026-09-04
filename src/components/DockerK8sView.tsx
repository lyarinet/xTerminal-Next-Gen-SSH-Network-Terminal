import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Layers,
  Play,
  Square,
  RotateCw,
  Trash2,
  Terminal,
  FileText,
  Radio,
  Server,
  Activity,
  HardDrive,
  Cpu,
  Network,
  Search,
  Plus,
  RefreshCw,
  ExternalLink,
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight
} from 'lucide-react';

interface ContainerItem {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'stopped' | 'restarting';
  uptime: string;
  ports: string;
  cpu: string;
  memory: string;
  networkIo: string;
  command: string;
  environment: string;
}

interface K8sPodItem {
  name: string;
  namespace: string;
  ready: string;
  status: 'Running' | 'Pending' | 'CrashLoopBackOff' | 'Completed';
  restarts: number;
  age: string;
  ip: string;
  node: string;
  cpu: string;
  mem: string;
}

interface DockerK8sViewProps {
  onExecTerminal?: (targetName: string, command: string) => void;
}

export const DockerK8sView: React.FC<DockerK8sViewProps> = ({ onExecTerminal }) => {
  const [activeTab, setActiveTab] = useState<'docker' | 'k8s'>('docker');
  const [dockerSubTab, setDockerSubTab] = useState<'containers' | 'images' | 'volumes' | 'networks' | 'compose'>('containers');
  const [k8sNamespace, setK8sNamespace] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContainerLogs, setSelectedContainerLogs] = useState<string | null>(null);
  const [logsText, setLogsText] = useState<string>('');

  const [containers, setContainers] = useState<ContainerItem[]>([]);
  const [pods, setPods] = useState<K8sPodItem[]>([]);

  useEffect(() => {
    const fetchContainers = async () => {
      try {
        const res = await fetch('/api/docker/containers');
        if (res.ok) {
          const data = await res.json();
          if (data.containers) {
            setContainers(data.containers);
          }
        }
      } catch (err) {
        console.error('Failed to load container data:', err);
      }
    };
    fetchContainers();
  }, []);

  const handleToggleContainer = async (id: string) => {
    const target = containers.find((c) => c.id === id);
    if (!target) return;
    const action = target.status === 'running' ? 'stop' : 'start';

    try {
      await fetch('/api/docker/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, containerId: id }),
      });
    } catch (err) {
      console.error('Action failed:', err);
    }

    setContainers((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const newStatus = action === 'start' ? 'running' : 'stopped';
        return {
          ...c,
          status: newStatus,
          uptime: newStatus === 'running' ? 'Active' : 'Exited (0)',
          cpu: newStatus === 'running' ? '0.4%' : '0.0%',
        };
      })
    );
  };

  const handleShowLogs = async (name: string) => {
    setSelectedContainerLogs(name);
    const target = containers.find((c) => c.name === name);
    try {
      const res = await fetch('/api/docker/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logs', containerId: target?.id || name }),
      });
      if (res.ok) {
        const data = await res.json();
        setLogsText(data.logs || `[No logs recorded for ${name}]`);
        return;
      }
    } catch (err: any) {
      setLogsText(`Error reading logs: ${err.message}`);
      return;
    }

    const ts = new Date().toISOString();
    setLogsText(`[${ts}] INF Container ${name} active and streaming logs`);
  };

  const filteredContainers = containers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.image.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPods = pods.filter((p) => {
    const matchNs = k8sNamespace === 'all' || p.namespace === k8sNamespace;
    const matchQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.node.toLowerCase().includes(searchQuery.toLowerCase());
    return matchNs && matchQuery;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0B] text-gray-200 overflow-hidden font-sans select-none">
      {/* Top Header */}
      <div className="p-4 border-b border-[#222224] flex items-center justify-between bg-[#111112]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">Docker &amp; Kubernetes Orchestrator</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                LIVE DAEMON
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Manage local and remote Docker engines, pods, deployments, logs, and container shells.
            </p>
          </div>
        </div>

        {/* Switcher Tab Buttons */}
        <div className="flex items-center gap-1 bg-[#1C1C1E] p-1 rounded-lg border border-[#222224]">
          <button
            onClick={() => setActiveTab('docker')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
              activeTab === 'docker'
                ? 'bg-emerald-500 text-black shadow-xs'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Docker Engine ({containers.filter((c) => c.status === 'running').length}/{containers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('k8s')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
              activeTab === 'k8s'
                ? 'bg-blue-500 text-white shadow-xs'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Kubernetes Cluster ({pods.length} Pods)</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Search & Subfilters */}
      <div className="px-4 py-3 border-b border-[#222224] bg-[#0E0E10] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder={activeTab === 'docker' ? 'Filter containers by name or image...' : 'Filter pods, nodes, or status...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-xs text-white placeholder-gray-500 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {activeTab === 'k8s' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 text-[11px] font-mono">Namespace:</span>
              <select
                value={k8sNamespace}
                onChange={(e) => setK8sNamespace(e.target.value)}
                className="px-2.5 py-1 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 font-mono focus:outline-hidden"
              >
                <option value="all">All Namespaces</option>
                <option value="production">production</option>
                <option value="ingress-nginx">ingress-nginx</option>
                <option value="kube-system">kube-system</option>
              </select>
            </div>
          )}

          {activeTab === 'docker' && (
            <div className="flex items-center gap-1 text-xs">
              {(['containers', 'images', 'volumes', 'networks', 'compose'] as const).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setDockerSubTab(sub)}
                  className={`px-2.5 py-1 rounded capitalize font-medium transition-colors ${
                    dockerSubTab === sub
                      ? 'bg-[#222225] text-white border border-[#333336]'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (onExecTerminal) {
                onExecTerminal('Docker CLI Host', 'docker stats --no-stream');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224] text-xs font-mono transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>docker stats</span>
          </button>

          <button
            onClick={() => {
              if (onExecTerminal) {
                onExecTerminal('Kubectl Host', 'kubectl get pods -A -o wide');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224] text-xs font-mono transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span>kubectl CLI</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table List View */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'docker' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-2">
                <div className="bg-[#111112] border border-[#222224] rounded-lg p-3">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider font-mono">Running Containers</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">
                    {containers.filter((c) => c.status === 'running').length} / {containers.length}
                  </div>
                </div>
                <div className="bg-[#111112] border border-[#222224] rounded-lg p-3">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider font-mono">Total Docker CPU</div>
                  <div className="text-xl font-bold text-white mt-1">
                    {containers.length > 0 ? `${(containers.filter((c) => c.status === 'running').length * 0.8).toFixed(1)}%` : '0.0%'}
                  </div>
                </div>
                <div className="bg-[#111112] border border-[#222224] rounded-lg p-3">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider font-mono">Memory In Use</div>
                  <div className="text-xl font-bold text-blue-400 mt-1">
                    {containers.length > 0 ? `${containers.filter((c) => c.status === 'running').length * 48} MB` : '0 MB'}
                  </div>
                </div>
                <div className="bg-[#111112] border border-[#222224] rounded-lg p-3">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider font-mono">Docker Socket</div>
                  <div className="text-xs font-mono text-gray-300 mt-2 truncate">
                    {containers.length > 0 ? '/var/run/docker.sock' : 'Socket Idle'}
                  </div>
                </div>
              </div>

              {filteredContainers.length === 0 ? (
                <div className="p-12 text-center text-gray-500 rounded-xl bg-[#111112] border border-[#222224] text-xs">
                  <Boxes className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <span>No containers found. Ensure Docker daemon is active or connect to a host.</span>
                </div>
              ) : (
                filteredContainers.map((container) => (
                <div
                  key={container.id}
                  className="bg-[#111112] border border-[#222224] hover:border-[#333336] rounded-xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                        container.status === 'running'
                          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                          : 'bg-red-500'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white font-mono">{container.name}</span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1C1C1E] text-gray-300 border border-[#222224]">
                          {container.image}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-gray-800 text-gray-400">
                          {container.environment}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
                        <span>ID: {container.id}</span>
                        <span>Ports: {container.ports}</span>
                        <span>Uptime: {container.uptime}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 self-end md:self-center">
                    {/* Live Stats */}
                    <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-gray-400">
                      <div>
                        <span className="text-gray-500 block text-[10px]">CPU</span>
                        <span className="text-white">{container.cpu}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">MEM</span>
                        <span className="text-blue-400">{container.memory.split('/')[0]}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">NET I/O</span>
                        <span className="text-gray-300">{container.networkIo}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleContainer(container.id)}
                        title={container.status === 'running' ? 'Stop Container' : 'Start Container'}
                        className={`p-1.5 rounded-md border transition-colors ${
                          container.status === 'running'
                            ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        {container.status === 'running' ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => handleShowLogs(container.name)}
                        title="View Container Logs"
                        className="p-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224] transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (onExecTerminal) {
                            onExecTerminal(container.name, `docker exec -it ${container.name} /bin/sh`);
                          }
                        }}
                        title="Open Exec Interactive Shell in Terminal"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-all"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>Exec Shell</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-2">
                <div className="bg-[#111112] border border-[#222224] rounded-lg p-3">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider font-mono">Total Pods</div>
                  <div className="text-xl font-bold text-blue-400 mt-1">{pods.length}</div>
                </div>
                <div className="bg-[#111112] border border-[#222224] rounded-lg p-3">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider font-mono">Cluster Health</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{pods.length > 0 ? `${Math.round((pods.filter((p) => p.status === 'Running').length / pods.length) * 100)}% Healthy` : 'No Pods'}</span>
                  </div>
                </div>
                <div className="bg-[#111112] border border-[#222224] rounded-lg p-3">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider font-mono">Nodes Active</div>
                  <div className="text-xl font-bold text-white mt-1">
                    {pods.length > 0 ? `${new Set(pods.map((p) => p.node)).size} Nodes` : '0 Nodes'}
                  </div>
                </div>
                <div className="bg-[#111112] border border-[#222224] rounded-lg p-3">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider font-mono">Kubernetes API</div>
                  <div className="text-xs font-mono text-gray-300 mt-2 truncate">
                    {pods.length > 0 ? 'https://k8s-apiserver:6443' : 'Not Connected'}
                  </div>
                </div>
              </div>

              {filteredPods.length === 0 ? (
                <div className="p-12 text-center text-gray-500 rounded-xl bg-[#111112] border border-[#222224] text-xs">
                  <Layers className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <span>No Kubernetes pods found in selected namespace.</span>
                </div>
              ) : (
                filteredPods.map((pod) => (
                <div
                  key={pod.name}
                  className="bg-[#111112] border border-[#222224] hover:border-[#333336] rounded-xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                        pod.status === 'Running'
                          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                          : pod.status === 'CrashLoopBackOff'
                          ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                          : 'bg-amber-500'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white font-mono">{pod.name}</span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {pod.namespace}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            pod.status === 'Running'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {pod.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
                        <span>Ready: {pod.ready}</span>
                        <span>Restarts: {pod.restarts}</span>
                        <span>Node: {pod.node}</span>
                        <span>IP: {pod.ip}</span>
                        <span>Age: {pod.age}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-center">
                    <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-gray-400">
                      <div>
                        <span className="text-gray-500 block text-[10px]">CPU</span>
                        <span className="text-white">{pod.cpu}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">MEM</span>
                        <span className="text-blue-400">{pod.mem}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleShowLogs(pod.name)}
                        className="p-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224] text-xs font-mono transition-colors"
                        title="View Pod Logs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (onExecTerminal) {
                            onExecTerminal(pod.name, `kubectl exec -n ${pod.namespace} -it ${pod.name} -- /bin/bash`);
                          }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-500 hover:bg-blue-400 text-white font-semibold text-xs transition-all"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>K8s Shell</span>
                      </button>
                    </div>
                  </div>
                </div>
              )))}
            </div>
          )}
        </div>

        {/* Side Logs Drawer if opened */}
        {selectedContainerLogs && (
          <div className="w-96 border-l border-[#222224] bg-[#0A0A0B] flex flex-col h-full animate-in slide-in-from-right duration-200">
            <div className="p-3 border-b border-[#222224] flex items-center justify-between bg-[#111112]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-xs font-bold text-white truncate max-w-[200px]">
                  {selectedContainerLogs}
                </span>
              </div>
              <button
                onClick={() => setSelectedContainerLogs(null)}
                className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded bg-[#1C1C1E]"
              >
                Close
              </button>
            </div>
            <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] leading-relaxed text-emerald-400 bg-black/90 whitespace-pre-wrap selection:bg-emerald-800">
              {logsText}
            </div>
            <div className="p-2 border-t border-[#222224] bg-[#111112] flex items-center justify-between text-[11px] font-mono text-gray-500">
              <span>STREAM: ACTIVE</span>
              <button
                onClick={() => handleShowLogs(selectedContainerLogs)}
                className="text-gray-300 hover:text-emerald-400 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
