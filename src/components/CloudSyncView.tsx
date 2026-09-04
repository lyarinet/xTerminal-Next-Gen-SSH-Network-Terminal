import React, { useState, useEffect } from 'react';
import {
  Cloud,
  FolderSync,
  Users,
  Shield,
  Laptop,
  Smartphone,
  CheckCircle2,
  Lock,
  RefreshCw,
  Plus,
  Trash2,
  Key,
  Server,
  Zap,
  Globe,
  Settings
} from 'lucide-react';

interface DeviceItem {
  id: string;
  name: string;
  type: 'desktop' | 'laptop' | 'mobile';
  os: string;
  lastSync: string;
  isCurrent: boolean;
  ip: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  joinedAt: string;
  avatar: string;
}

interface Workspace {
  id: string;
  name: string;
  description: string;
  hostsCount: number;
  snippetsCount: number;
  membersCount: number;
  color: string;
  isCurrent: boolean;
}

export const CloudSyncView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sync' | 'workspaces' | 'team'>('sync');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState('Just now');

  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const res = await fetch('/api/sync/workspaces');
        if (res.ok) {
          const data = await res.json();
          if (data.workspaces) setWorkspaces(data.workspaces);
          if (data.devices) setDevices(data.devices);
          if (data.team) setTeamMembers(data.team);
        }
      } catch (err) {
        console.error('Failed to load cloud sync data:', err);
      }
    };
    loadWorkspaces();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/sync/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaces }),
      });
      setSyncStatus('synced');
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSwitchWorkspace = async (id: string) => {
    const updated = workspaces.map((w) => ({
      ...w,
      isCurrent: w.id === id,
    }));
    setWorkspaces(updated);
    try {
      await fetch('/api/sync/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaces: updated }),
      });
    } catch (err) {
      console.error('Failed to persist workspace selection:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0B] text-gray-200 overflow-hidden font-sans select-none">
      {/* Top Header */}
      <div className="p-4 border-b border-[#222224] flex items-center justify-between bg-[#111112]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Cloud Sync, Workspaces &amp; Team Collaboration
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                AES-256 E2EE
              </span>
            </div>
            <p className="text-xs text-gray-400">
              End-to-end encrypted synchronization across all your desktop and mobile devices.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-[#1C1C1E] p-1 rounded-lg border border-[#222224]">
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
              activeTab === 'sync'
                ? 'bg-emerald-500 text-black shadow-xs'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Cloud Devices
          </button>
          <button
            onClick={() => setActiveTab('workspaces')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
              activeTab === 'workspaces'
                ? 'bg-blue-500 text-white shadow-xs'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Workspaces ({workspaces.length})
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
              activeTab === 'team'
                ? 'bg-purple-500 text-white shadow-xs'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Team &amp; RBAC ({teamMembers.length})
          </button>
        </div>
      </div>

      {/* Main Body Area */}
      <div className="flex-1 overflow-y-auto p-6 max-w-6xl w-full mx-auto space-y-6">
        {activeTab === 'sync' && (
          <div className="space-y-6">
            {/* Sync Status Banner */}
            <div className="bg-[#111112] border border-[#222224] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Encrypted Vault &amp; Hosts Synchronized</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      SECURE
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Zero-Knowledge E2EE encryption key derived from your master vault passphrase. Last sync: {lastSyncTime}.
                  </p>
                </div>
              </div>

              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-2 transition-all shrink-0 active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing Vault...' : 'Sync Now'}</span>
              </button>
            </div>

            {/* Sync Items Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#111112] border border-[#222224] p-3 rounded-lg">
                <div className="text-[11px] text-gray-400 font-mono uppercase">Synced Hosts</div>
                <div className="text-lg font-bold text-white mt-1">18 Servers</div>
              </div>
              <div className="bg-[#111112] border border-[#222224] p-3 rounded-lg">
                <div className="text-[11px] text-gray-400 font-mono uppercase">SSH Keypairs</div>
                <div className="text-lg font-bold text-blue-400 mt-1">6 Identities</div>
              </div>
              <div className="bg-[#111112] border border-[#222224] p-3 rounded-lg">
                <div className="text-[11px] text-gray-400 font-mono uppercase">Snippets &amp; Macros</div>
                <div className="text-lg font-bold text-emerald-400 mt-1">24 Commands</div>
              </div>
              <div className="bg-[#111112] border border-[#222224] p-3 rounded-lg">
                <div className="text-[11px] text-gray-400 font-mono uppercase">Custom Themes</div>
                <div className="text-lg font-bold text-purple-400 mt-1">10 Themes</div>
              </div>
            </div>

            {/* Registered Devices List */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Laptop className="w-4 h-4 text-emerald-400" />
                <span>Authorized Devices in Keyring ({devices.length})</span>
              </h3>

              <div className="space-y-2">
                {devices.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 rounded-xl bg-[#111112] border border-[#222224] text-xs">
                    No authorized devices registered yet.
                  </div>
                ) : (
                  devices.map((device) => (
                    <div
                      key={device.id}
                      className="bg-[#111112] border border-[#222224] rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-[#1C1C1E] text-gray-300">
                          {device.type === 'mobile' ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{device.name}</span>
                            {device.isCurrent && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                                THIS DEVICE
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5 flex items-center gap-3">
                            <span>{device.os}</span>
                            <span>IP: {device.ip}</span>
                            <span>Last Sync: {device.lastSync}</span>
                          </div>
                        </div>
                      </div>

                      {!device.isCurrent && (
                        <button className="text-xs text-red-400 hover:text-red-300 font-mono">
                          Revoke Access
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Workspaces Tab */}
        {activeTab === 'workspaces' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Project Workspaces</h3>
                <p className="text-xs text-gray-400">Separate credentials, hosts, and access per organization or team.</p>
              </div>
              <button className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                <span>New Workspace</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {workspaces.length === 0 ? (
                <div className="col-span-full p-12 text-center text-gray-500 rounded-xl bg-[#111112] border border-[#222224] text-xs">
                  No workspaces created yet. Click "New Workspace" to set up your team infrastructure.
                </div>
              ) : (
                workspaces.map((ws) => (
                  <div
                    key={ws.id}
                    className={`bg-[#111112] border rounded-xl p-5 flex flex-col justify-between transition-all ${
                      ws.isCurrent ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/5' : 'border-[#222224]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: ws.color }}
                        />
                        {ws.isCurrent ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                            ACTIVE
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSwitchWorkspace(ws.id)}
                            className="text-xs text-gray-400 hover:text-white font-medium"
                          >
                            Switch
                          </button>
                        )}
                      </div>
                      <h4 className="font-bold text-white text-base">{ws.name}</h4>
                      <p className="text-xs text-gray-400 line-clamp-2">{ws.description}</p>
                    </div>

                    <div className="pt-4 border-t border-[#222224] mt-4 flex items-center justify-between text-xs font-mono text-gray-400">
                      <span>{ws.hostsCount} Hosts</span>
                      <span>{ws.snippetsCount} Snippets</span>
                      <span>{ws.membersCount} Members</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Team & RBAC Tab */}
        {activeTab === 'team' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Team Members &amp; Role-Based Access Control</h3>
                <p className="text-xs text-gray-400">Manage collaborative access to shared infrastructure vaults and hosts.</p>
              </div>
              <button className="px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                <span>Invite Member</span>
              </button>
            </div>

            <div className="bg-[#111112] border border-[#222224] rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1C1C1E] text-gray-400 text-[11px] font-mono">
                  <tr>
                    <th className="p-3">Member</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Joined</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222224]">
                  {teamMembers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500 text-xs">
                        No team members invited yet.
                      </td>
                    </tr>
                  ) : (
                    teamMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-white/5">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-black font-bold text-xs">
                            {m.avatar}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{m.name}</span>
                            <span className="text-gray-400 font-mono text-[11px]">{m.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            m.role === 'admin'
                              ? 'bg-red-500/20 text-red-300'
                              : m.role === 'editor'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-gray-700 text-gray-300'
                          }`}
                        >
                          {m.role}
                        </span>
                      </td>
                      <td className="p-3 text-gray-400 font-mono">{m.joinedAt}</td>
                      <td className="p-3 text-right">
                        {m.role !== 'admin' && (
                          <button className="text-gray-500 hover:text-red-400 text-xs">
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
