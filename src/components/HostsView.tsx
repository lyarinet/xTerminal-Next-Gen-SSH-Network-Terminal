import React, { useState } from 'react';
import {
  Server,
  Search,
  Plus,
  Filter,
  Folder,
  Tag,
  Shield,
  Trash2,
  Edit2,
  Copy,
  Terminal,
  FolderSync,
  Radio,
  Activity,
  Check,
  X,
  Lock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Eye,
  EyeOff,
  Key,
  FolderPlus,
  FolderInput,
  AlertTriangle
} from 'lucide-react';
import { Host, HostGroup, Identity, EnvironmentType, EnvironmentDef } from '../types';

interface HostsViewProps {
  hosts: Host[];
  groups: HostGroup[];
  identities: Identity[];
  environments: EnvironmentDef[];
  onConnectHost: (host: Host) => void;
  onOpenSftp: (host: Host) => void;
  onSaveHost: (host: Host) => void;
  onDeleteHost: (hostId: string) => void;
  onDeleteAllHosts?: () => void;
  onOpenImport?: () => void;
  onSaveGroup?: (group: HostGroup) => void;
  onDeleteGroup?: (groupId: string) => void;
  onSaveEnvironment?: (env: EnvironmentDef) => void;
  onDeleteEnvironment?: (envId: string) => void;
}

