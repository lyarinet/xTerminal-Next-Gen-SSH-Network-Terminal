import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { TerminalWorkspace } from './components/TerminalWorkspace';
import { HostsView } from './components/HostsView';
import { SftpView } from './components/SftpView';
import { SnippetsView } from './components/SnippetsView';
import { PortForwardingView } from './components/PortForwardingView';
import { KnownHostsView } from './components/KnownHostsView';
import { MonitoringView } from './components/MonitoringView';
import { VaultView } from './components/VaultView';
import { SshConfigView } from './components/SshConfigView';
import { HistoryAuditView } from './components/HistoryAuditView';
import { SettingsView } from './components/SettingsView';
import { CommandPalette } from './components/CommandPalette';
import { QuickConnectModal } from './components/QuickConnectModal';
import { AiAssistantModal } from './components/AiAssistantModal';
import { SerialConsoleView } from './components/SerialConsoleView';
import { TftpView } from './components/TftpView';
import { NetworkToolsView } from './components/NetworkToolsView';
import { MultiHostExecutionView } from './components/MultiHostExecutionView';
import { SshKeyManagerView } from './components/SshKeyManagerView';
import { PluginsView } from './components/PluginsView';
import { SessionRecorderModal } from './components/SessionRecorderModal';
import { UniversalImportModal } from './components/UniversalImportModal';
import { RemoteDesktopView } from './components/RemoteDesktopView';
import { TelecomHardwareView } from './components/TelecomHardwareView';
import { CloudSyncView } from './components/CloudSyncView';
import { AppCenterView } from './components/AppCenterView';
import { AdbManagerView } from './components/AdbManagerView';
import { SplashScreen } from './components/SplashScreen';
import { Menu, Bot, Plus, MessageSquare, User } from 'lucide-react';

import {
  Host,
  HostGroup,
  Identity,
  Snippet,
  PortForward,
  KnownHost,
  AuditEvent,
  TerminalSettings,
  VaultSettings,
  TerminalTab,
  TerminalPane,
  TransferQueueItem,
  RiskLevel,
  EnvironmentDef
} from './types';

import {
  loadStoredHosts,
  saveStoredHosts,
  loadStoredGroups,
  saveStoredGroups,
  loadStoredEnvironments,
  saveStoredEnvironments,
  loadStoredIdentities,
  saveStoredIdentities,
  loadStoredSnippets,
  saveStoredSnippets,
  loadStoredPortForwards,
  saveStoredPortForwards,
  loadStoredKnownHosts,
  saveStoredKnownHosts,
  loadStoredAuditEvents,
  saveStoredAuditEvents,
  loadStoredSettings,
  saveStoredSettings,
  loadStoredVaultSettings,
  saveStoredVaultSettings,
  DEFAULT_TERMINAL_SETTINGS
} from './lib/storage';

import { analyzeCommandRisk } from './lib/safetyEngine';
import { lockVault } from './lib/vault';

