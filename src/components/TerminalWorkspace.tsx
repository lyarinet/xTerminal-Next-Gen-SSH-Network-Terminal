import React, { useState } from 'react';
import {
  Terminal as TerminalIcon,
  Plus,
  X,
  Columns,
  Rows,
  Trash2,
  Copy,
  Zap,
  Bot,
  Search,
  Server,
  Palette,
  Wifi,
  Activity,
  Maximize2
} from 'lucide-react';
import { TerminalTab, Host, Snippet } from '../types';
import { analyzeCommandRisk } from '../lib/safetyEngine';
import { XTermPane, TERMINAL_THEMES } from './XTermPane';

interface TerminalWorkspaceProps {
  tabs: TerminalTab[];
  activeTabId: string;
  hosts: Host[];
  snippets: Snippet[];
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: (host?: Host) => void;
  onSplitPane: (tabId: string, direction: 'horizontal' | 'vertical') => void;
  onClosePane: (tabId: string, paneId: string) => void;
  onExecuteCommand: (tabId: string, command: string) => void;
  onOpenAiWithContext: (terminalText: string) => void;
}

export const TerminalWorkspace: React.FC<TerminalWorkspaceProps> = ({
  tabs,
  activeTabId,
  hosts,
  snippets,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onSplitPane,
  onClosePane,
  onExecuteCommand,
  onOpenAiWithContext,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<string>('nexus');
  const [keepaliveInterval, setKeepaliveInterval] = useState<number>(30); // 30s
  const [snippetDropdownOpen, setSnippetDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [keepaliveDropdownOpen, setKeepaliveDropdownOpen] = useState(false);
  const [newTabHostSelectorOpen, setNewTabHostSelectorOpen] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activePane = activeTab?.panes.find((p) => p.id === activeTab.activePaneId) || activeTab?.panes[0];
  const currentHost = activeTab?.host || hosts.find((h) => h.id === activeTab?.hostId);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0B] text-[#E0E0E0] overflow-hidden font-mono select-text">
      {/* Tabs Header */}
      <div className="flex items-center justify-between bg-[#111112] border-b border-[#222224] px-2 pt-2 gap-2 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1">
          {tabs.map((tab) => {
            const isSelected = tab.id === activeTabId;
            const tabHost = tab.host || hosts.find((h) => h.id === tab.hostId);
            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-t-md text-xs font-medium cursor-pointer transition-all border-t border-x ${
                  isSelected
                    ? 'bg-[#0A0A0B] text-emerald-400 border-[#222224] font-semibold'
                    : 'bg-[#1C1C1E] text-gray-400 border-transparent hover:bg-[#252528] hover:text-white'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    tab.connectionState === 'connected'
                      ? 'bg-emerald-500'
                      : tab.connectionState === 'connecting'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-red-400'
                  }`}
                />
                <span className="truncate max-w-[140px] font-sans">
                  {tabHost?.name || tab.title}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {tab.latencyMs > 0 ? `${tab.latencyMs}ms` : ''}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="p-0.5 rounded text-gray-500 hover:text-gray-200 hover:bg-[#252528] opacity-60 group-hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* New Tab Button */}
          <div className="relative">
            <button
              onClick={() => setNewTabHostSelectorOpen(!newTabHostSelectorOpen)}
              className="p-1.5 rounded-md hover:bg-[#1C1C1E] text-gray-400 hover:text-white transition-colors"
              title="Open New Terminal Tab"
            >
              <Plus className="w-4 h-4" />
            </button>

            {newTabHostSelectorOpen && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-[#111112] border border-[#222224] rounded-lg shadow-xl py-1 z-30 font-sans text-xs">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Connect to Server
                </div>
                {hosts.map((host) => (
                  <button
                    key={host.id}
                    onClick={() => {
                      onNewTab(host);
                      setNewTabHostSelectorOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#1C1C1E] text-gray-300 hover:text-white"
                  >
                    <div className="flex items-center gap-2">
                      <Server className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{host.name}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">{host.hostname}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 text-gray-400 text-xs pb-1.5">
          {/* Custom Theme Selector */}
          <div className="relative">
            <button
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 font-sans text-xs border border-[#222224] transition-colors"
              title="Change Terminal Color Theme"
            >
              <Palette className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Theme</span>
            </button>

            {themeDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#111112] border border-[#222224] rounded-lg shadow-2xl py-1 z-30 font-sans text-xs">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Select Theme
                </div>
                {Object.entries(TERMINAL_THEMES).map(([key, th]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedTheme(key);
                      setThemeDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#1C1C1E] ${
                      selectedTheme === key ? 'text-emerald-400 font-bold' : 'text-gray-300'
                    }`}
                  >
                    <span>{th.name}</span>
                    <span
                      className="w-3 h-3 rounded-full border border-gray-600"
                      style={{ backgroundColor: th.cursor }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Keepalive Interval Selector */}
          <div className="relative">
            <button
              onClick={() => setKeepaliveDropdownOpen(!keepaliveDropdownOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 font-sans text-xs border border-[#222224] transition-colors"
              title="SSH Keepalive Interval"
            >
              <Wifi className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">{keepaliveInterval}s</span>
            </button>

            {keepaliveDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-[#111112] border border-[#222224] rounded-lg shadow-2xl py-1 z-30 font-sans text-xs">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Keepalive
                </div>
                {[15, 30, 60, 120].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => {
                      setKeepaliveInterval(sec);
                      setKeepaliveDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left hover:bg-[#1C1C1E] ${
                      keepaliveInterval === sec ? 'text-cyan-400 font-bold' : 'text-gray-300'
                    }`}
                  >
                    {sec} seconds
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Snippet Injector */}
          <div className="relative">
            <button
              onClick={() => setSnippetDropdownOpen(!snippetDropdownOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 font-sans text-xs border border-[#222224] transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Snippets</span>
            </button>

            {snippetDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-[#111112] border border-[#222224] rounded-lg shadow-2xl py-1 z-30 font-sans text-xs max-h-72 overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Inject Command Snippet
                </div>
                {snippets.map((snip) => (
                  <button
                    key={snip.id}
                    onClick={() => {
                      let cmd = snip.command;
                      snip.variables.forEach((v) => {
                        cmd = cmd.replace(new RegExp(`{{${v.name}}}`, 'g'), v.defaultValue);
                      });
                      onExecuteCommand(activeTab.id, cmd);
                      window.dispatchEvent(new CustomEvent('xterminal:exec', { detail: { paneId: activePane?.id, command: cmd } }));
                      setSnippetDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[#1C1C1E] text-gray-200 border-b border-[#222224]/60 last:border-none"
                  >
                    <div className="font-medium text-white flex items-center justify-between">
                      <span>{snip.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1C1C1E] text-gray-400 font-mono border border-[#222224]">
                        {snip.riskLevel}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-400 font-mono truncate mt-0.5">{snip.command}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ask AI Copilot */}
          <button
            onClick={() => {
              const bufferText = activePane?.buffer.slice(-30).join('\n') || '';
              onOpenAiWithContext(bufferText);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-emerald-400 border border-emerald-500/20 font-sans text-xs font-bold transition-colors"
            title="Ask AI Copilot to diagnose terminal output"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Copilot</span>
          </button>

          {/* Split Panes */}
          <button
            onClick={() => onSplitPane(activeTab.id, 'horizontal')}
            className="p-1 rounded-md hover:bg-[#1C1C1E] text-gray-400 hover:text-white"
            title="Split Horizontal (Side by Side)"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSplitPane(activeTab.id, 'vertical')}
            className="p-1 rounded-md hover:bg-[#1C1C1E] text-gray-400 hover:text-white"
            title="Split Vertical (Top & Bottom)"
          >
            <Rows className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Main Canvas & Panes with xterm.js (Keep all open tabs mounted & connected) */}
      <div className="flex-1 overflow-hidden relative">
        {tabs.map((tab) => {
          const tabHost = tab.host || hosts.find((h) => h.id === tab.hostId);
          const isSelected = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={`absolute inset-0 overflow-hidden flex ${
                tab.splitDirection === 'horizontal' ? 'flex-row' : 'flex-col'
              }`}
              style={{
                display: isSelected ? 'flex' : 'none',
                visibility: isSelected ? 'visible' : 'hidden',
              }}
            >
              {tab.panes.map((pane) => (
                <XTermPane
                  key={pane.id}
                  paneId={pane.id}
                  host={tabHost}
                  buffer={pane.buffer}
                  themeKey={selectedTheme}
                  keepaliveInterval={keepaliveInterval}
                  onExecuteCommand={(cmd) => onExecuteCommand(tab.id, cmd)}
                  onOpenAiWithContext={onOpenAiWithContext}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