export const HostsView: React.FC<HostsViewProps> = ({
  hosts,
  groups,
  identities,
  environments,
  onConnectHost,
  onOpenSftp,
  onSaveHost,
  onDeleteHost,
  onDeleteAllHosts,
  onOpenImport,
  onSaveGroup,
  onDeleteGroup,
  onSaveEnvironment,
  onDeleteEnvironment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedEnv, setSelectedEnv] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHost, setEditingHost] = useState<Host | null>(null);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);

  // Group Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<HostGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupColor, setGroupColor] = useState('#10b981');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupEnv, setGroupEnv] = useState<EnvironmentType>('production');

  // Environment Modal State
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [editingEnv, setEditingEnv] = useState<EnvironmentDef | null>(null);
  const [envName, setEnvName] = useState('');
  const [envColor, setEnvColor] = useState('#10b981');
  const [envDesc, setEnvDesc] = useState('');

  // Form State
  const [formName, setFormName] = useState('');
  const [formHostname, setFormHostname] = useState('');
  const [formPort, setFormPort] = useState(22);
  const [formUsername, setFormUsername] = useState('deploy');
  const [formDesc, setFormDesc] = useState('');
  const [formGroupId, setFormGroupId] = useState('');
  const [formEnv, setFormEnv] = useState<EnvironmentType>('production');
  const [formConnectionType, setFormConnectionType] = useState<'ssh' | 'telnet'>('ssh');
  const [formIdentityId, setFormIdentityId] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formProxyJump, setFormProxyJump] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formSavePassword, setFormSavePassword] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isTestingProbe, setIsTestingProbe] = useState(false);
  const [probeResult, setProbeResult] = useState<{ success: boolean; message: string } | null>(null);

  const openAddGroupModal = () => {
    setEditingGroup(null);
    setGroupName('');
    setGroupColor('#10b981');
    setGroupDesc('');
    setGroupEnv(environments[0]?.name || 'production');
    setIsGroupModalOpen(true);
  };

  const openEditGroupModal = (grp: HostGroup, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingGroup(grp);
    setGroupName(grp.name);
    setGroupColor(grp.color || '#10b981');
    setGroupDesc(grp.description || '');
    setGroupEnv(grp.environment || 'production');
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    const grpToSave: HostGroup = {
      id: editingGroup ? editingGroup.id : `grp-${Date.now()}`,
      name: groupName.trim(),
      description: groupDesc.trim() || undefined,
      color: groupColor,
      environment: groupEnv,
    };
    if (onSaveGroup) onSaveGroup(grpToSave);
    setIsGroupModalOpen(false);
  };

  const handleDeleteGroup = (groupId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm('Are you sure you want to delete this group?')) {
      if (onDeleteGroup) onDeleteGroup(groupId);
      if (selectedGroup === groupId) setSelectedGroup(null);
    }
  };

  const openAddEnvModal = () => {
    setEditingEnv(null);
    setEnvName('');
    setEnvColor('#10b981');
    setEnvDesc('');
    setIsEnvModalOpen(true);
  };

  const openEditEnvModal = (env: EnvironmentDef, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingEnv(env);
    setEnvName(env.name);
    setEnvColor(env.color || '#10b981');
    setEnvDesc(env.description || '');
    setIsEnvModalOpen(true);
  };

  const handleSaveEnvironment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!envName.trim()) return;
    const cleanName = envName.trim().toLowerCase().replace(/\s+/g, '-');
    const envToSave: EnvironmentDef = {
      id: editingEnv ? editingEnv.id : `env-${Date.now()}`,
      name: cleanName,
      color: envColor,
      description: envDesc.trim() || undefined,
    };
    if (onSaveEnvironment) onSaveEnvironment(envToSave);
    setIsEnvModalOpen(false);
  };

  const handleDeleteEnvironment = (envId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const env = environments.find((e) => e.id === envId);
    if (window.confirm(`Are you sure you want to delete environment "${env?.name || envId}"?`)) {
      if (onDeleteEnvironment) onDeleteEnvironment(envId);
      if (selectedEnv === env?.name) setSelectedEnv(null);
    }
  };

  const openAddModal = () => {
    setEditingHost(null);
    setFormName('');
    setFormHostname('');
    setFormPort(22);
    setFormUsername('deploy');
    setFormDesc('');
    setFormGroupId(groups[0]?.id || '');
    setFormEnv(environments[0]?.name || 'production');
    setFormConnectionType('ssh');
    setFormIdentityId(identities[0]?.id || '');
    setFormTags('web, us-east');
    setFormProxyJump('');
    setFormPassword('');
    setFormSavePassword(true);
    setShowPassword(false);
    setProbeResult(null);
    setIsModalOpen(true);
  };

  const openEditModal = (host: Host) => {
    setEditingHost(host);
    setFormName(host.name);
    setFormHostname(host.hostname);
    setFormPort(host.port);
    setFormUsername(host.username);
    setFormDesc(host.description || '');
    setFormGroupId(host.groupId || '');
    setFormEnv(host.environment);
    setFormConnectionType(host.connectionType === 'telnet' || host.port === 23 ? 'telnet' : 'ssh');
    setFormIdentityId(host.identityId || '');
    setFormTags(host.tags.join(', '));
    setFormProxyJump(host.proxyJumpChain ? host.proxyJumpChain[0] || '' : '');
    setFormPassword(host.password || '');
    setFormSavePassword(host.savePassword !== false);
    setShowPassword(false);
    setProbeResult(null);
    setIsModalOpen(true);
  };

  const handleTestProbe = async () => {
    if (!formHostname) return;
    setIsTestingProbe(true);
    setProbeResult(null);

    try {
      const res = await fetch('/api/diagnostics/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: formHostname, port: formPort }),
      });
      const data = await res.json();
      if (data.accessible) {
        setProbeResult({
          success: true,
          message: `Connection successful (${data.totalDurationMs}ms). Resolved to ${data.resolvedIp}`,
        });
      } else {
        const lastError = data.steps?.find((s: any) => s.status === 'failure')?.details || 'Unreachable target';
        setProbeResult({
          success: false,
          message: `Check failed: ${lastError}`,
        });
      }
    } catch (err: any) {
      setProbeResult({ success: false, message: err.message || 'Diagnostic probe failed' });
    } finally {
      setIsTestingProbe(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formHostname) return;

    const trimmedPassword = formPassword.trim();
    const hostToSave: Host = {
      id: editingHost ? editingHost.id : `host-${Date.now()}`,
      name: formName,
      hostname: formHostname,
      port: Number(formPort),
      username: formUsername,
      description: formDesc,
      groupId: formGroupId || undefined,
      environment: formEnv,
      connectionType: formConnectionType,
      identityId: formIdentityId || undefined,
      password: formSavePassword && trimmedPassword ? trimmedPassword : (trimmedPassword ? trimmedPassword : undefined),
      savePassword: formSavePassword,
      authType: trimmedPassword ? 'password' : formIdentityId ? 'key' : 'password',
      proxyJumpChain: formProxyJump ? [formProxyJump] : [],
      tags: formTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      color: formEnv === 'production' ? '#10b981' : formEnv === 'database' ? '#8b5cf6' : '#3b82f6',
      fingerprint: editingHost ? editingHost.fingerprint : `SHA256:${Math.random().toString(36).slice(2)}`,
      createdAt: editingHost ? editingHost.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      favorite: editingHost ? editingHost.favorite : false,
      status: 'online',
    };

    onSaveHost(hostToSave);
    setIsModalOpen(false);
  };

  const filteredHosts = hosts.filter((h) => {
    if (selectedGroup && h.groupId !== selectedGroup) return false;
    if (selectedEnv && h.environment !== selectedEnv) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        h.name.toLowerCase().includes(q) ||
        h.hostname.toLowerCase().includes(q) ||
        h.username.toLowerCase().includes(q) ||
        h.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0A0A0B] text-[#E0E0E0]">
      {/* Groups Sidebar */}
      <div className="w-60 bg-[#111112] border-r border-[#222224] p-4 shrink-0 flex flex-col justify-between hidden md:flex">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Groups</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">{hosts.length} hosts</span>
              <button
                onClick={openAddGroupModal}
                className="p-1 rounded text-gray-400 hover:text-emerald-400 hover:bg-[#1C1C1E] transition-colors"
                title="Create New Host Group"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <button
              onClick={() => {
                setSelectedGroup(null);
                setSelectedEnv(null);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors ${
                selectedGroup === null && selectedEnv === null
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-[#1C1C1E]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Server className="w-3.5 h-3.5" />
                <span>All Servers</span>
              </div>
              <span className="font-mono text-[10px] text-gray-500">{hosts.length}</span>
            </button>

            {groups.map((grp) => {
              const count = hosts.filter((h) => h.groupId === grp.id).length;
              const isSelected = selectedGroup === grp.id;
              return (
                <div
                  key={grp.id}
                  className={`w-full group flex items-center justify-between px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-[#1C1C1E]'
                  }`}
                >
                  <button
                    onClick={() => {
                      setSelectedGroup(grp.id);
                      setSelectedEnv(null);
                    }}
                    className="flex-1 flex items-center gap-2 text-left truncate py-0.5"
                  >
                    <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: grp.color || '#10b981' }} />
                    <span className="truncate">{grp.name}</span>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="font-mono text-[10px] text-gray-500 group-hover:hidden">{count}</span>
                    <div className="hidden group-hover:flex items-center gap-0.5">
                      <button
                        onClick={(e) => openEditGroupModal(grp, e)}
                        className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#252528] transition-colors"
                        title="Edit Group"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteGroup(grp.id, e)}
                        className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-[#252528] transition-colors"
                        title="Delete Group"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Environments Filter & Management */}
          <div className="pt-4 border-t border-[#222224]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Environments</span>
              <button
                onClick={openAddEnvModal}
                className="p-1 rounded text-gray-400 hover:text-emerald-400 hover:bg-[#1C1C1E] transition-colors"
                title="Create New Environment"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1 text-xs max-h-48 overflow-y-auto pr-0.5">
              {environments.map((env) => {
                const count = hosts.filter((h) => h.environment.toLowerCase() === env.name.toLowerCase()).length;
                const isSelected = selectedEnv?.toLowerCase() === env.name.toLowerCase();
                return (
                  <div
                    key={env.id}
                    className={`w-full group flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors capitalize ${
                      isSelected
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold'
                        : 'text-gray-400 hover:text-white hover:bg-[#1C1C1E]'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setSelectedEnv(isSelected ? null : env.name);
                        setSelectedGroup(null);
                      }}
                      className="flex-1 flex items-center gap-2 text-left truncate"
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: env.color }} />
                      <span className="truncate">{env.name}</span>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-mono text-gray-500 group-hover:hidden">{count}</span>
                      <div className="hidden group-hover:flex items-center gap-0.5">
                        <button
                          onClick={(e) => openEditEnvModal(env, e)}
                          className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#252528] transition-colors"
                          title="Edit Environment"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteEnvironment(env.id, e)}
                          className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-[#252528] transition-colors"
                          title="Delete Environment"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-3 bg-[#1C1C1E] border border-[#222224] rounded-lg text-xs text-gray-400">
          <div className="flex items-center gap-1.5 text-gray-200 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Vault Protected</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Credentials stored in encrypted local keystore.</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-5">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search servers by name, IP, tag, or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#111112] border border-[#222224] text-xs text-gray-100 placeholder-gray-500 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {hosts.length > 0 && onDeleteAllHosts && (
              <button
                onClick={() => setIsDeleteAllModalOpen(true)}
                className="px-3 py-2 rounded-md bg-red-950/30 hover:bg-red-900/50 text-red-400 hover:text-red-300 text-xs font-semibold border border-red-900/40 transition-colors flex items-center gap-1.5 shadow-sm"
                title="Delete all servers from inventory"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Delete All</span>
              </button>
            )}
            {onOpenImport && (
              <button
                onClick={onOpenImport}
                className="px-3 py-2 rounded-md bg-[#18181A] hover:bg-[#222225] text-emerald-400 hover:text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                title="Import sessions from SecureCRT, PuTTY, OpenSSH, CSV"
              >
                <FolderInput className="w-4 h-4 text-emerald-400" />
                <span>Import</span>
              </button>
            )}
            <button
              onClick={openAddGroupModal}
              className="px-3 py-2 rounded-md bg-[#18181A] hover:bg-[#222225] text-gray-300 hover:text-white text-xs font-semibold border border-[#2A2A2D] transition-colors flex items-center gap-1.5 shadow-sm"
              title="Create New Host Group"
            >
              <FolderPlus className="w-4 h-4 text-emerald-400" />
              <span>Add Group</span>
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Server</span>
            </button>
          </div>
        </div>

        {/* Mobile Filter Chips Strip */}
        <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1 select-none">
          <button
            onClick={() => {
              setSelectedGroup(null);
              setSelectedEnv(null);
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 ${
              selectedGroup === null && selectedEnv === null
                ? 'bg-emerald-500 text-black font-bold'
                : 'bg-[#1C1C1E] text-gray-400 border border-[#222224]'
            }`}
          >
            All ({hosts.length})
          </button>
          {groups.map((grp) => {
            const count = hosts.filter((h) => h.groupId === grp.id).length;
            return (
              <button
                key={grp.id}
                onClick={() => {
                  setSelectedGroup(selectedGroup === grp.id ? null : grp.id);
                  setSelectedEnv(null);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 flex items-center gap-1.5 ${
                  selectedGroup === grp.id
                    ? 'bg-emerald-500 text-black font-bold'
                    : 'bg-[#1C1C1E] text-gray-400 border border-[#222224]'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: grp.color }} />
                <span>{grp.name} ({count})</span>
              </button>
            );
          })}
          <button
            onClick={openAddGroupModal}
            className="px-2.5 py-1 rounded-full text-xs font-medium shrink-0 flex items-center gap-1 bg-[#1C1C1E] text-gray-400 hover:text-emerald-400 border border-[#222224]"
            title="Create Group"
          >
            <FolderPlus className="w-3 h-3 text-emerald-400" />
            <span>New Group</span>
          </button>
        </div>

        {/* Server Cards Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredHosts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 text-xs space-y-2">
              <Server className="w-8 h-8 text-gray-600" />
              <span>No servers found matching current filter</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHosts.map((host) => {
                const identity = identities.find((id) => id.id === host.identityId);
                const jumpHost = hosts.find((h) => host.proxyJumpChain && host.proxyJumpChain[0] === h.id);

                return (
                  <div
                    key={host.id}
                    onClick={() => onConnectHost(host)}
                    className="p-5 rounded-xl bg-[#111112] border border-[#222224] hover:border-emerald-500/60 hover:bg-[#141416] transition-all flex flex-col justify-between group shadow-sm cursor-pointer overflow-hidden"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              host.status === 'online'
                                ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
                                : 'bg-amber-400 ring-2 ring-amber-400/20'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-white text-sm tracking-tight flex items-center gap-2">
                              <span className="truncate">{host.name}</span>
                            </div>
                            <div className="text-xs text-gray-400 font-mono mt-0.5 truncate" title={`${host.username}@${host.hostname}:${host.port}`}>
                              {host.username}@{host.hostname}:{host.port}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                          {host.connectionType === 'telnet' || host.port === 23 ? (
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold shrink-0">
                              TELNET
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold shrink-0">
                              SSH
                            </span>
                          )}
                          {(() => {
                            const envDef = environments.find((e) => e.name.toLowerCase() === host.environment.toLowerCase());
                            const envColor = envDef?.color || '#94a3b8';
                            return (
                              <span
                                className="text-[10px] uppercase font-mono px-2 py-0.5 rounded font-medium border truncate max-w-[120px] shrink-0"
                                title={host.environment}
                                style={{
                                  color: envColor,
                                  borderColor: `${envColor}40`,
                                  backgroundColor: `${envColor}15`,
                                }}
                              >
                                {host.environment}
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Description */}
                      {host.description && (
                        <p className="text-xs text-gray-400 mt-2.5 line-clamp-2">{host.description}</p>
                      )}

                      {/* Jump Host, Identity & Password Info */}
                      <div className="mt-3 pt-2.5 border-t border-[#222224] space-y-1.5 text-[11px] text-gray-400">
                        {host.password ? (
                          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                            <Key className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>Auto-Login: Saved Password</span>
                          </div>
                        ) : identity ? (
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate">Key: {identity.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <Key className="w-3 h-3 shrink-0" />
                            <span>Password Prompt</span>
                          </div>
                        )}
                        {jumpHost && (
                          <div className="flex items-center gap-1.5 text-blue-400">
                            <Radio className="w-3 h-3 shrink-0" />
                            <span className="truncate">Jump via: {jumpHost.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {host.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {host.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-[#1C1C1E] text-gray-400 font-mono border border-[#222224]"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 pt-3 border-t border-[#222224] flex items-center justify-between">
                      <div className="flex items-center gap-1 text-gray-400">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(host);
                          }}
                          className="p-1.5 rounded-md hover:bg-[#1C1C1E] hover:text-white transition-colors"
                          title="Edit Server Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteHost(host.id);
                          }}
                          className="p-1.5 rounded-md hover:bg-red-950/40 hover:text-red-400 transition-colors"
                          title="Delete Server"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenSftp(host);
                          }}
                          className="px-2.5 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224] text-xs font-medium transition-colors flex items-center gap-1"
                          title="Open SFTP File Browser"
                        >
                          <FolderSync className="w-3.5 h-3.5" />
                          <span>SFTP</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onConnectHost(host);
                          }}
                          className="px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black font-bold text-xs transition-colors flex items-center gap-1"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                          <span>Connect</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Host Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-[#111112] border border-[#222224] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-[#222224] flex items-center justify-between bg-[#0A0A0B]">
              <h3 className="font-semibold text-white text-sm">
                {editingHost ? `Edit Server: ${editingHost.name}` : 'Add New Server'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Connection Protocol Selector */}
              <div>
                <label className="block text-gray-400 font-medium mb-1.5">Connection Protocol</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormConnectionType('ssh');
                      if (formPort === 23) setFormPort(22);
                    }}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      formConnectionType === 'ssh'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm'
                        : 'bg-[#1C1C1E] text-gray-400 border-[#222224] hover:text-white'
                    }`}
                  >
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <div className="text-left">
                      <div className="leading-none">SSH</div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">Port 22 (Encrypted)</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormConnectionType('telnet');
                      if (formPort === 22) setFormPort(23);
                    }}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      formConnectionType === 'telnet'
                        ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40 shadow-sm'
                        : 'bg-[#1C1C1E] text-gray-400 border-[#222224] hover:text-white'
                    }`}
                  >
                    <Radio className="w-4 h-4 text-cyan-400" />
                    <div className="text-left">
                      <div className="leading-none">Telnet</div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">Port 23 (Raw TCP)</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Server Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. prod-web-03"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#1C1C1E] border border-[#222224] text-gray-200 focus:outline-hidden focus:border-emerald-500 font-sans"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-400 font-medium">Environment</label>
                    <button
                      type="button"
                      onClick={openAddEnvModal}
                      className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5 font-medium"
                      title="Create New Environment"
                    >
                      <Plus className="w-2.5 h-2.5" /> New
                    </button>
                  </div>
                  <select
                    value={formEnv}
                    onChange={(e) => setFormEnv(e.target.value as EnvironmentType)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#1C1C1E] border border-[#222224] text-gray-200 focus:outline-hidden focus:border-emerald-500 capitalize"
                  >
                    {environments.map((e) => (
                      <option key={e.id} value={e.name}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-gray-400 font-medium mb-1">Hostname or IP *</label>
                  <input
                    type="text"
                    required
                    value={formHostname}
                    onChange={(e) => setFormHostname(e.target.value)}
                    placeholder="10.0.1.25 or app.server.com"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#1C1C1E] border border-[#222224] text-gray-200 focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Port</label>
                  <input
                    type="number"
                    value={formPort}
                    onChange={(e) => setFormPort(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#1C1C1E] border border-[#222224] text-gray-200 focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Username</label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="deploy, root, ubuntu"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#1C1C1E] border border-[#222224] text-gray-200 focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Identity / Keystore</label>
                  {formConnectionType === 'telnet' ? (
                    <div className="w-full px-3 py-1.5 rounded-lg bg-[#18181A] border border-[#222224] text-gray-500 italic">
                      Not applicable for Telnet
                    </div>
                  ) : (
                    <select
                      value={formIdentityId}
                      onChange={(e) => setFormIdentityId(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#1C1C1E] border border-[#222224] text-gray-200 focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="">None (Password Prompt)</option>
                      {identities.map((id) => (
                        <option key={id.id} value={id.id}>
                          {id.name} ({id.type})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Server Password & DB Persistence */}
              <div className="p-3 rounded-lg bg-[#141416] border border-[#222224] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-gray-300 font-medium text-xs flex items-center gap-1.5">
                    <Key className={`w-3.5 h-3.5 ${formConnectionType === 'telnet' ? 'text-cyan-400' : 'text-emerald-400'}`} />
                    <span>{formConnectionType === 'telnet' ? 'Telnet Password (Auto-Login)' : 'Server Password (Auto-Login)'}</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formSavePassword}
                      onChange={(e) => setFormSavePassword(e.target.checked)}
                      className={`rounded bg-[#1C1C1E] border-[#333] focus:ring-0 w-3.5 h-3.5 cursor-pointer ${
                        formConnectionType === 'telnet' ? 'text-cyan-500' : 'text-emerald-500'
                      }`}
                    />
                    <span className={`text-[11px] font-medium ${formConnectionType === 'telnet' ? 'text-cyan-400' : 'text-emerald-400'}`}>
                      Save Password to DB
                    </span>
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={
                      formConnectionType === 'telnet'
                        ? 'Enter Telnet server password for auto-login (optional)...'
                        : 'Enter SSH server password for auto-login...'
                    }
                    className="w-full px-3 py-1.5 pr-10 rounded-lg bg-[#1C1C1E] border border-[#222224] text-gray-200 focus:outline-hidden focus:border-emerald-500 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400">
                  Password database ma save hoga. Jab aap host par click karenge toh yeh password use karke auto connect ho jayega.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Host Group</label>
                  <select
                    value={formGroupId}
                    onChange={(e) => setFormGroupId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#1C1C1E] border border-[#222224] text-gray-200 focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="">Ungrouped</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 font-medium mb-1">Proxy Jump Bastion</label>
                  <select
                    value={formProxyJump}
                    onChange={(e) => setFormProxyJump(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#1C1C1E] border border-[#222224] text-gray-200 focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="">Direct Connection (No Jump)</option>
                    {hosts
                      .filter((h) => !editingHost || h.id !== editingHost.id)
                      .map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} ({h.hostname})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Primary load balancer in Virginia VPC..."
                  className="w-full px-3 py-1.5 rounded-lg bg-[#1C1C1E] border border-[#222224] text-gray-200 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="web, production, nginx"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#1C1C1E] border border-[#222224] text-gray-200 focus:outline-hidden focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Real Connection Diagnostic Probe Test */}
              <div className="pt-2 border-t border-[#222224]">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Pre-flight Reachability Test:</span>
                  <button
                    type="button"
                    onClick={handleTestProbe}
                    disabled={isTestingProbe || !formHostname}
                    className="px-2.5 py-1 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-200 border border-[#222224] font-medium text-xs disabled:opacity-50"
                  >
                    {isTestingProbe ? 'Probing...' : 'Test Connection'}
                  </button>
                </div>
                {probeResult && (
                  <div
                    className={`mt-2 p-2 rounded text-[11px] font-mono ${
                      probeResult.success
                        ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/50'
                        : 'bg-red-950/50 text-red-300 border border-red-800/50'
                    }`}
                  >
                    {probeResult.message}
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-[#222224] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-sm"
                >
                  {editingHost ? 'Save Changes' : 'Create Server'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Create/Edit Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#111112] border border-[#222224] rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#222224] flex items-center justify-between bg-[#0A0A0B]">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-white text-sm">
                  {editingGroup ? 'Edit Host Group' : 'Create New Host Group'}
                </h3>
              </div>
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 font-medium mb-1">Group Name *</label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Production Cluster, Core Routers, Lab Switches"
                  className="w-full px-3 py-2 rounded-lg bg-[#1C1C1E] border border-[#222224] text-gray-200 focus:outline-hidden focus:border-emerald-500 font-sans text-xs"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1.5">Group Accent Color</label>
                <div className="flex items-center gap-2">
                  {[
                    '#10b981', // emerald
                    '#06b6d4', // cyan
                    '#3b82f6', // blue
                    '#8b5cf6', // purple
                    '#ec4899', // pink
                    '#f59e0b', // amber
                    '#ef4444', // red
                    '#64748b', // slate
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setGroupColor(color)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        groupColor === color ? 'scale-125 ring-2 ring-white/60' : 'hover:scale-110 opacity-75'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={groupColor}
                    onChange={(e) => setGroupColor(e.target.value)}
                    className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer ml-1"
                    title="Choose custom color"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-gray-400 font-medium">Default Environment</label>
                  <button
                    type="button"
                    onClick={openAddEnvModal}
                    className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5 font-medium"
                    title="Create New Environment"
                  >
                    <Plus className="w-2.5 h-2.5" /> New
                  </button>
                </div>
                <select
                  value={groupEnv}
                  onChange={(e) => setGroupEnv(e.target.value as EnvironmentType)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#1C1C1E] border border-[#222224] text-gray-200 focus:outline-hidden focus:border-emerald-500 capitalize"
                >
                  {environments.map((e) => (
                    <option key={e.id} value={e.name}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="Notes about servers in this group..."
                  className="w-full px-3 py-1.5 rounded-lg bg-[#1C1C1E] border border-[#222224] text-gray-200 focus:outline-hidden focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-[#222224] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-sm"
                >
                  {editingGroup ? 'Save Group' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Environment Create/Edit Modal */}
      {isEnvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#111112] border border-[#222224] rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#222224] flex items-center justify-between bg-[#0A0A0B]">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-white text-sm">
                  {editingEnv ? 'Edit Environment' : 'Create New Environment'}
                </h3>
              </div>
              <button
                onClick={() => setIsEnvModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEnvironment} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 font-medium mb-1">Environment Name *</label>
                <input
                  type="text"
                  required
                  value={envName}
                  onChange={(e) => setEnvName(e.target.value)}
                  placeholder="e.g. testing, disaster-recovery, edge-node, cloud-aws"
                  className="w-full px-3 py-2 rounded-lg bg-[#1C1C1E] border border-[#222224] text-gray-200 focus:outline-hidden focus:border-emerald-500 font-sans text-xs"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1.5">Environment Accent Color</label>
                <div className="flex items-center gap-2">
                  {[
                    '#10b981', // emerald
                    '#06b6d4', // cyan
                    '#3b82f6', // blue
                    '#8b5cf6', // purple
                    '#ec4899', // pink
                    '#f59e0b', // amber
                    '#ef4444', // red
                    '#64748b', // slate
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEnvColor(color)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        envColor === color ? 'scale-125 ring-2 ring-white/60' : 'hover:scale-110 opacity-75'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={envColor}
                    onChange={(e) => setEnvColor(e.target.value)}
                    className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer ml-1"
                    title="Choose custom color"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={envDesc}
                  onChange={(e) => setEnvDesc(e.target.value)}
                  placeholder="Purpose of this environment..."
                  className="w-full px-3 py-1.5 rounded-lg bg-[#1C1C1E] border border-[#222224] text-gray-200 focus:outline-hidden focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-[#222224] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEnvModalOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-sm"
                >
                  {editingEnv ? 'Save Environment' : 'Create Environment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#141416] border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Delete All Servers?</h3>
                <p className="text-xs text-gray-400 mt-0.5">Permanent Inventory Wipe</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Are you sure you want to permanently delete all <strong className="text-white font-mono">{hosts.length}</strong> server(s) from your inventory? This action cannot be undone.
            </p>

            <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>All host credentials, custom ports, and tags will be erased.</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteAllModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-[#1C1C1E] hover:bg-[#252528] border border-[#2A2A2D] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteAllHosts?.();
                  setIsDeleteAllModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete All ({hosts.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