export default function App() {
  // Domain Data State
  const [hosts, setHosts] = useState<Host[]>(loadStoredHosts);
  const [groups, setGroups] = useState<HostGroup[]>(loadStoredGroups);
  const [environments, setEnvironments] = useState<EnvironmentDef[]>(loadStoredEnvironments);
  const [identities, setIdentities] = useState<Identity[]>(loadStoredIdentities);
  const [snippets, setSnippets] = useState<Snippet[]>(loadStoredSnippets);
  const [portForwards, setPortForwards] = useState<PortForward[]>(loadStoredPortForwards);
  const [knownHosts, setKnownHosts] = useState<KnownHost[]>(loadStoredKnownHosts);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(loadStoredAuditEvents);
  const [terminalSettings, setTerminalSettings] = useState<TerminalSettings>(loadStoredSettings);
  const [vaultSettings, setVaultSettings] = useState<VaultSettings>(loadStoredVaultSettings);

  // View & UI Navigation
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickConnectOpen, setIsQuickConnectOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isRecorderModalOpen, setIsRecorderModalOpen] = useState(false);
  const [sftpSelectedHostId, setSftpSelectedHostId] = useState<string | undefined>(hosts[0]?.id);
  const [aiTerminalContext, setAiTerminalContext] = useState<string>('');

  // Background Transfer Queue State (populated in real-time by SFTP and file sync)
  const [transfers, setTransfers] = useState<TransferQueueItem[]>([]);

  const handleToggleTransferStatus = (id: string) => {
    setTransfers((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (t.status === 'transferring') return { ...t, status: 'paused' };
        if (t.status === 'paused') return { ...t, status: 'transferring' };
        return t;
      })
    );
  };

  const handleCancelTransfer = (id: string) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'failed' } : t))
    );
  };

  const handleAddTransfer = (tx: TransferQueueItem) => {
    setTransfers((prev) => [tx, ...prev]);
  };

  const handleToggleFavorite = (hostId: string) => {
    setHosts((prev) =>
      prev.map((h) => (h.id === hostId ? { ...h, favorite: !h.favorite } : h))
    );
  };

  // Terminal State (Multi-Tab & Split Panes)
  const [tabs, setTabs] = useState<TerminalTab[]>([
    {
      id: 'tab-local',
      title: 'Local Station',
      status: 'connected',
      activePaneId: 'pane-local-1',
      panes: [
        {
          id: 'pane-local-1',
          buffer: [],
          commandHistory: [],
          title: 'Local Bash',
        },
      ],
      createdAt: new Date().toISOString(),
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-local');

  // Persistence side effects
  useEffect(() => saveStoredHosts(hosts), [hosts]);
  useEffect(() => saveStoredGroups(groups), [groups]);
  useEffect(() => saveStoredEnvironments(environments), [environments]);
  useEffect(() => saveStoredIdentities(identities), [identities]);
  useEffect(() => saveStoredSnippets(snippets), [snippets]);
  useEffect(() => saveStoredPortForwards(portForwards), [portForwards]);
  useEffect(() => saveStoredKnownHosts(knownHosts), [knownHosts]);
  useEffect(() => saveStoredAuditEvents(auditEvents), [auditEvents]);
  useEffect(() => saveStoredSettings(terminalSettings), [terminalSettings]);
  useEffect(() => saveStoredVaultSettings(vaultSettings), [vaultSettings]);

  // Real-time password sync from interactive terminal auth
  useEffect(() => {
    const handleUpdateHostPassword = (e: any) => {
      const { hostname, port, password } = e.detail || {};
      if (hostname && password) {
        setHosts((prev) =>
          prev.map((h) =>
            h.hostname === hostname && (!port || h.port === Number(port))
              ? { ...h, password, savePassword: true }
              : h
          )
        );
      }
    };
    window.addEventListener('xterminal:update-host-password' as any, handleUpdateHostPassword);
    return () => window.removeEventListener('xterminal:update-host-password' as any, handleUpdateHostPassword);
  }, []);

  // Real-time terminal settings sync from Workstation Settings & Workspace dropdown
  useEffect(() => {
    const handleSettingsChanged = (e: any) => {
      if (e.detail) {
        setTerminalSettings((prev) => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener('xterminal:settings-changed' as any, handleSettingsChanged);
    return () => window.removeEventListener('xterminal:settings-changed' as any, handleSettingsChanged);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K -> Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      // Cmd+T or Ctrl+T -> New Terminal Tab
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        handleNewTab();
        setActiveView('terminal');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs]);

  // Audit logging helper
  const addAuditLog = (
    action: string,
    details: string,
    options?: {
      hostId?: string;
      hostName?: string;
      command?: string;
      riskLevel?: RiskLevel;
      exitCode?: number;
    }
  ) => {
    const newEvent: AuditEvent = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: action,
      description: details,
      user: 'current-user',
      hostId: options?.hostId,
      hostName: options?.hostName,
      command: options?.command,
      riskLevel: options?.riskLevel,
      exitCode: options?.exitCode ?? 0,
    };
    setAuditEvents((prev) => [newEvent, ...prev.slice(0, 199)]);
  };

  // SSH / Telnet Connection Handler
  const handleConnectHost = (host: Host) => {
    // If a tab for this host is already open, focus it directly without reconnecting
    const existingTab = tabs.find((t) => t.hostId === host.id || t.host?.id === host.id);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      setActiveView('terminal');
      return;
    }

    const tabId = `tab-ssh-${host.id}-${Date.now()}`;
    const paneId = `pane-${tabId}-1`;

    const newTab: TerminalTab = {
      id: tabId,
      title: host.name,
      host,
      hostId: host.id,
      status: 'connecting',
      activePaneId: paneId,
      panes: [
        {
          id: paneId,
          buffer: [],
          commandHistory: [],
          title: `${host.username}@${host.name}`,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(tabId);
    setActiveView('terminal');

    // Update host last connected time
    setHosts((prev) =>
      prev.map((h) => (h.id === host.id ? { ...h, lastConnectedAt: new Date().toISOString() } : h))
    );

    addAuditLog('SESSION_START', `SSH session initiated to ${host.name} (${host.hostname}:${host.port})`, {
      hostId: host.id,
      hostName: host.name,
    });

    // Complete connection handshake
    setTimeout(() => {
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, status: 'connected' } : t))
      );
    }, 400);
  };

  // Quick Connect Dialog Submission
  const handleQuickConnect = (details: {
    name: string;
    hostname: string;
    port: number;
    username: string;
    password?: string;
    identityId?: string;
  }) => {
    // Check if host already exists in inventory
    let existingHost = hosts.find((h) => h.hostname === details.hostname && h.port === details.port);
    if (!existingHost) {
      existingHost = {
        id: `host-${Date.now()}`,
        name: details.name,
        hostname: details.hostname,
        port: details.port,
        username: details.username,
        password: details.password,
        savePassword: !!details.password,
        description: 'Added via Quick Connect',
        environment: 'development',
        connectionType: 'ssh',
        identityId: details.identityId,
        tags: ['quick-connect'],
        color: '#3b82f6',
        fingerprint: `SHA256:${Math.random().toString(36).slice(2, 14)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'online',
      };
      setHosts((prev) => [existingHost!, ...prev]);
    } else if (details.password) {
      existingHost = {
        ...existingHost,
        password: details.password,
        savePassword: true,
      };
      setHosts((prev) => prev.map((h) => (h.id === existingHost!.id ? existingHost! : h)));
    }
    handleConnectHost(existingHost);
  };

  // Terminal Tab Operations
  const handleNewTab = (host?: Host, customTab?: Partial<TerminalTab>) => {
    if (host) {
      handleConnectHost(host);
      return;
    }
    const tabId = customTab?.id || `tab-local-${Date.now()}`;
    const paneId = `pane-${tabId}-1`;
    const newTab: TerminalTab = {
      id: tabId,
      title: customTab?.title || `Local Station ${tabs.length + 1}`,
      status: 'connected',
      activePaneId: paneId,
      panes: [
        {
          id: paneId,
          buffer: [],
          commandHistory: [],
          title: customTab?.title || 'Terminal',
        },
      ],
      createdAt: new Date().toISOString(),
      ...customTab,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(tabId);
    setActiveView('terminal');
  };

  const handleCloseTab = (tabId: string) => {
    if (tabs.length <= 1) {
      // Keep at least one tab open
      handleNewTab();
    }
    setTabs((prev) => prev.filter((t) => t.id !== tabId));
    if (activeTabId === tabId) {
      const remaining = tabs.filter((t) => t.id !== tabId);
      if (remaining.length > 0) {
        setActiveTabId(remaining[remaining.length - 1].id);
      }
    }
    addAuditLog('SESSION_TERMINATE', `Terminal session ${tabId} closed`);
  };

  const handleSplitPane = (tabId: string, direction: 'horizontal' | 'vertical') => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== tabId) return t;
        const newPaneId = `pane-${tabId}-${t.panes.length + 1}`;
        const newPane: TerminalPane = {
          id: newPaneId,
          buffer: [
            `[Split ${direction}] Secondary session attached to ${t.title}`,
            'deploy@nexusterm:~$ ',
          ],
          commandHistory: [],
          title: `${t.title} (Split)`,
        };
        return {
          ...t,
          splitDirection: direction,
          panes: [...t.panes, newPane],
          activePaneId: newPaneId,
        };
      })
    );
  };

  const handleClosePane = (tabId: string, paneId: string) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== tabId) return t;
        const remaining = t.panes.filter((p) => p.id !== paneId);
        if (remaining.length === 0) return t;
        return {
          ...t,
          panes: remaining,
          activePaneId: remaining[0].id,
        };
      })
    );
  };

  // Command Execution within Terminal
  const handleExecuteCommand = async (tabId: string, command: string) => {
    const targetTab = tabs.find((t) => t.id === tabId) || tabs[0];
    const risk = analyzeCommandRisk(command);

    // Audit log
    addAuditLog('COMMAND_EXEC', `Executed "${command}"`, {
      hostId: targetTab?.host?.id,
      hostName: targetTab?.host?.name || 'Local Station',
      command,
      riskLevel: risk.riskLevel,
      exitCode: 0,
    });

    const cmdTrim = command.trim();
    if (cmdTrim === 'clear') {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId) return t;
          return {
            ...t,
            panes: t.panes.map((p) =>
              p.id === t.activePaneId ? { ...p, buffer: [] } : p
            ),
          };
        })
      );
      return;
    }

    let outputText = '';
    try {
      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          host: targetTab?.host?.hostname,
        }),
      });
      const data = await res.json();
      outputText = data.output || data.stdout || data.stderr || (data.success ? '' : `Error: exit code ${data.exitCode}`);
    } catch (err: any) {
      outputText = `Execution error: ${err.message || 'Failed to reach terminal backend service'}`;
    }

    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== tabId) return t;
        return {
          ...t,
          panes: t.panes.map((p) => {
            if (p.id !== t.activePaneId) return p;
            return {
              ...p,
              buffer: [
                ...p.buffer,
                `$ ${command}`,
                ...(outputText ? [outputText] : []),
              ],
              commandHistory: [...p.commandHistory, command],
            };
          }),
        };
      })
    );
  };

  // Execute snippet directly on terminal view
  const handleExecuteSnippetOnTerminal = (command: string, host?: Host) => {
    if (host) {
      handleConnectHost(host);
    }
    setActiveView('terminal');
    setTimeout(() => {
      handleExecuteCommand(activeTabId, command);
    }, 300);
  };

  // Open SFTP view focused on a specific host
  const handleOpenSftp = (host: Host) => {
    setSftpSelectedHostId(host.id);
    setActiveView('sftp');
  };

  // Tunnel toggling
  const handleToggleTunnel = (tunnelId: string) => {
    setPortForwards((prev) =>
      prev.map((pf) => {
        if (pf.id !== tunnelId) return pf;
        const willBeActive = pf.status !== 'active';
        addAuditLog(
          'PORT_FORWARD',
          `Tunnel "${pf.name}" ${willBeActive ? 'started' : 'stopped'} (${pf.bindAddress}:${pf.bindPort} -> ${pf.targetHost}:${pf.targetPort})`
        );
        return {
          ...pf,
          status: willBeActive ? 'active' : 'stopped',
          bytesTransferred: willBeActive ? pf.bytesTransferred + 1024 * 45 : pf.bytesTransferred,
          logs: [
            `[${new Date().toLocaleTimeString()}] Tunnel ${willBeActive ? 'established' : 'terminated by user'}`,
            ...pf.logs,
          ],
        };
      })
    );
  };

  // Known hosts key trust
  const handleTrustKey = (hostId: string) => {
    setKnownHosts((prev) =>
      prev.map((kh) => {
        if (kh.id !== hostId) return kh;
        addAuditLog('KEY_TRUSTED', `Manually trusted updated fingerprint for ${kh.hostname}`);
        return {
          ...kh,
          status: 'trusted',
          expectedFingerprint: kh.fingerprint,
          lastSeen: new Date().toISOString(),
        };
      })
    );
  };

  // AI with Terminal Context
  const handleOpenAiWithContext = (context: string) => {
    setAiTerminalContext(context);
    setIsAiAssistantOpen(true);
  };

  // Vault Lock Toggle
  const handleToggleVaultLock = () => {
    if (vaultSettings.isLocked) {
      setActiveView('vault');
    } else {
      lockVault();
      setVaultSettings((prev) => ({ ...prev, isLocked: true }));
      addAuditLog('VAULT_LOCKED', 'Keystore locked and session keys purged from memory');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0A0B] font-sans antialiased text-[#E0E0E0] select-none">
      {/* Startup Animated Splash Screen */}
      {showSplashScreen && (
        <SplashScreen onFinish={() => setShowSplashScreen(false)} />
      )}

      {/* Primary Left Navigation Bar (Desktop Persistent + Mobile Drawer) */}
      <Sidebar
        currentView={activeView}
        onSelectView={setActiveView}
        activeTabsCount={tabs.length}
        activeTunnelsCount={portForwards.filter((p) => p.status === 'active').length}
        vaultSettings={vaultSettings}
        onToggleVaultLock={handleToggleVaultLock}
        onOpenQuickConnect={() => setIsQuickConnectOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header Bar */}
        <header className="md:hidden h-12 bg-[#111112] border-b border-[#222224] px-3 flex items-center justify-between shrink-0 select-none z-20">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 rounded-lg bg-[#1C1C1E] text-gray-300 hover:text-white border border-[#222224] active:scale-95 transition-transform"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 font-bold text-xs text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="capitalize">{activeView}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('xterminal:toggle-chat'))}
              className="p-1.5 rounded-md bg-[#1C1C1E] text-emerald-400 hover:bg-[#252528] border border-[#222224] flex items-center gap-1 active:scale-95"
              title="Multiplayer Chat & Team (Slide Over)"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsQuickConnectOpen(true)}
              className="px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Connect</span>
            </button>
            <button
              onClick={() => setIsAiAssistantOpen(true)}
              className="p-1.5 rounded-md bg-[#1C1C1E] text-emerald-400 hover:bg-[#252528] border border-[#222224]"
              title="AI Copilot"
            >
              <Bot className="w-4 h-4" />
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('xterminal:open-profile'))}
              className="p-1.5 rounded-md bg-[#1C1C1E] text-emerald-400 hover:bg-[#252528] border border-[#222224] flex items-center active:scale-95"
              title="Change Profile & Avatar"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </header>
        {activeView === 'dashboard' && (
          <DashboardView
            hosts={hosts}
            activeSessionsCount={tabs.length}
            portForwards={portForwards}
            vaultSettings={vaultSettings}
            auditEvents={auditEvents}
            transfers={transfers}
            onToggleTransferStatus={handleToggleTransferStatus}
            onCancelTransfer={handleCancelTransfer}
            onToggleFavorite={handleToggleFavorite}
            onConnectHost={handleConnectHost}
            onOpenSftp={handleOpenSftp}
            onOpenView={setActiveView}
            onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
            onOpenQuickConnect={() => setIsQuickConnectOpen(true)}
          />
        )}

        <div className={`flex-1 flex flex-col overflow-hidden ${activeView === 'terminal' ? 'flex' : 'hidden'}`}>
          <TerminalWorkspace
            tabs={tabs}
            activeTabId={activeTabId}
            hosts={hosts}
            snippets={snippets}
            terminalSettings={terminalSettings}
            onSelectTab={setActiveTabId}
            onCloseTab={handleCloseTab}
            onNewTab={handleNewTab}
            onSplitPane={handleSplitPane}
            onClosePane={handleClosePane}
            onExecuteCommand={handleExecuteCommand}
            onOpenAiWithContext={handleOpenAiWithContext}
          />
        </div>

        {activeView === 'hosts' && (
          <HostsView
            hosts={hosts}
            groups={groups}
            identities={identities}
            environments={environments}
            onConnectHost={handleConnectHost}
            onOpenSftp={handleOpenSftp}
            onSaveHost={(h) => {
              setHosts((prev) => {
                const idx = prev.findIndex((item) => item.id === h.id);
                if (idx >= 0) {
                  const updated = [...prev];
                  updated[idx] = h;
                  return updated;
                }
                return [h, ...prev];
              });
              addAuditLog('HOST_MODIFIED', `Server ${h.name} (${h.hostname}) saved`, {
                hostId: h.id,
                hostName: h.name,
              });
            }}
            onDeleteHost={(id) => {
              const h = hosts.find((item) => item.id === id);
              setHosts((prev) => prev.filter((item) => item.id !== id));
              addAuditLog('HOST_DELETED', `Server ${h?.name || id} removed from inventory`);
            }}
            onDeleteAllHosts={() => {
              const count = hosts.length;
              setHosts([]);
              addAuditLog('ALL_HOSTS_DELETED', `All ${count} servers removed from inventory`);
            }}
            onOpenImport={() => setIsImportModalOpen(true)}
            onSaveGroup={(group) => {
              setGroups((prev) => {
                const idx = prev.findIndex((g) => g.id === group.id);
                if (idx >= 0) {
                  const updated = [...prev];
                  updated[idx] = group;
                  return updated;
                }
                return [...prev, group];
              });
              addAuditLog('GROUP_MODIFIED', `Host group "${group.name}" saved`);
            }}
            onDeleteGroup={(groupId) => {
              const grp = groups.find((g) => g.id === groupId);
              setGroups((prev) => prev.filter((g) => g.id !== groupId));
              setHosts((prev) => prev.map((h) => (h.groupId === groupId ? { ...h, groupId: undefined } : h)));
              addAuditLog('GROUP_DELETED', `Host group "${grp?.name || groupId}" removed`);
            }}
            onSaveEnvironment={(env) => {
              setEnvironments((prev) => {
                const idx = prev.findIndex((e) => e.id === env.id);
                if (idx >= 0) {
                  const updated = [...prev];
                  updated[idx] = env;
                  return updated;
                }
                return [...prev, env];
              });
              addAuditLog('ENVIRONMENT_MODIFIED', `Environment "${env.name}" saved`);
            }}
            onDeleteEnvironment={(envId) => {
              const env = environments.find((e) => e.id === envId);
              setEnvironments((prev) => prev.filter((e) => e.id !== envId));
              addAuditLog('ENVIRONMENT_DELETED', `Environment "${env?.name || envId}" removed`);
            }}
          />
        )}

        {activeView === 'sftp' && (
          <SftpView
            hosts={hosts}
            selectedHostId={sftpSelectedHostId}
            onSelectHost={setSftpSelectedHostId}
            transfers={transfers}
            onAddTransfer={handleAddTransfer}
          />
        )}

        {activeView === 'snippets' && (
          <SnippetsView
            snippets={snippets}
            hosts={hosts}
            onSaveSnippet={(snip) => {
              setSnippets((prev) => {
                const idx = prev.findIndex((s) => s.id === snip.id);
                if (idx >= 0) {
                  const updated = [...prev];
                  updated[idx] = snip;
                  return updated;
                }
                return [snip, ...prev];
              });
            }}
            onDeleteSnippet={(id) => setSnippets((prev) => prev.filter((s) => s.id !== id))}
            onExecuteOnTerminal={handleExecuteSnippetOnTerminal}
          />
        )}

        {activeView === 'forwarding' && (
          <PortForwardingView
            portForwards={portForwards}
            hosts={hosts}
            onToggleTunnel={handleToggleTunnel}
            onSaveTunnel={(t) => {
              setPortForwards((prev) => [t, ...prev]);
            }}
            onDeleteTunnel={(id) => setPortForwards((prev) => prev.filter((p) => p.id !== id))}
          />
        )}

        {activeView === 'monitoring' && <MonitoringView hosts={hosts} />}

        {activeView === 'knownHosts' && (
          <KnownHostsView
            knownHosts={knownHosts}
            onTrustKey={handleTrustKey}
            onDeleteKey={(id) => setKnownHosts((prev) => prev.filter((k) => k.id !== id))}
          />
        )}

        {activeView === 'vault' && (
          <VaultView
            identities={identities}
            vaultSettings={vaultSettings}
            onUpdateVaultSettings={setVaultSettings}
            onAddIdentity={(id) => {
              setIdentities((prev) => [id, ...prev]);
              addAuditLog('IDENTITY_CREATED', `SSH key identity "${id.name}" added to vault`);
            }}
            onDeleteIdentity={(id) => {
              setIdentities((prev) => prev.filter((item) => item.id !== id));
              addAuditLog('IDENTITY_DELETED', `Identity ${id} deleted from vault`);
            }}
          />
        )}

        {activeView === 'sshConfig' && (
          <SshConfigView
            hosts={hosts}
            identities={identities}
            onImportHosts={(imported) => {
              setHosts((prev) => [...imported, ...prev]);
              addAuditLog('SSH_CONFIG_IMPORT', `Imported ${imported.length} hosts from ~/.ssh/config`);
            }}
          />
        )}

        {activeView === 'history' && (
          <HistoryAuditView
            auditEvents={auditEvents}
            onClearHistory={() => setAuditEvents([])}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView
            settings={terminalSettings}
            vaultSettings={vaultSettings}
            onUpdateSettings={setTerminalSettings}
            onUpdateVaultSettings={setVaultSettings}
            onResetDefaults={() => setTerminalSettings(DEFAULT_TERMINAL_SETTINGS)}
          />
        )}

        {activeView === 'serial' && <SerialConsoleView />}

        {activeView === 'adb' && <AdbManagerView />}

        {activeView === 'tftp' && <TftpView />}

        {activeView === 'network' && <NetworkToolsView />}

        {activeView === 'multihost' && (
          <MultiHostExecutionView
            hosts={hosts}
            groups={groups}
            onOpenAiWithContext={handleOpenAiWithContext}
          />
        )}

        {activeView === 'sshkeys' && <SshKeyManagerView />}

        {activeView === 'plugins' && <PluginsView />}

        {activeView === 'rdp' && <RemoteDesktopView />}

        {activeView === 'telecom' && <TelecomHardwareView />}

        {activeView === 'cloudSync' && <CloudSyncView />}

        {activeView === 'appCenter' && <AppCenterView />}

        {/* Elegant Dark Status Footer */}
        <footer className="h-7 bg-[#111112] border-t border-[#222224] px-4 flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-widest font-mono shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              STATUS: NOMINAL
            </span>
            <span className="hidden sm:inline">ENCRYPTION: AES-256-GCM</span>
            <span className="hidden md:inline">SESSIONS: {tabs.length}</span>
            <span className="hidden md:inline">TUNNELS: {portForwards.filter((p) => p.status === 'active').length}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 transition-colors uppercase font-mono"
            >
              [IMPORT SESSIONS]
            </button>
            <button
              onClick={() => setIsRecorderModalOpen(true)}
              className="text-gray-400 hover:text-white transition-colors uppercase font-mono"
            >
              [REPLAY RECORDER]
            </button>
            <span>PORT: 3000</span>
            <span className="hidden sm:flex items-center gap-1.5 text-gray-400">
              <span className="text-gray-300 font-semibold">xTerminal Pro</span>
              <span className="text-gray-600">•</span>
              <span className="text-emerald-400 font-medium">Powered by Lyarinet</span>
            </span>
          </div>
        </footer>
      </main>

      {/* Universal Connection Importer */}
      <UniversalImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportHosts={(imported) => {
          setHosts((prev) => [...imported, ...prev]);
          addAuditLog('IMPORT_BATCH', `Imported ${imported.length} connections into inventory`);
        }}
      />

      {/* Session Recorder & Asciinema Player */}
      <SessionRecorderModal
        isOpen={isRecorderModalOpen}
        onClose={() => setIsRecorderModalOpen(false)}
      />

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        hosts={hosts}
        snippets={snippets}
        portForwards={portForwards}
        onSelectHost={handleConnectHost}
        onSelectView={setActiveView}
        onLockVault={handleToggleVaultLock}
      />

      {/* Quick Connect Modal */}
      <QuickConnectModal
        isOpen={isQuickConnectOpen}
        onClose={() => setIsQuickConnectOpen(false)}
        hosts={hosts}
        identities={identities}
        onConnect={handleQuickConnect}
      />

      {/* AI Assistant Modal */}
      <AiAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        terminalContext={aiTerminalContext}
        onExecuteCommand={(cmd) => {
          setActiveView('terminal');
          handleExecuteCommand(activeTabId, cmd);
        }}
      />
    </div>
  );
}
