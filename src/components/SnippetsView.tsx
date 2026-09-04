import React, { useState } from 'react';
import {
  Zap,
  Play,
  Copy,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  AlertTriangle,
  Check,
  Server,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  X
} from 'lucide-react';
import { Snippet, Host, RiskLevel } from '../types';
import { analyzeCommandRisk } from '../lib/safetyEngine';

interface SnippetsViewProps {
  snippets: Snippet[];
  hosts: Host[];
  onSaveSnippet: (snippet: Snippet) => void;
  onDeleteSnippet: (snippetId: string) => void;
  onExecuteOnTerminal: (command: string, host?: Host) => void;
}

export const SnippetsView: React.FC<SnippetsViewProps> = ({
  snippets,
  hosts,
  onSaveSnippet,
  onDeleteSnippet,
  onExecuteOnTerminal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Multi-Host Execution Runner State
  const [activeSnippetForRunner, setActiveSnippetForRunner] = useState<Snippet | null>(null);
  const [selectedHostIds, setSelectedHostIds] = useState<string[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [concurrency, setConcurrency] = useState<'all' | 'limited' | 'sequential'>('limited');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<
    { hostId: string; hostName: string; status: 'pending' | 'running' | 'success' | 'failed'; output: string; durationMs: number }[]
  >([]);
  const [typedConfirmInput, setTypedConfirmInput] = useState('');

  // Add / Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('System');
  const [formCommand, setFormCommand] = useState('');

  const categories = Array.from(new Set(snippets.map((s) => s.category)));

  const handleCopy = (snippet: Snippet) => {
    navigator.clipboard.writeText(snippet.command);
    setCopiedId(snippet.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openRunnerModal = (snippet: Snippet) => {
    setActiveSnippetForRunner(snippet);
    setSelectedHostIds(hosts.slice(0, 2).map((h) => h.id));
    const initialVars: Record<string, string> = {};
    snippet.variables.forEach((v) => {
      initialVars[v.name] = v.defaultValue;
    });
    setVariableValues(initialVars);
    setExecutionResults([]);
    setTypedConfirmInput('');
  };

  const handleRunMultiHost = async () => {
    if (!activeSnippetForRunner || selectedHostIds.length === 0) return;

    let finalCommand = activeSnippetForRunner.command;
    Object.entries(variableValues).forEach(([k, v]) => {
      finalCommand = finalCommand.replace(new RegExp(`{{${k}}}`, 'g'), v);
    });

    const risk = analyzeCommandRisk(finalCommand);
    if (risk.requiresTypedConfirmation && typedConfirmInput !== 'CONFIRM') {
      return;
    }

    setIsExecuting(true);
    const initialRunners = selectedHostIds.map((hid) => {
      const h = hosts.find((item) => item.id === hid);
      return {
        hostId: hid,
        hostName: h?.name || hid,
        status: 'running' as const,
        output: `Connecting to ${h?.name || hid}...\nRunning: ${finalCommand}`,
        durationMs: 0,
      };
    });
    setExecutionResults(initialRunners);

    try {
      const results = await Promise.all(
        selectedHostIds.map(async (hid) => {
          const h = hosts.find((item) => item.id === hid);
          const start = Date.now();
          try {
            const res = await fetch('/api/terminal/exec', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ command: finalCommand, host: h?.hostname }),
            });
            const durationMs = Date.now() - start;
            if (res.ok) {
              const data = await res.json();
              const outputText = (data.stdout || '') + (data.stderr ? `\n[stderr] ${data.stderr}` : '');
              return {
                hostId: hid,
                hostName: h?.name || hid,
                status: (data.exitCode === 0 ? 'success' : 'failed') as 'success' | 'failed',
                output: outputText.trim() || `[Exit Code ${data.exitCode}] Completed`,
                durationMs,
              };
            } else {
              const err = await res.json().catch(() => ({}));
              return {
                hostId: hid,
                hostName: h?.name || hid,
                status: 'failed' as const,
                output: `Execution error: ${err.error || 'Request failed'}`,
                durationMs,
              };
            }
          } catch (err: any) {
            return {
              hostId: hid,
              hostName: h?.name || hid,
              status: 'failed' as const,
              output: `Connection error: ${err.message || 'Failed to reach host'}`,
              durationMs: Date.now() - start,
            };
          }
        })
      );
      setExecutionResults(results);
    } catch (err) {
      console.error('Snippets multi-host execution error:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const openAddModal = () => {
    setEditingSnippet(null);
    setFormName('');
    setFormDesc('');
    setFormCategory('System');
    setFormCommand('');
    setIsEditModalOpen(true);
  };

  const openEditModal = (snip: Snippet) => {
    setEditingSnippet(snip);
    setFormName(snip.name);
    setFormDesc(snip.description);
    setFormCategory(snip.category);
    setFormCommand(snip.command);
    setIsEditModalOpen(true);
  };

  const handleSaveSnippet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCommand) return;

    // Detect variables inside {{var}}
    const varMatches = formCommand.match(/{{([a-zA-Z0-9_]+)}}/g) || [];
    const vars = Array.from(new Set(varMatches)).map((m: string) => {
      const name = m.replace(/{{|}}/g, '');
      return {
        name,
        defaultValue: name === 'service' ? 'nginx' : '1',
        description: `Value for ${name}`,
      };
    });

    const risk = analyzeCommandRisk(formCommand);

    const snipToSave: Snippet = {
      id: editingSnippet ? editingSnippet.id : `snip-${Date.now()}`,
      name: formName,
      description: formDesc,
      category: formCategory,
      command: formCommand,
      tags: [formCategory.toLowerCase()],
      variables: vars,
      riskLevel: risk.riskLevel,
      favorite: editingSnippet ? editingSnippet.favorite : false,
      createdAt: editingSnippet ? editingSnippet.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveSnippet(snipToSave);
    setIsEditModalOpen(false);
  };

  const filteredSnippets = snippets.filter((s) => {
    if (selectedCategory && s.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.command.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0B] text-[#E0E0E0] p-6 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Snippets &amp; Multi-Server Runner</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
              POLICY ENFORCED
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Store parameterized reusable commands and run across target server fleets safely.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Snippet</span>
        </button>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111112] p-3 rounded-xl border border-[#222224]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search command templates, variables, or descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 placeholder-gray-500 focus:outline-hidden focus:border-emerald-500 font-sans"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              selectedCategory === null
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold'
                : 'text-gray-400 hover:text-white hover:bg-[#1C1C1E]'
            }`}
          >
            All ({snippets.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-[#1C1C1E]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Snippet Grid */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 pr-1">
        {filteredSnippets.map((snip) => (
          <div
            key={snip.id}
            className="p-5 rounded-xl bg-[#111112] border border-[#222224] hover:border-emerald-500/40 transition-all flex flex-col justify-between group shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white text-sm tracking-tight">{snip.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{snip.description}</p>
                </div>

                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold shrink-0 ${
                    snip.riskLevel === 'CRITICAL'
                      ? 'bg-red-950/80 text-red-400 border border-red-800/60'
                      : snip.riskLevel === 'HIGH'
                      ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                      : snip.riskLevel === 'MEDIUM'
                      ? 'bg-yellow-950/80 text-yellow-300 border border-yellow-800/60'
                      : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                  }`}
                >
                  {snip.riskLevel}
                </span>
              </div>

              {/* Code preview block */}
              <div className="mt-3 p-3 rounded-lg bg-[#0A0A0B] border border-[#222224] font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre-wrap break-all">
                {snip.command}
              </div>

              {/* Variables preview */}
              {snip.variables.length > 0 && (
                <div className="mt-2.5 flex items-center gap-1.5 flex-wrap text-[11px] text-gray-400">
                  <span className="font-medium">Variables:</span>
                  {snip.variables.map((v) => (
                    <span
                      key={v.name}
                      className="px-1.5 py-0.5 rounded bg-[#1C1C1E] text-blue-400 border border-[#222224] font-mono text-[10px]"
                    >
                      {`{{${v.name}}}`}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-4 pt-3 border-t border-[#222224] flex items-center justify-between">
              <div className="flex items-center gap-1 text-gray-400">
                <button
                  onClick={() => handleCopy(snip)}
                  className="p-1.5 rounded-md hover:bg-[#1C1C1E] hover:text-white transition-colors"
                  title="Copy command to clipboard"
                >
                  {copiedId === snip.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => openEditModal(snip)}
                  className="p-1.5 rounded-md hover:bg-[#1C1C1E] hover:text-white transition-colors"
                  title="Edit Snippet"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteSnippet(snip.id)}
                  className="p-1.5 rounded-md hover:bg-red-950/40 hover:text-red-400 transition-colors"
                  title="Delete Snippet"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onExecuteOnTerminal(snip.command)}
                  className="px-2.5 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224] text-xs font-medium transition-colors"
                >
                  Terminal
                </button>
                <button
                  onClick={() => openRunnerModal(snip)}
                  className="px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Execute on Fleet</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Multi-Host Fleet Runner Modal */}
      {activeSnippetForRunner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#111112] border border-[#222224] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-[#222224] flex items-center justify-between bg-[#0A0A0B]">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-white text-sm">
                  Run Snippet: {activeSnippetForRunner.name}
                </h3>
              </div>
              <button
                onClick={() => setActiveSnippetForRunner(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Target Hosts Selection */}
              <div>
                <label className="block text-gray-300 font-medium mb-1.5">
                  Target Servers ({selectedHostIds.length} selected):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {hosts.map((h) => {
                    const isSelected = selectedHostIds.includes(h.id);
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedHostIds(selectedHostIds.filter((id) => id !== h.id));
                          } else {
                            setSelectedHostIds([...selectedHostIds, h.id]);
                          }
                        }}
                        className={`p-2 rounded-lg border text-left text-xs transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 font-medium'
                            : 'bg-[#1C1C1E] border-[#222224] text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        <div className="truncate">
                          <div className="font-mono truncate">{h.name}</div>
                          <div className="text-[10px] text-gray-500">{h.hostname}</div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Variable inputs */}
              {activeSnippetForRunner.variables.length > 0 && (
                <div className="p-3.5 rounded-lg bg-[#1C1C1E] border border-[#222224] space-y-2.5">
                  <div className="font-medium text-gray-200">Snippet Variable Substitution:</div>
                  {activeSnippetForRunner.variables.map((v) => (
                    <div key={v.name} className="flex items-center gap-3">
                      <span className="font-mono text-emerald-400 w-32 shrink-0">{`{{${v.name}}}`}</span>
                      <input
                        type="text"
                        value={variableValues[v.name] || ''}
                        onChange={(e) =>
                          setVariableValues({ ...variableValues, [v.name]: e.target.value })
                        }
                        placeholder={v.description}
                        className="flex-1 px-3 py-1.5 rounded-md bg-[#0A0A0B] border border-[#222224] text-gray-100 font-mono text-xs focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Concurrency setting */}
              <div className="flex items-center justify-between text-gray-400">
                <span>Execution Concurrency:</span>
                <div className="flex items-center gap-2">
                  {[
                    { id: 'sequential', label: 'Sequential (1-by-1)' },
                    { id: 'limited', label: 'Limited (2 parallel)' },
                    { id: 'all', label: 'All-at-once' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setConcurrency(mode.id as any)}
                      className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                        concurrency === mode.id
                          ? 'bg-emerald-500 text-black font-bold'
                          : 'bg-[#1C1C1E] text-gray-400 border border-[#222224] hover:text-white'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Command Risk Safety Warning Banner */}
              {(() => {
                let finalCmd = activeSnippetForRunner.command;
                Object.entries(variableValues).forEach(([k, v]) => {
                  finalCmd = finalCmd.replace(new RegExp(`{{${k}}}`, 'g'), v);
                });
                const analysis = analyzeCommandRisk(finalCmd);

                return (
                  <div
                    className={`p-3 rounded-lg border space-y-1.5 ${
                      analysis.riskLevel === 'CRITICAL'
                        ? 'bg-red-950/40 border-red-800 text-red-300'
                        : analysis.riskLevel === 'HIGH'
                        ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                        : 'bg-[#1C1C1E] border-[#222224] text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Safety Assessment: Risk Level {analysis.riskLevel}</span>
                    </div>
                    <p className="text-[11px] text-gray-400">{analysis.rationale}</p>
                    {analysis.requiresTypedConfirmation && (
                      <div className="pt-2 border-t border-red-800/60">
                        <label className="block text-red-200 font-bold mb-1">
                          Type "CONFIRM" to authorize this critical operation:
                        </label>
                        <input
                          type="text"
                          value={typedConfirmInput}
                          onChange={(e) => setTypedConfirmInput(e.target.value)}
                          placeholder="Type CONFIRM here"
                          className="w-full px-3 py-1.5 rounded-md bg-black/60 border border-red-700 text-red-100 font-mono text-xs focus:outline-hidden"
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Execution Results */}
              {executionResults.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#222224]">
                  <div className="font-semibold text-gray-200">Execution Stream Output:</div>
                  <div className="space-y-2">
                    {executionResults.map((res) => (
                      <div
                        key={res.hostId}
                        className="p-3 rounded-lg bg-[#0A0A0B] border border-[#222224] font-mono text-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-bold text-gray-200">{res.hostName}</span>
                          <span className="flex items-center gap-1">
                            {res.status === 'running' && (
                              <span className="text-amber-400 animate-pulse">Running...</span>
                            )}
                            {res.status === 'success' && (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Success ({res.durationMs}ms)
                              </span>
                            )}
                            {res.status === 'failed' && (
                              <span className="text-red-400 flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> Failed
                              </span>
                            )}
                          </span>
                        </div>
                        <pre className="text-gray-400 text-[11px] whitespace-pre-wrap">
                          {res.output}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#222224] bg-[#0A0A0B] flex items-center justify-between text-xs">
              <span className="text-gray-500 font-mono">
                Fleet: {selectedHostIds.length} target hosts
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSnippetForRunner(null)}
                  className="px-3 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224] font-medium"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleRunMultiHost}
                  disabled={isExecuting || selectedHostIds.length === 0}
                  className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-40"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isExecuting ? 'Executing Fleet...' : 'Run on Selected Hosts'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Snippet Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-[#111112] border border-[#222224] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-[#222224] flex items-center justify-between bg-[#0A0A0B]">
              <h3 className="font-semibold text-white text-sm">
                {editingSnippet ? 'Edit Snippet' : 'Create New Snippet'}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSnippet} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 font-medium mb-1">Snippet Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Audit Docker Memory Usage"
                  className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 focus:outline-hidden focus:border-emerald-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1">Category</label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="System, Storage, Containers, Network"
                  className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Explains what this snippet performs..."
                  className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1">
                  Shell Command * (Use &#123;&#123;variable&#125;&#125; for parameters)
                </label>
                <textarea
                  rows={3}
                  required
                  value={formCommand}
                  onChange={(e) => setFormCommand(e.target.value)}
                  placeholder="systemctl restart {{service}} && systemctl status {{service}}"
                  className="w-full px-3 py-1.5 rounded-md bg-[#0A0A0B] border border-[#222224] text-emerald-400 font-mono focus:outline-hidden focus:border-emerald-500 text-xs leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-[#222224] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-sm"
                >
                  Save Snippet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
