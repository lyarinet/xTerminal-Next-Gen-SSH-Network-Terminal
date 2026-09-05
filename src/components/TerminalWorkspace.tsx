import React, { useState, useEffect, useRef } from 'react';
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
  Maximize2,
  Users,
  Share2,
  Keyboard,
  Sparkles,
  LogIn,
  Smartphone
} from 'lucide-react';
import {
  TerminalTab,
  Host,
  Snippet,
  MultiplayerSession,
  MultiplayerParticipant,
  MultiplayerControlMode,
  MultiplayerAccessMode
} from '../types';
import { analyzeCommandRisk } from '../lib/safetyEngine';
import { XTermPane, TERMINAL_THEMES } from './XTermPane';
import { MultiplayerHeader } from './multiplayer/MultiplayerHeader';
import { MultiplayerCursorBadge } from './multiplayer/MultiplayerCursorBadge';
import { MultiplayerSidebar } from './multiplayer/MultiplayerSidebar';
import { ShareSessionModal } from './multiplayer/ShareSessionModal';
import { JoinSessionModal } from './multiplayer/JoinSessionModal';
import { MultiplayerDemoSimulator } from './multiplayer/MultiplayerDemoSimulator';
import { MobileServerConfigModal } from './MobileServerConfigModal';
import { getBackendWsUrl, getBackendHttpUrl, isMobileApp, getStoredBackendUrl } from '../lib/networkConfig';

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

  // Multiplayer State
  const [multiplayerSessions, setMultiplayerSessions] = useState<Record<string, MultiplayerSession>>({});
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [joinModalOpen, setJoinModalOpen] = useState<boolean>(false);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [mobileConfigOpen, setMobileConfigOpen] = useState<boolean>(false);
  const [initialJoinSessionId, setInitialJoinSessionId] = useState<string>('');
  const [typingBadges, setTypingBadges] = useState<
    Record<string, { name: string; avatar: string; color: string; cursor: { x: number; y: number }; isTyping: boolean }>
  >({});
  const [unreadChatCounts, setUnreadChatCounts] = useState<Record<string, number>>({});
  const [isDemoActive, setIsDemoActive] = useState<Record<string, boolean>>({});

  const typingBadgeTimeoutRef = useRef<Record<string, any>>({});
  const wsSocketsRef = useRef<Record<string, WebSocket>>({});
  const demoSimulatorsRef = useRef<Record<string, MultiplayerDemoSimulator>>({});

  const currentUserId = useRef(
    localStorage.getItem('xterminal_user_id') || `user-${Math.random().toString(36).substring(2, 8)}`
  ).current;
  const currentUserName = useRef(
    localStorage.getItem('xterminal_user_name') || 'Admin'
  ).current;
  const currentUserAvatar = useRef(
    localStorage.getItem('xterminal_user_avatar') ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
  ).current;

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activePane = activeTab?.panes.find((p) => p.id === activeTab.activePaneId) || activeTab?.panes[0];
  const currentHost = activeTab?.host || hosts.find((h) => h.id === activeTab?.hostId);
  const currentSession = multiplayerSessions[activeTabId];

  // Auto-detect invite link param on load (?session=XT-XXXXXX) or mobile app initial server setup
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const inviteCode = params.get('session');
      if (inviteCode) {
        setInitialJoinSessionId(inviteCode);
        setJoinModalOpen(true);
      }
    } catch {}

    if (isMobileApp() && !getStoredBackendUrl()) {
      setMobileConfigOpen(true);
    }
  }, []);

  // Initialize or connect multiplayer WebSocket for a session
  const connectMultiplayerWs = (sessionId: string, tabId: string, role: 'host' | 'participant', passcode?: string) => {
    // Close any previous socket for this tab
    if (wsSocketsRef.current[tabId]) {
      try {
        wsSocketsRef.current[tabId].close();
      } catch {}
      delete wsSocketsRef.current[tabId];
    }

    const wsUrl = getBackendWsUrl('/ws/multiplayer');
    const socket = new WebSocket(wsUrl);
    wsSocketsRef.current[tabId] = socket;

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: 'join',
          sessionId,
          passcode,
          user: {
            id: currentUserId,
            name: currentUserName,
            avatar: currentUserAvatar,
            color: role === 'host' ? '#10b981' : '#38bdf8',
            role,
          },
        })
      );
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (!msg || !msg.type) return;

        if (msg.type === 'session:state') {
          setMultiplayerSessions((prev) => ({
            ...prev,
            [tabId]: msg.session,
          }));
          return;
        }

        if (msg.type === 'participant:joined' || msg.type === 'participant:updated') {
          setMultiplayerSessions((prev) => {
            const sess = prev[tabId];
            if (!sess) return prev;
            const updated = sess.participants.filter((p) => p.id !== msg.participant.id);
            return {
              ...prev,
              [tabId]: {
                ...sess,
                participants: [...updated, msg.participant],
              },
            };
          });
          return;
        }

        if (msg.type === 'participant:left') {
          setMultiplayerSessions((prev) => {
            const sess = prev[tabId];
            if (!sess) return prev;
            return {
              ...prev,
              [tabId]: {
                ...sess,
                participants: sess.participants.map((p) =>
                  p.id === msg.userId ? { ...p, isOnline: false } : p
                ),
              },
            };
          });
          return;
        }

        if (msg.type === 'participants:update') {
          setMultiplayerSessions((prev) => {
            const sess = prev[tabId];
            if (!sess) return prev;
            return {
              ...prev,
              [tabId]: {
                ...sess,
                participants: msg.participants,
              },
            };
          });
          return;
        }

        if (msg.type === 'terminal:output') {
          // Write incoming output to terminal if viewer
          window.dispatchEvent(
            new CustomEvent('xterminal:terminal-write', {
              detail: { data: msg.data },
            })
          );
          return;
        }

        if (msg.type === 'terminal:input') {
          // Host receives remote controller keystrokes and forwards to SSH stream
          window.dispatchEvent(
            new CustomEvent('xterminal:remote-input', {
              detail: { data: msg.data },
            })
          );
          return;
        }

        if (msg.type === 'participant:typing') {
          if (msg.userId !== currentUserId) {
            setTypingBadges((prev) => ({
              ...prev,
              [tabId]: {
                name: msg.name,
                avatar: msg.avatar,
                color: msg.color,
                cursor: msg.cursor,
                isTyping: msg.isTyping,
              },
            }));

            // Auto-hide badge after 2.5s of inactivity
            if (typingBadgeTimeoutRef.current[tabId]) {
              clearTimeout(typingBadgeTimeoutRef.current[tabId]);
            }
            typingBadgeTimeoutRef.current[tabId] = setTimeout(() => {
              setTypingBadges((prev) => ({
                ...prev,
                [tabId]: { ...prev[tabId], isTyping: false },
              }));
            }, 2500);
          }
          return;
        }

        if (msg.type === 'control:requested') {
          setMultiplayerSessions((prev) => {
            const sess = prev[tabId];
            if (!sess) return prev;
            const existing = sess.pendingRequests || [];
            if (existing.some((r) => r.userId === msg.request.userId)) return prev;
            return {
              ...prev,
              [tabId]: {
                ...sess,
                pendingRequests: [...existing, msg.request],
              },
            };
          });
          return;
        }

        if (msg.type === 'session:controller-changed') {
          setMultiplayerSessions((prev) => {
            const sess = prev[tabId];
            if (!sess) return prev;
            return {
              ...prev,
              [tabId]: {
                ...sess,
                controllerId: msg.controllerId,
                pendingRequests: (sess.pendingRequests || []).filter((r) => r.userId !== msg.controllerId),
                participants: sess.participants.map((p) => ({
                  ...p,
                  isController: p.id === msg.controllerId,
                  role: p.id === msg.controllerId ? 'controller' : (p.id === sess.hostUserId ? 'host' : 'participant'),
                })),
              },
            };
          });
          return;
        }

        if (msg.type === 'chat:message') {
          setMultiplayerSessions((prev) => {
            const sess = prev[tabId];
            if (!sess) return prev;
            return {
              ...prev,
              [tabId]: {
                ...sess,
                chatMessages: [...(sess.chatMessages || []), msg.message],
              },
            };
          });
          if (!sidebarOpen) {
            setUnreadChatCounts((prev) => ({
              ...prev,
              [tabId]: (prev[tabId] || 0) + 1,
            }));
          }
          return;
        }

        if (msg.type === 'activity:event') {
          setMultiplayerSessions((prev) => {
            const sess = prev[tabId];
            if (!sess) return prev;
            return {
              ...prev,
              [tabId]: {
                ...sess,
                activityLog: [msg.event, ...(sess.activityLog || [])],
              },
            };
          });
          return;
        }
      } catch (err) {
        console.error('Error handling multiplayer message:', err);
      }
    };
  };

  // Start new multiplayer session for the active tab (Host flow)
  const handleStartMultiplayer = async () => {
    if (currentSession) {
      setShareModalOpen(true);
      return;
    }

    try {
      const res = await fetch(getBackendHttpUrl('/api/multiplayer/sessions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tabId: activeTab.id,
          title: currentHost?.name || activeTab.title,
          hostUserId: currentUserId,
          hostName: currentUserName,
          hostAvatar: currentUserAvatar,
          controlMode: 'one_controller',
          accessMode: 'link_only',
        }),
      });

      const data = await res.json();
      if (data.success && data.session) {
        setMultiplayerSessions((prev) => ({
          ...prev,
          [activeTab.id]: data.session,
        }));
        connectMultiplayerWs(data.session.id, activeTab.id, 'host');
        setShareModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to create multiplayer session:', err);
    }
  };

  // Join existing session via ID or Link (Participant flow)
  const handleJoinSession = async (sessionId: string, userName: string, userAvatar: string, passcode?: string) => {
    // Open a new tab for the joined multiplayer session
    onNewTab();
    setTimeout(() => {
      // Find the newly opened tab
      const newTab = tabs[tabs.length - 1] || activeTab;
      connectMultiplayerWs(sessionId, newTab.id, 'participant', passcode);
      setSidebarOpen(true);
    }, 150);
  };

  // Grant Control to participant
  const handleGrantControl = (targetUserId: string) => {
    const socket = wsSocketsRef.current[activeTabId];
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'control:grant', targetUserId }));
    }

    // Also support local demo simulation
    if (isDemoActive[activeTabId]) {
      setMultiplayerSessions((prev) => {
        const sess = prev[activeTabId];
        if (!sess) return prev;
        return {
          ...prev,
          [activeTabId]: {
            ...sess,
            controllerId: targetUserId,
            pendingRequests: (sess.pendingRequests || []).filter((r) => r.userId !== targetUserId),
            participants: sess.participants.map((p) => ({
              ...p,
              isController: p.id === targetUserId,
              role: p.id === targetUserId ? 'controller' : (p.id === sess.hostUserId ? 'host' : 'participant'),
            })),
          },
        };
      });

      // If granting control to Stan in demo mode, trigger Stan's typing sequence
      if (targetUserId === 'stan-demo' && demoSimulatorsRef.current[activeTabId]) {
        demoSimulatorsRef.current[activeTabId].simulateStanTyping();
      }
    }
  };

  // Deny Control
  const handleDenyControl = (targetUserId: string) => {
    const socket = wsSocketsRef.current[activeTabId];
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'control:deny', targetUserId }));
    }
    setMultiplayerSessions((prev) => {
      const sess = prev[activeTabId];
      if (!sess) return prev;
      return {
        ...prev,
        [activeTabId]: {
          ...sess,
          pendingRequests: (sess.pendingRequests || []).filter((r) => r.userId !== targetUserId),
        },
      };
    });
  };

  // Take Control (Host instant reclaim)
  const handleTakeControl = () => {
    const socket = wsSocketsRef.current[activeTabId];
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'control:take' }));
    }

    if (isDemoActive[activeTabId]) {
      setMultiplayerSessions((prev) => {
        const sess = prev[activeTabId];
        if (!sess) return prev;
        return {
          ...prev,
          [activeTabId]: {
            ...sess,
            controllerId: sess.hostUserId,
            participants: sess.participants.map((p) => ({
              ...p,
              isController: p.id === sess.hostUserId,
              role: p.id === sess.hostUserId ? 'host' : (p.id === 'stan-demo' ? 'participant' : p.role),
            })),
          },
        };
      });
    }
  };

  // Release Control
  const handleReleaseControl = () => {
    const socket = wsSocketsRef.current[activeTabId];
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'control:release' }));
    }
  };

  // Request Control (Participant)
  const handleRequestControl = () => {
    const socket = wsSocketsRef.current[activeTabId];
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'control:request' }));
    }
  };

  // Send Chat Message
  const handleSendChat = (text: string) => {
    const socket = wsSocketsRef.current[activeTabId];
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'chat:message', text }));
    } else if (isDemoActive[activeTabId]) {
      // Local chat echo in demo mode
      const echoMsg = {
        id: `msg-${Date.now()}`,
        senderId: currentUserId,
        senderName: currentUserName,
        senderAvatar: currentUserAvatar,
        senderColor: '#10b981',
        text,
        timestamp: new Date().toISOString(),
      };
      setMultiplayerSessions((prev) => {
        const sess = prev[activeTabId];
        if (!sess) return prev;
        return {
          ...prev,
          [activeTabId]: {
            ...sess,
            chatMessages: [...(sess.chatMessages || []), echoMsg],
          },
        };
      });
    }
  };

  // Toggle Interactive Demo Mode (Section 33 Simulation)
  const handleToggleDemoMode = () => {
    const currentlyActive = Boolean(isDemoActive[activeTabId]);
    if (currentlyActive) {
      // Stop Demo
      demoSimulatorsRef.current[activeTabId]?.stopDemo();
      setIsDemoActive((prev) => ({ ...prev, [activeTabId]: false }));
      setMultiplayerSessions((prev) => {
        const sess = prev[activeTabId];
        if (!sess) return prev;
        return {
          ...prev,
          [activeTabId]: {
            ...sess,
            isDemo: false,
            controllerId: sess.hostUserId,
            participants: sess.participants.filter(
              (p) => p.id !== 'stan-demo' && p.id !== 'sarah-demo'
            ),
          },
        };
      });
    } else {
      // Ensure there is a base session
      let baseSess = currentSession;
      if (!baseSess) {
        baseSess = {
          id: 'XT-DEMO82',
          tabId: activeTabId,
          title: currentHost?.name || activeTab.title,
          hostUserId: currentUserId,
          hostName: currentUserName,
          hostAvatar: currentUserAvatar,
          controllerId: currentUserId,
          controlMode: 'one_controller',
          accessMode: 'link_only',
          status: 'active',
          participants: [
            {
              id: currentUserId,
              name: currentUserName,
              avatar: currentUserAvatar,
              color: '#10b981',
              role: 'host',
              isController: true,
              isTyping: false,
              latencyMs: 12,
              isOnline: true,
              joinedAt: new Date().toISOString(),
            },
          ],
          chatMessages: [],
          activityLog: [],
          createdAt: new Date().toISOString(),
          isDemo: true,
        };
        setMultiplayerSessions((prev) => ({ ...prev, [activeTabId]: baseSess! }));
      }

      setIsDemoActive((prev) => ({ ...prev, [activeTabId]: true }));
      setSidebarOpen(true);

      const sim = new MultiplayerDemoSimulator({
        onUpdateSession: (updater) => {
          setMultiplayerSessions((prev) => {
            const cur = prev[activeTabId] || baseSess!;
            return { ...prev, [activeTabId]: updater(cur) };
          });
        },
        onTerminalWrite: (chunk) => {
          window.dispatchEvent(
            new CustomEvent('xterminal:terminal-write', { detail: { data: chunk } })
          );
        },
        onCursorMove: (cursor, isTyping) => {
          setTypingBadges((prev) => ({
            ...prev,
            [activeTabId]: {
              name: 'Stan',
              avatar:
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
              color: '#38bdf8',
              cursor,
              isTyping,
            },
          }));
        },
      });

      demoSimulatorsRef.current[activeTabId] = sim;
      sim.startDemo(baseSess);
    }
  };

  // Broadcast terminal output when host terminal outputs data
  const handleTerminalOutput = (chunk: string) => {
    const socket = wsSocketsRef.current[activeTabId];
    if (socket && socket.readyState === WebSocket.OPEN && currentSession) {
      if (currentSession.hostUserId === currentUserId) {
        socket.send(JSON.stringify({ type: 'terminal:output', data: chunk }));
      }
    }
  };

  // Broadcast typing presence
  const handleCursorMove = (cursor: { x: number; y: number }, isTyping: boolean) => {
    const socket = wsSocketsRef.current[activeTabId];
    if (socket && socket.readyState === WebSocket.OPEN && currentSession) {
      socket.send(JSON.stringify({ type: 'terminal:typing', cursor, isTyping }));
    }
  };

  const isCurrentHost = currentSession ? currentSession.hostUserId === currentUserId : true;
  const isCurrentController = currentSession
    ? currentSession.controllerId === currentUserId || currentSession.controlMode === 'shared'
    : true;
  const currentTypingBadge = typingBadges[activeTabId];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0B] text-[#E0E0E0] overflow-hidden font-mono select-text relative">
      {/* Tabs Header */}
      <div className="flex items-center justify-between bg-[#111112] border-b border-[#222224] px-2 pt-2 gap-2 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1">
          {tabs.map((tab) => {
            const isSelected = tab.id === activeTabId;
            const tabHost = tab.host || hosts.find((h) => h.id === tab.hostId);
            const tabSession = multiplayerSessions[tab.id];

            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-md text-xs font-medium cursor-pointer transition-all border-t border-x ${
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
                <span className="truncate max-w-[130px] font-sans">
                  {tabHost?.name || tab.title}
                </span>

                {/* Tab Multiplayer Participant Stack (Exact match from reference screenshot media_1788524562035.png) */}
                {tabSession && tabSession.participants.length > 0 && (
                  <div className="flex items-center -space-x-1.5 ml-1 select-none">
                    {tabSession.participants.slice(0, 3).map((p) => (
                      <img
                        key={p.id}
                        src={p.avatar}
                        alt={p.name}
                        className="w-4 h-4 rounded-full border border-[#111112] object-cover"
                        title={`${p.name} (${p.role})`}
                      />
                    ))}
                    {tabSession.participants.length > 3 && (
                      <span className="text-[9px] text-gray-400 pl-1 font-mono">
                        +{tabSession.participants.length - 3}
                      </span>
                    )}
                    <span
                      className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center ml-1 border border-emerald-500/30"
                      title="Remote Control Active"
                    >
                      <Keyboard className="w-2.5 h-2.5 text-emerald-400" />
                    </span>
                  </div>
                )}

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
          {/* Multiplayer Quick Start / Share Button */}
          <button
            onClick={handleStartMultiplayer}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-sans text-xs font-semibold border transition-all ${
              currentSession
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-[#1C1C1E] hover:bg-[#252528] text-gray-200 border-[#222224]'
            }`}
            title="Start or Share Multiplayer Session"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">
              {currentSession ? `Multiplayer (${currentSession.id})` : 'Multiplayer'}
            </span>
          </button>

          {/* Join Session Button */}
          <button
            onClick={() => setJoinModalOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 font-sans text-xs border border-[#222224] transition-colors"
            title="Join an existing collaborative terminal session"
          >
            <LogIn className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Join</span>
          </button>

          {/* Mobile Server Bridge Config Button */}
          <button
            onClick={() => setMobileConfigOpen(true)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md font-sans text-xs border transition-colors ${
              getStoredBackendUrl()
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border-[#222224]'
            }`}
            title="Configure PC / Server IP Address for Android phone on Wi-Fi"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">
              {getStoredBackendUrl() ? 'Bridge Set' : 'Mobile Bridge'}
            </span>
          </button>

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
                      window.dispatchEvent(
                        new CustomEvent('xterminal:exec', {
                          detail: { paneId: activePane?.id, command: cmd },
                        })
                      );
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
                    <div className="text-[11px] text-emerald-400 font-mono truncate mt-0.5">
                      {snip.command}
                    </div>
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

      {/* Multiplayer Header Bar (Visible when active session or demo is enabled) */}
      {currentSession && (
        <MultiplayerHeader
          session={currentSession}
          currentUserId={currentUserId}
          isHost={isCurrentHost}
          isController={isCurrentController}
          onOpenShareModal={() => setShareModalOpen(true)}
          onRequestControl={handleRequestControl}
          onTakeControl={handleTakeControl}
          onReleaseControl={handleReleaseControl}
          onToggleSidebar={() => {
            setSidebarOpen(!sidebarOpen);
            setUnreadChatCounts((prev) => ({ ...prev, [activeTabId]: 0 }));
          }}
          sidebarOpen={sidebarOpen}
          unreadChatCount={unreadChatCounts[activeTabId] || 0}
          onToggleDemoMode={handleToggleDemoMode}
          isDemoActive={Boolean(isDemoActive[activeTabId])}
        />
      )}

      {/* Main Terminal Canvas Area with Split Panes and Multiplayer Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Terminal Panes */}
        <div className="flex-1 overflow-hidden relative">
          {/* Floating Cursor Presence Badge (Exact match from reference screenshot media_1788524516076.png) */}
          {currentSession && currentTypingBadge && currentTypingBadge.isTyping && (
            <MultiplayerCursorBadge
              name={currentTypingBadge.name}
              avatar={currentTypingBadge.avatar}
              color={currentTypingBadge.color}
              cursorPosition={currentTypingBadge.cursor}
              isTyping={currentTypingBadge.isTyping}
            />
          )}

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
                    isMultiplayerActive={Boolean(currentSession)}
                    isController={isCurrentController}
                    onTerminalOutput={handleTerminalOutput}
                    onCursorMove={handleCursorMove}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Multiplayer Collaboration Sidebar (Drawer) */}
        {currentSession && sidebarOpen && (
          <MultiplayerSidebar
            session={currentSession}
            currentUserId={currentUserId}
            isHost={isCurrentHost}
            onClose={() => setSidebarOpen(false)}
            onSendMessage={handleSendChat}
            onGrantControl={handleGrantControl}
            onDenyControl={handleDenyControl}
            onTakeControl={handleTakeControl}
            pendingRequests={currentSession.pendingRequests || []}
          />
        )}
      </div>

      {/* Share Session Modal */}
      {currentSession && (
        <ShareSessionModal
          session={currentSession}
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      )}

      {/* Join Session Modal */}
      <JoinSessionModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        onJoin={handleJoinSession}
        initialSessionId={initialJoinSessionId}
      />

      {/* Mobile Server Bridge Config Modal */}
      <MobileServerConfigModal
        isOpen={mobileConfigOpen}
        onClose={() => setMobileConfigOpen(false)}
      />
    </div>
  );
};
