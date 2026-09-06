import React from 'react';
import {
  LayoutDashboard,
  Server,
  Terminal,
  FolderSync,
  Zap,
  Radio,
  Activity,
  Shield,
  Lock,
  Unlock,
  History,
  Settings,
  Bot,
  Search,
  Plus,
  Network,
  FileCode,
  Globe,
  HardDrive,
  Key,
  Layers,
  Puzzle,
  Monitor,
  Cloud,
  Cpu,
  Smartphone,
  Sliders,
  Users,
  MessageSquare,
  X
} from 'lucide-react';
import { VaultSettings } from '../types';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  activeTabsCount: number;
  activeTunnelsCount: number;
  vaultSettings: VaultSettings;
  onToggleVaultLock: () => void;
  onOpenQuickConnect: () => void;
  onOpenCommandPalette: () => void;
  onOpenAiAssistant: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  activeTabsCount,
  activeTunnelsCount,
  vaultSettings,
  onToggleVaultLock,
  onOpenQuickConnect,
  onOpenCommandPalette,
  onOpenAiAssistant,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const sections = [
    {
      category: 'Core Terminal & Access',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'hosts', label: 'Hosts & Groups', icon: Server },
        { id: 'terminal', label: 'Terminal', icon: Terminal, badge: activeTabsCount > 0 ? activeTabsCount : undefined },
        { id: 'terminal', label: 'Multiplayer Collab', icon: Users, badge: 'Live', badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
        { id: 'multiplayer-chat', label: 'Multiplayer Chat & Team', icon: MessageSquare, badge: 'Chat', badgeColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
        { id: 'multihost', label: 'Multi-Host Runner', icon: Layers },
        { id: 'sftp', label: 'SFTP Explorer', icon: FolderSync },
        { id: 'serial', label: 'Serial TTY Console', icon: Cpu },
        { id: 'adb', label: 'Android ADB Console', icon: Smartphone, badge: 'Direct & Remote', badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
        { id: 'rdp', label: 'Remote Desktop (VNC)', icon: Monitor },
      ],
    },
    {
      category: 'Cloud & Infrastructure',
      items: [
        { id: 'telecom', label: 'Telecom, Cisco & Diagnostics', icon: Radio },
        { id: 'tftp', label: 'TFTP Server & Client', icon: HardDrive },
        { id: 'network', label: 'Network Tools & Scanner', icon: Globe },
        { id: 'forwarding', label: 'Port Forwarding', icon: Network, badge: activeTunnelsCount > 0 ? activeTunnelsCount : undefined, badgeColor: 'bg-emerald-500/20 text-emerald-400' },
        { id: 'monitoring', label: 'Server Health & Stats', icon: Activity },
      ],
    },
    {
      category: 'Security & Identities',
      items: [
        { id: 'sshkeys', label: 'SSH Key Manager', icon: Key },
        { id: 'knownHosts', label: 'Known Hosts & Fingerprints', icon: Shield },
        { id: 'vault', label: 'Vault & Secrets', icon: vaultSettings.isLocked ? Lock : Unlock },
        { id: 'history', label: 'Audit & Session History', icon: History },
      ],
    },
    {
      category: 'Productivity & Sync',
      items: [
        { id: 'snippets', label: 'Snippets & Automation', icon: Zap },
        { id: 'sshConfig', label: 'OpenSSH Sync (~/.ssh)', icon: FileCode },
        { id: 'cloudSync', label: 'Cloud Sync & Teams', icon: Cloud },
        { id: 'plugins', label: 'Plugin Marketplace', icon: Puzzle },
        { id: 'appCenter', label: 'App & Mobile Center', icon: Smartphone, badge: 'Android/Win/Mac', badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
        { id: 'settings', label: 'Settings & Config', icon: Sliders },
      ],
    },
  ];

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#222224] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-blue-500/40 shadow-[0_0_14px_rgba(14,165,233,0.35)] bg-black">
            <img src="/icon.png" alt="xTerminal Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">xTerminal</span>
              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] rounded border border-emerald-500/20 uppercase tracking-widest font-mono font-bold">
                PRO
              </span>
            </div>
            <div className="text-[11px] text-gray-400 font-mono">DevOps Workstation</div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              onOpenAiAssistant();
              if (isMobile) onCloseMobile?.();
            }}
            title="AI Assistant Copilot"
            className="p-1.5 rounded-md text-gray-400 hover:text-emerald-400 hover:bg-[#1C1C1E] transition-colors"
          >
            <Bot className="w-4 h-4" />
          </button>
          {isMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-[#1C1C1E]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons: Quick Connect & Search */}
      <div className="p-3 space-y-2 border-b border-[#222224]">
        <button
          onClick={() => {
            onOpenQuickConnect();
            if (isMobile) onCloseMobile?.();
          }}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-xs transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Connection</span>
        </button>

        <button
          onClick={() => {
            onOpenCommandPalette();
            if (isMobile) onCloseMobile?.();
          }}
          className="w-full flex items-center justify-between py-1.5 px-3 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-400 hover:text-white text-xs border border-[#222224] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-gray-500" />
            <span>Search / Command...</span>
          </div>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#111112] text-gray-400 border border-[#222224]">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3 custom-scrollbar">
        {sections.map((sec) => (
          <div key={sec.category} className="space-y-0.5">
            <div className="text-[9px] uppercase tracking-[0.2em] text-gray-500 px-3 py-1 font-semibold">
              {sec.category}
            </div>

            {sec.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'multiplayer-chat') {
                      onSelectView('terminal');
                      window.dispatchEvent(new CustomEvent('xterminal:open-chat'));
                      if (isMobile) onCloseMobile?.();
                      return;
                    }
                    onSelectView(item.id);
                    if (isMobile) onCloseMobile?.();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#1C1C1E] text-emerald-400 border border-emerald-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-[#1C1C1E]/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-gray-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-medium shrink-0 ${
                        item.badgeColor || 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Vault & Settings Bar */}
      <div className="p-3 border-t border-[#222224] bg-[#111112] space-y-2">
        {/* Vault Status card */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1C1C1E] border border-[#222224] text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                vaultSettings.isLocked ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            <span className="text-gray-300 font-medium text-[11px]">
              Vault: {vaultSettings.isLocked ? 'Locked' : 'Unlocked'}
            </span>
          </div>
          <button
            onClick={onToggleVaultLock}
            className={`text-[11px] font-medium px-2 py-0.5 rounded transition-colors ${
              vaultSettings.isLocked
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                : 'bg-[#111112] text-gray-400 hover:text-white hover:bg-red-950/40 border border-[#222224]'
            }`}
          >
            {vaultSettings.isLocked ? 'Unlock' : 'Lock'}
          </button>
        </div>

        {/* Settings and Info */}
        <div className="flex items-center justify-between px-1 text-gray-500 text-[11px]">
          <button
            onClick={() => {
              onSelectView('settings');
              if (isMobile) onCloseMobile?.();
            }}
            className="flex items-center gap-1.5 hover:text-gray-300 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Preferences</span>
          </button>
          <span className="font-mono text-[10px]">xTerminal Enterprise</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 bg-[#111112] border-r border-[#222224] flex-col shrink-0 select-none h-full">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Slide-Out Drawer */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[85vw] bg-[#111112] border-r border-[#222224] h-full z-10 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
