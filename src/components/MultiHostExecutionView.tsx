import React, { useState } from 'react';
import {
  Server,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Terminal as TerminalIcon,
  Copy,
  Layers,
  Sparkles,
  Search,
  Filter,
  CheckSquare,
  Square,
  Zap,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { Host, HostGroup, EnvironmentType, MultiHostResult } from '../types';
import { analyzeCommandRisk } from '../lib/safetyEngine';

interface MultiHostExecutionViewProps {
  hosts: Host[];
  groups: HostGroup[];
  onBroadcastCommand?: (targetHostIds: string[], command: string) => void;
  onOpenAiWithContext: (text: string) => void;
}

export const MultiHostExecutionView: React.FC<MultiHostExecutionViewProps> = ({
  hosts,
  groups,
  onOpenAiWithContext,
}) => {
  const [selectedHostIds, setSelectedHostIds] = useState<string[]>(
    hosts.slice(0, 3).map((h) => h.id)
  );
  const [commandInput, setCommandInput] = useState<string>(
    'uname -a && uptime && df -h / | tail -n 1'
  );
  const [isRunning, setIsRunning] = useState(false);
  const [executionResults, setExecutionResults] = useState<MultiHostResult[]>([]);
  const [filterEnvironment, setFilterEnvironment] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'grid' | 'table' | 'diff'>('grid');

  const risk = analyzeCommandRisk(commandInput);

  // Filter hosts list
  const filteredHosts = hosts.filter((h) => {
    const matchesSearch =
      h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.hostname.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEnv = filterEnvironment === 'all' || h.environment === filterEnvironment;
    return matchesSearch && matchesEnv;
  });

  const handleToggleSelectAll = () => {
    if (selectedHostIds.length === filteredHosts.length) {
      setSelectedHostIds([]);
    } else {
      setSelectedHostIds(filteredHosts.map((h) => h.id));
    }
  };

  const handleToggleSelectHost = (id: string) => {
    if (selectedHostIds.includes(id)) {
      setSelectedHostIds(selectedHostIds.filter((item) => item !== id));
    } else {
      setSelectedHostIds([...selectedHostIds, id]);
    }
  };

  const handleSelectGroup = (groupId: string) => {
    const groupHosts = hosts.filter((h) => h.groupId === groupId).map((h) => h.id);
    const newSelected = Array.from(new Set([...selectedHostIds, ...groupHosts]));
    setSelectedHostIds(newSelected);
  };

  const handleExecute = async () => {
    if (!commandInput.trim() || selectedHostIds.length === 0) return;

    setIsRunning(true);
    const initialResults: MultiHostResult[] = selectedHostIds.map((id) => {
      const h = hosts.find((item) => item.id === id);
      return {
        hostId: id,
        hostName: h?.name || 'Unknown',
        environment: h?.environment || 'production',
        status: 'running',
        exitCode: 0,
        durationMs: 0,
        output: 'Executing live shell command across target node...',
      };
    });

    setExecutionResults(initialResults);

    await Promise.all(
      selectedHostIds.map(async (id) => {
        const h = hosts.find((item) => item.id === id);
        const start = Date.now();
        try {
          const res = await fetch('/api/terminal/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: commandInput, cwd: '/' }),
          });
          const duration = Date.now() - start;
          if (res.ok) {
            const data = await res.json();
            const outputText =
              (data.stdout || '') + (data.stderr ? `\n[stderr] ${data.stderr}` : '');
            setExecutionResults((prev) =>
              prev.map((r) =>
                r.hostId === id
                  ? {
                      ...r,
                      status: data.exitCode === 0 ? 'success' : 'failed',
                      exitCode: data.exitCode ?? 0,
                      durationMs: duration,
                      output:
                        outputText.trim() ||
                        `[Exit Code ${data.exitCode}] Executed successfully on ${h?.name}`,
                    }
                  : r
              )
            );
          } else {
            const err = await res.json();
            setExecutionResults((prev) =>
              prev.map((r) =>
                r.hostId === id
                  ? {
                      ...r,
                      status: 'failed',
                      exitCode: 1,
                      durationMs: duration,
                      output: `Execution error: ${err.error || 'Server error'}`,
                    }
                  : r
              )
            );
          }
        } catch (err: any) {
          setExecutionResults((prev) =>
            prev.map((r) =>
              r.hostId === id
                ? {
                    ...r,
                    status: 'failed',
                    exitCode: 1,
                    durationMs: Date.now() - start,
                    output: `Connection failure: ${err.message || 'Network error'}`,
                  }
                : r
            )
          );
        }
      })
    );

    setIsRunning(false);
  };

  const successCount = executionResults.filter((r) => r.status === 'success').length;
  const failedCount = executionResults.filter((r) => r.status === 'failed').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0B] text-[#E0E0E0] overflow-hidden font-sans">
      {/* Top Header */}
      <div className="p-4 border-b border-[#222224] bg-[#111112] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              Multi-Host Command Orchestrator
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
                BROADCAST RUNNER
              </span>
            </div>
            <div className="text-xs text-gray-400">
              Execute commands in parallel across multiple target servers with real-time output comparison.
            </div>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-[#1C1C1E] border border-[#222224] flex items-center gap-2">
            <span className="text-gray-400">Selected Hosts:</span>
            <span className="text-emerald-400 font-bold font-mono">{selectedHostIds.length}</span>
          </div>
          {executionResults.length > 0 && (
            <>
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold font-mono">
                ✓ {successCount} OK
              </div>
              {failedCount > 0 && (
                <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-semibold font-mono">
                  ✗ {failedCount} Failed
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Workspace Split: Left Host Selector, Right Execution Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[#222224]">
        {/* Left: Host & Group Picker */}
        <div className="w-full lg:w-80 flex flex-col bg-[#0E0E10] shrink-0 overflow-hidden">
          <div className="p-3 border-b border-[#222224] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Target Inventory
              </span>
              <button
                onClick={handleToggleSelectAll}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
              >
                {selectedHostIds.length === filteredHosts.length ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span>Select All</span>
                  </>
                )}
              </button>
            </div>

            {/* Search and Env Filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Filter hosts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 placeholder-gray-500 focus:outline-hidden focus:border-emerald-500 font-sans"
                />
              </div>

              <select
                value={filterEnvironment}
                onChange={(e) => setFilterEnvironment(e.target.value)}
                className="px-2 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-xs text-gray-300 font-sans focus:outline-hidden"
              >
                <option value="all">All Envs</option>
                <option value="production">Prod</option>
                <option value="staging">Staging</option>
                <option value="database">Database</option>
              </select>
            </div>

            {/* Quick Groups Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {groups.slice(0, 4).map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleSelectGroup(g.id)}
                  className="px-2 py-0.5 rounded text-[11px] bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224] flex items-center gap-1 transition-colors"
                >
                  <Server className="w-2.5 h-2.5 text-emerald-400" />
                  <span>+ {g.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Host List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredHosts.map((h) => {
              const isSelected = selectedHostIds.includes(h.id);
              return (
                <div
                  key={h.id}
                  onClick={() => handleToggleSelectHost(h.id)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between text-xs ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                      : 'bg-[#141416] border-[#222224] text-gray-400 hover:bg-[#1C1C1E] hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-emerald-500 border-emerald-500 text-black'
                          : 'border-gray-600 bg-transparent'
                      }`}
                    >
                      {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                    </div>

                    <div className="truncate">
                      <div className="font-medium text-gray-200 truncate flex items-center gap-1.5">
                        <span>{h.name}</span>
                        <span className="text-[9px] px-1 py-0.2 rounded uppercase font-mono bg-[#1C1C1E] text-gray-400 border border-[#222224]">
                          {h.environment}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono truncate">
                        {h.username}@{h.hostname}:{h.port}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      h.status === 'offline' ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Command Input & Execution Results */}
        <div className="flex-1 flex flex-col bg-[#0A0A0B] overflow-hidden">
          {/* Command Input Area */}
          <div className="p-4 border-b border-[#222224] bg-[#111112] space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-2">
                <TerminalIcon className="w-4 h-4 text-emerald-400" />
                <span>Command Line to Broadcast</span>
              </label>

              {/* Risk warning pill */}
              <div
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold flex items-center gap-1 ${
                  risk.riskLevel === 'CRITICAL' || risk.riskLevel === 'HIGH'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : risk.riskLevel === 'MEDIUM'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {risk.riskLevel === 'CRITICAL' && <ShieldAlert className="w-3 h-3" />}
                <span>Risk: {risk.riskLevel}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isRunning) handleExecute();
                }}
                placeholder="Enter shell command to execute across all selected nodes..."
                className="flex-1 px-3 py-2 rounded-lg bg-[#1C1C1E] border border-[#222224] text-xs font-mono text-emerald-300 focus:outline-hidden focus:border-emerald-500 shadow-inner"
              />

              <button
                onClick={handleExecute}
                disabled={isRunning || selectedHostIds.length === 0 || !commandInput.trim()}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-40"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Run Broadcast ({selectedHostIds.length})</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Template Presets */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] text-gray-500">Quick Templates:</span>
              {[
                { label: 'Check Disk Space', cmd: 'df -h /' },
                { label: 'Top Memory Users', cmd: 'ps aux --sort=-%mem | head -n 5' },
                { label: 'Docker Containers', cmd: 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"' },
                { label: 'System Kernel & Uptime', cmd: 'uname -r && uptime' },
                { label: 'Nginx Service Status', cmd: 'systemctl is-active nginx' },
              ].map((tpl) => (
                <button
                  key={tpl.label}
                  onClick={() => setCommandInput(tpl.cmd)}
                  className="px-2 py-0.5 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-400 hover:text-gray-200 border border-[#222224] text-[11px] font-mono transition-colors"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results Output Canvas */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {executionResults.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-500 space-y-3">
                <Layers className="w-12 h-12 text-gray-600 stroke-[1.5]" />
                <div className="max-w-md">
                  <div className="text-sm font-semibold text-gray-300">Ready to Orchestrate Commands</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Select target servers on the left, type or select a command preset, and click Broadcast to see real-time parallel outputs.
                  </div>
                </div>
              </div>
            ) : (
              executionResults.map((res) => {
                return (
                  <div
                    key={res.hostId}
                    className={`rounded-xl border overflow-hidden transition-all ${
                      res.status === 'failed'
                        ? 'bg-red-950/20 border-red-900/40'
                        : res.status === 'running'
                        ? 'bg-[#141416] border-amber-500/30'
                        : 'bg-[#111112] border-[#222224]'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="px-3.5 py-2.5 bg-[#18181A] border-b border-[#222224] flex items-center justify-between text-xs font-sans">
                      <div className="flex items-center gap-2.5">
                        {res.status === 'running' && (
                          <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                        )}
                        {res.status === 'success' && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        {res.status === 'failed' && (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        )}

                        <span className="font-bold text-white">{res.hostName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#222224] text-gray-400 font-mono uppercase">
                          {res.environment}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 font-mono text-[11px] text-gray-400">
                        {res.durationMs > 0 && <span>{res.durationMs}ms</span>}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            res.exitCode === 0
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          Exit: {res.exitCode}
                        </span>

                        <button
                          onClick={() => onOpenAiWithContext(`Host: ${res.hostName}\nCommand: ${commandInput}\nOutput:\n${res.output}`)}
                          className="p-1 rounded bg-[#222224] hover:text-emerald-400 text-gray-400"
                          title="Ask AI Copilot to analyze output"
                        >
                          <Sparkles className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Terminal Output Body */}
                    <pre className="p-3 text-xs font-mono bg-[#0A0A0B] text-gray-200 overflow-x-auto whitespace-pre-wrap leading-relaxed select-text">
                      {res.output}
                    </pre>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
