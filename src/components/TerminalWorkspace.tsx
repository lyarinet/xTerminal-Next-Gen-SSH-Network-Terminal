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
  Smartphone,
  RefreshCw,
  Edit3,
  Layers,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Radio,
  Circle,
  Square,
  Film
} from 'lucide-react';
import {
  TerminalTab,
  Host,
  Snippet,
  MultiplayerSession,
  MultiplayerParticipant,
  MultiplayerControlMode,
  MultiplayerAccessMode,
  TerminalSettings,
  SessionRecording,
  RecordingEvent
} from '../types';
import { analyzeCommandRisk } from '../lib/safetyEngine';
import { XTermPane, TERMINAL_THEMES } from './XTermPane';
import { MultiplayerHeader } from './multiplayer/MultiplayerHeader';
import { MultiplayerCursorBadge } from './multiplayer/MultiplayerCursorBadge';
import { MultiplayerSidebar } from './multiplayer/MultiplayerSidebar';
import { ShareSessionModal } from './multiplayer/ShareSessionModal';
import { JoinSessionModal } from './multiplayer/JoinSessionModal';
import { ProfileEditModal } from './ProfileEditModal';
import { DEFAULT_AVATAR } from '../constants/avatars';
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
  onNewTab: (host?: Host, customTab?: Partial<TerminalTab>) => void;
  onSplitPane: (tabId: string, direction: 'horizontal' | 'vertical') => void;
  onClosePane: (tabId: string, paneId: string) => void;
  onExecuteCommand: (tabId: string, command: string) => void;
  onOpenAiWithContext: (terminalText: string) => void;
  terminalSettings?: TerminalSettings;
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
  terminalSettings,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<string>(terminalSettings?.theme || 'nexus');

  useEffect(() => {
    if (terminalSettings?.theme) {
      setSelectedTheme(terminalSettings.theme);
    }
  }, [terminalSettings?.theme]);

  const handleSelectTheme = (key: string) => {
    setSelectedTheme(key);
    setThemeDropdownOpen(false);
    const updated = { ...(terminalSettings || {}), theme: key };
    try {
      const stored = localStorage.getItem('xterminal_settings');
      const parsed = stored ? JSON.parse(stored) : {};
      localStorage.setItem('xterminal_settings', JSON.stringify({ ...parsed, theme: key }));
    } catch {}
    window.dispatchEvent(new CustomEvent('xterminal:settings-changed', { detail: updated }));
  };

  const [keepaliveInterval, setKeepaliveInterval] = useState<number>(30); // 30s
  const [snippetDropdownOpen, setSnippetDropdownOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [keepaliveDropdownOpen, setKeepaliveDropdownOpen] = useState(false);
  const [newTabHostSelectorOpen, setNewTabHostSelectorOpen] = useState(false);

  // Multiplayer State
  const [multiplayerSessions, setMultiplayerSessions] = useState<Record<string, MultiplayerSession>>({});
  const [discoveredSessions, setDiscoveredSessions] = useState<MultiplayerSession[]>([]);
  const [dismissedSessionIds, setDismissedSessionIds] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [joinModalOpen, setJoinModalOpen] = useState<boolean>(false);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [mobileConfigOpen, setMobileConfigOpen] = useState<boolean>(false);
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [initialJoinSessionId, setInitialJoinSessionId] = useState<string>('');
  const [typingBadges, setTypingBadges] = useState<
    Record<string, { name: string; avatar: string; color: string; cursor: { x: number; y: number }; isTyping: boolean }>
  >({});
  const [unreadChatCounts, setUnreadChatCounts] = useState<Record<string, number>>({});
  const [isDemoActive, setIsDemoActive] = useState<Record<string, boolean>>({});

  const typingBadgeTimeoutRef = useRef<Record<string, any>>({});
  const wsSocketsRef = useRef<Record<string, WebSocket>>({});
  const demoSimulatorsRef = useRef<Record<string, MultiplayerDemoSimulator>>({});

  // Right-click and Touch Context Menu for Open Tabs (Desktop & Mobile)
  const [tabContextMenu, setTabContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    tab: TerminalTab;
  } | null>(null);
  const [renameModalTab, setRenameModalTab] = useState<TerminalTab | null>(null);
  const [renameTitleInput, setRenameTitleInput] = useState('');
  const longPressTimerRef = useRef<any>(null);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [allTabsDropdownOpen, setAllTabsDropdownOpen] = useState<boolean>(false);
  const tabBarRef = useRef<HTMLDivElement>(null);

  const currentUserId = useRef(
    (() => {
      let uid = localStorage.getItem('xterminal_user_id');
      if (!uid) {
        uid = `user-${Math.random().toString(36).substring(2, 8)}`;
        localStorage.setItem('xterminal_user_id', uid);
      }
      return uid;
    })()
  ).current;

  const [currentUserName, setCurrentUserName] = useState<string>(
    () => localStorage.getItem('xterminal_user_name') || 'Admin'
  );
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string>(
    () => localStorage.getItem('xterminal_user_avatar') || DEFAULT_AVATAR
  );
  const currentUserNameRef = useRef(currentUserName);
  currentUserNameRef.current = currentUserName;
  const currentUserAvatarRef = useRef(currentUserAvatar);
  currentUserAvatarRef.current = currentUserAvatar;

  const multiplayerSessionsRef = useRef(multiplayerSessions);
  multiplayerSessionsRef.current = multiplayerSessions;

  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activePane = activeTab?.panes.find((p) => p.id === activeTab.activePaneId) || activeTab?.panes[0];
  const currentHost = activeTab?.host || hosts.find((h) => h.id === activeTab?.hostId);
  const currentSession =
    multiplayerSessions[activeTabId] ||
    Object.values(multiplayerSessions).find((s) => s.status === 'active') ||
    Object.values(multiplayerSessions)[0];

  // Session Recording State
  const [activeRecording, setActiveRecording] = useState<{
    tabId: string;
    startTime: number;
    title: string;
    hostName: string;
    username: string;
    events: RecordingEvent[];
    commandCount: number;
  } | null>(null);
  const activeRecordingRef = useRef<typeof activeRecording>(null);
  activeRecordingRef.current = activeRecording;
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  useEffect(() => {
    if (!activeRecording) {
      setRecordingSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeRecording]);

  const handleStartRecording = () => {
    if (activeRecording) return;
    const tabHost = activeTab?.host || hosts.find((h) => h.id === activeTab?.hostId);
    const rec = {
      tabId: activeTabId,
      startTime: Date.now(),
      title: tabHost?.name || activeTab?.title || 'Terminal Session',
      hostName: tabHost?.hostname || 'localhost',
      username: tabHost?.username || 'user',
      events: [] as RecordingEvent[],
      commandCount: 0,
    };
    setActiveRecording(rec);
  };

  const handleStopRecording = () => {
    const rec = activeRecordingRef.current;
    if (!rec) return;

    const durationSeconds = Math.max(1, Math.ceil((Date.now() - rec.startTime) / 1000));
    const newRecording: SessionRecording = {
      id: `rec-${Date.now()}`,
      title: rec.title,
      hostName: rec.hostName,
      username: rec.username,
      createdAt: new Date().toISOString(),
      durationSeconds,
      commandCount: rec.commandCount,
      events: rec.events,
    };

    try {
      const existingStr = localStorage.getItem('xterminal_session_recordings');
      const existing: SessionRecording[] = existingStr ? JSON.parse(existingStr) : [];
      const updated = [newRecording, ...existing];
      localStorage.setItem('xterminal_session_recordings', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save session recording:', e);
    }

    setActiveRecording(null);

    window.dispatchEvent(
      new CustomEvent('xterminal:open-recorder', {
        detail: { recording: newRecording },
      })
    );
  };

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
  }, []);

  // Auto-discover active multiplayer sessions across LAN/server
  useEffect(() => {
    let isMounted = true;
    const fetchActiveSessions = async () => {
      try {
        const res = await fetch(getBackendHttpUrl('/api/multiplayer/sessions'));
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data?.sessions) {
          setDiscoveredSessions(data.sessions);
        }
      } catch {}
    };

    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 3500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Global chat toggle event listeners for mobile hamburger menu and top header
  useEffect(() => {
    const handleToggleChat = () => setSidebarOpen((prev) => !prev);
    const handleOpenChat = () => setSidebarOpen(true);
    const handleRequestRemoteSnapshot = () => {
      const sendReq = () => {
        Object.values(wsSocketsRef.current).forEach((ws) => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'terminal:request-snapshot' }));
          }
        });
      };
      sendReq();
      setTimeout(sendReq, 400);
      setTimeout(sendReq, 1200);
    };
    const handleProfileUpdated = (e: any) => {
      if (e.detail?.name) {
        setCurrentUserName(e.detail.name);
        currentUserNameRef.current = e.detail.name;
      }
      if (e.detail?.avatar) {
        setCurrentUserAvatar(e.detail.avatar);
        currentUserAvatarRef.current = e.detail.avatar;
      }
      // Broadcast live user update to open sessions
      Object.values(wsSocketsRef.current).forEach((ws) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'user:update',
              name: e.detail?.name || currentUserNameRef.current,
              avatar: e.detail?.avatar || currentUserAvatarRef.current,
            })
          );
        }
      });
    };
    const handleOpenProfile = () => setProfileModalOpen(true);

    window.addEventListener('xterminal:toggle-chat', handleToggleChat);
    window.addEventListener('xterminal:open-chat', handleOpenChat);
    window.addEventListener('xterminal:request-remote-snapshot', handleRequestRemoteSnapshot);
    window.addEventListener('xterminal:profile-updated', handleProfileUpdated);
    window.addEventListener('xterminal:open-profile', handleOpenProfile);
    return () => {
      window.removeEventListener('xterminal:toggle-chat', handleToggleChat);
      window.removeEventListener('xterminal:open-chat', handleOpenChat);
      window.removeEventListener('xterminal:request-remote-snapshot', handleRequestRemoteSnapshot);
      window.removeEventListener('xterminal:profile-updated', handleProfileUpdated);
      window.removeEventListener('xterminal:open-profile', handleOpenProfile);
    };
  }, []);

  // Close tab context menu on window click or Escape key
  useEffect(() => {
    const handleGlobalClick = () => setTabContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTabContextMenu(null);
        setRenameModalTab(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Initialize or connect multiplayer WebSocket for a session
  const connectMultiplayerWs = (
    sessionId: string,
    tabId: string,
    role: 'host' | 'participant',
    passcode?: string,
    userName?: string,
    userAvatar?: string
  ) => {
    // Sync customized name and avatar
    const finalUserName = userName?.trim() || currentUserNameRef.current || (role === 'host' ? 'Host' : 'Participant');
    const finalUserAvatar = userAvatar || currentUserAvatarRef.current;

    if (userName?.trim()) {
      localStorage.setItem('xterminal_user_name', finalUserName);
      currentUserNameRef.current = finalUserName;
      setCurrentUserName(finalUserName);
    }
    if (userAvatar) {
      localStorage.setItem('xterminal_user_avatar', finalUserAvatar);
      currentUserAvatarRef.current = finalUserAvatar;
      setCurrentUserAvatar(finalUserAvatar);
    }

    // Close any previous socket for this tab or existing participant connections
    if (role === 'participant') {
      Object.keys(wsSocketsRef.current).forEach((key) => {
        try {
          wsSocketsRef.current[key].close();
        } catch {}
        delete wsSocketsRef.current[key];
      });
    } else if (wsSocketsRef.current[tabId]) {
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
            name: finalUserName,
            avatar: finalUserAvatar,
            color: role === 'host' ? '#10b981' : '#38bdf8',
            role,
          },
        })
      );
      // Immediately request terminal snapshot if participant
      if (role === 'participant') {
        socket.send(JSON.stringify({ type: 'terminal:request-snapshot' }));
      }
      if (role === 'host') {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('xterminal:request-snapshot', { detail: { tabId } }));
        }, 300);
      }
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (!msg || !msg.type) return;

        if (msg.type === 'error') {
          window.dispatchEvent(
            new CustomEvent('xterminal:terminal-write', {
              detail: {
                tabId,
                data: `\r\n\x1b[31;1m[Multiplayer Error] ${msg.message || 'Session unavailable'}\x1b[0m\r\n\x1b[33mHost computer must be running xTerminal with an active shared session.\x1b[0m\r\n\x1b[90mStart a session on the PC or tap an active session from the top banner.\x1b[0m\r\n`,
              },
            })
          );
          return;
        }

        if (msg.type === 'session:state') {
          setMultiplayerSessions((prev) => ({
            ...prev,
            [tabId]: msg.session,
          }));
          window.dispatchEvent(
            new CustomEvent('xterminal:terminal-write', {
              detail: {
                tabId,
                data: `\r\n\x1b[32;1m✔ Synchronized with Host "${msg.session?.hostName || 'Host'}" [Session: ${msg.session?.id}]\x1b[0m\r\n`,
              },
            })
          );
          if (msg.snapshot) {
            window.dispatchEvent(
              new CustomEvent('xterminal:terminal-write', {
                detail: { data: msg.snapshot, tabId },
              })
            );
          }
          return;
        }

        if (msg.type === 'terminal:request-snapshot') {
          if (role === 'host') {
            window.dispatchEvent(new CustomEvent('xterminal:request-snapshot', { detail: { tabId } }));
          }
          return;
        }

        if (msg.type === 'participant:joined' || msg.type === 'participant:updated') {
          if (role === 'host') {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('xterminal:request-snapshot', { detail: { tabId } }));
            }, 100);
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('xterminal:request-snapshot', { detail: { tabId } }));
            }, 600);
          }
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
              detail: { data: msg.data, tabId },
            })
          );
          return;
        }

        if (msg.type === 'terminal:input') {
          // Host receives remote controller keystrokes and forwards ONLY to the matching session tab
          window.dispatchEvent(
            new CustomEvent('xterminal:remote-input', {
              detail: { data: msg.data, tabId },
            })
          );
          return;
        }

        if (msg.type === 'participant:typing') {
          if (msg.userId !== currentUserId) {
            const badgeData = {
              name: msg.name,
              avatar: msg.avatar,
              color: msg.color,
              cursor: msg.cursor || { x: 0, y: 0 },
              isTyping: Boolean(msg.isTyping),
            };
            const curActive = activeTabIdRef.current;
            setTypingBadges((prev) => ({
              ...prev,
              [tabId]: badgeData,
              [curActive]: badgeData,
            }));

            // Auto-hide badge after 2.5s of inactivity
            if (typingBadgeTimeoutRef.current[tabId]) {
              clearTimeout(typingBadgeTimeoutRef.current[tabId]);
            }
            if (typingBadgeTimeoutRef.current[curActive] && curActive !== tabId) {
              clearTimeout(typingBadgeTimeoutRef.current[curActive]);
            }
            const hideTimeout = setTimeout(() => {
              setTypingBadges((prev) => ({
                ...prev,
                [tabId]: { ...prev[tabId], isTyping: false },
                [curActive]: { ...prev[curActive], isTyping: false },
              }));
            }, 2500);
            typingBadgeTimeoutRef.current[tabId] = hideTimeout;
            typingBadgeTimeoutRef.current[curActive] = hideTimeout;
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

    socket.onerror = (e) => {
      console.warn('Multiplayer WebSocket error:', e);
      if (role === 'participant') {
        window.dispatchEvent(
          new CustomEvent('xterminal:terminal-write', {
            detail: {
              tabId,
              data: `\r\n\x1b[31m[xTerminal] Multiplayer connection error. Ensure PC server is running.\x1b[0m\r\n`,
            },
          })
        );
      }
    };

    socket.onclose = (ev) => {
      console.log(`Multiplayer WebSocket closed (code: ${ev.code}) for tab: ${tabId}`);
      if (role === 'participant') {
        window.dispatchEvent(
          new CustomEvent('xterminal:terminal-write', {
            detail: {
              tabId,
              data: `\r\n\x1b[33m[xTerminal] Disconnected from session (Code ${ev.code}).\x1b[0m\r\n`,
            },
          })
        );
      } else if (role === 'host') {
        // Auto-reconnect host multiplayer WebSocket if server reboots
        setTimeout(() => {
          if (multiplayerSessionsRef.current[tabId]) {
            connectMultiplayerWs(sessionId, tabId, 'host');
          }
        }, 2500);
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
          controlMode: 'shared',
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
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('xterminal:request-snapshot', { detail: { tabId: activeTab.id } }));
        }, 250);
      }
    } catch (err) {
      console.error('Failed to create multiplayer session:', err);
    }
  };

  // Join existing session via ID or Link (Participant flow)
  const handleJoinSession = async (
    sessionId: string,
    userName?: string,
    userAvatar?: string,
    passcode?: string
  ) => {
    const cleanSessionId = sessionId.trim().toUpperCase();
    const finalName = userName?.trim() || currentUserNameRef.current || 'Mobile User';
    const finalAvatar = userAvatar || currentUserAvatarRef.current;

    localStorage.setItem('xterminal_user_name', finalName);
    localStorage.setItem('xterminal_user_avatar', finalAvatar);
    currentUserNameRef.current = finalName;
    currentUserAvatarRef.current = finalAvatar;
    setCurrentUserName(finalName);
    setCurrentUserAvatar(finalAvatar);

    const existingTab = tabs.find(
      (t) => t.multiplayerSessionId === cleanSessionId || t.title.includes(cleanSessionId)
    );
    if (existingTab) {
      onSelectTab(existingTab.id);
      connectMultiplayerWs(cleanSessionId, existingTab.id, 'participant', passcode, finalName, finalAvatar);
      setSidebarOpen(false);
      return;
    }

    const newTabId = `tab-multi-${cleanSessionId.toLowerCase()}-${Date.now()}`;
    onNewTab(undefined, {
      id: newTabId,
      title: `Multiplayer (${cleanSessionId})`,
      isMultiplayerActive: true,
      multiplayerRole: 'participant',
      multiplayerSessionId: cleanSessionId,
    });
    connectMultiplayerWs(cleanSessionId, newTabId, 'participant', passcode, finalName, finalAvatar);
    setSidebarOpen(false); // Do NOT auto-open chat so terminal stays full screen
  };

  // Forward keystrokes from participant terminal to multiplayer WebSocket & record session input
  const handleParticipantInput = (tabId: string, chunk: string) => {
    const rec = activeRecordingRef.current;
    if (rec && rec.tabId === tabId) {
      rec.events.push({
        timeMs: Date.now() - rec.startTime,
        type: 'in',
        data: chunk,
      });
      if (chunk.includes('\r') || chunk.includes('\n')) {
        rec.commandCount++;
      }
    }
    const socket = wsSocketsRef.current[tabId];
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'terminal:input', data: chunk }));
    }
  };

  // Reconnect active tab session (restores SSH / PTY / Multiplayer connection right where it timed out)
  const handleReconnectTab = (tabId: string) => {
    const targetTab = tabs.find((t) => t.id === tabId);
    if (!targetTab) return;

    // Check if this is a multiplayer session tab
    const sess =
      multiplayerSessions[tabId] ||
      Object.values(multiplayerSessions).find((s) => s.tabId === tabId || s.id === tabId);

    if (targetTab.multiplayerSessionId || sess) {
      const sessionId = targetTab.multiplayerSessionId || sess?.id;
      if (sessionId) {
        connectMultiplayerWs(
          sessionId,
          tabId,
          targetTab.multiplayerRole || 'participant',
          undefined,
          currentUserName,
          currentUserAvatar
        );
        window.dispatchEvent(
          new CustomEvent('xterminal:terminal-write', {
            detail: {
              tabId,
              data: `\r\n\x1b[33;1m[Multiplayer] 🔄 Reconnecting to session ${sessionId}...\x1b[0m\r\n`,
            },
          })
        );
        return;
      }
    }

    // Standard SSH host or local PTY station: notify XTermPane to reconnect socket
    window.dispatchEvent(
      new CustomEvent('xterminal:reconnect-tab', {
        detail: { tabId },
      })
    );
  };

  // Duplicate an open terminal tab with identical host configuration
  const handleDuplicateTab = (tab: TerminalTab) => {
    const tabHost = tab.host || hosts.find((h) => h.id === tab.hostId);
    onNewTab(tabHost, {
      title: `${tabHost?.name || tab.title} (Copy)`,
      multiplayerRole: tab.multiplayerRole,
      multiplayerSessionId: tab.multiplayerSessionId,
    });
  };

  // Clear terminal viewport buffer for a tab
  const handleClearTab = (tabId: string) => {
    window.dispatchEvent(
      new CustomEvent('xterminal:terminal-write', {
        detail: {
          tabId,
          data: '\x1b[2J\x1b[H',
        },
      })
    );
  };

  // Start renaming a tab
  const handleStartRename = (tab: TerminalTab) => {
    setRenameModalTab(tab);
    setRenameTitleInput(tab.host?.name || tab.title);
  };

  // Apply tab title change
  const handleApplyRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (renameModalTab && renameTitleInput.trim()) {
      renameModalTab.title = renameTitleInput.trim();
      setRenameModalTab(null);
    }
  };

  // Right-click desktop context menu handler
  const handleTabContextMenu = (e: React.MouseEvent, tab: TerminalTab) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 240);
    const y = Math.min(e.clientY, window.innerHeight - 260);
    setTabContextMenu({ isOpen: true, x, y, tab });
  };

  // Mobile long-press touch handlers
  const handleTabTouchStart = (e: React.TouchEvent, tab: TerminalTab) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      const x = Math.min(touch.clientX, window.innerWidth - 240);
      const y = Math.min(touch.clientY, window.innerHeight - 260);
      setTabContextMenu({ isOpen: true, x, y, tab });
    }, 450);
  };

  const handleTabTouchMove = (e: React.TouchEvent) => {
    if (!longPressTimerRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTabTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Scroll tab bar horizontally
  const handleScrollTabs = (direction: 'left' | 'right') => {
    if (tabBarRef.current) {
      tabBarRef.current.scrollBy({
        left: direction === 'left' ? -200 : 200,
        behavior: 'smooth',
      });
    }
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

  // Broadcast terminal output when host terminal outputs data & record session output
  const handleTerminalOutput = (tabId: string, chunk: string) => {
    if (!chunk) return;
    const rec = activeRecordingRef.current;
    if (rec && rec.tabId === tabId) {
      rec.events.push({
        timeMs: Date.now() - rec.startTime,
        type: 'out',
        data: chunk,
      });
    }
    const sessions = multiplayerSessionsRef.current;
    // CRITICAL: Only broadcast if THIS tab has an active multiplayer session!
    // Prevents Windows PowerShell (tab-local) from leaking output to remote mobile client
    const session =
      sessions[tabId] ||
      Object.values(sessions).find((s) => s.tabId === tabId || s.id === tabId);
    if (!session) return;

    // Send on the open multiplayer WebSocket for THIS session
    const socket =
      wsSocketsRef.current[tabId] ||
      wsSocketsRef.current[session.tabId] ||
      wsSocketsRef.current[session.id];
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'terminal:output', data: chunk }));
    }
  };

  // Broadcast typing presence
  const handleCursorMove = (tabId: string, cursor: { x: number; y: number }, isTyping: boolean) => {
    const sessions = multiplayerSessionsRef.current;
    const session =
      sessions[tabId] ||
      Object.values(sessions).find((s) => s.hostUserId === currentUserId) ||
      Object.values(sessions)[0];

    if (!session) return;

    const socket =
      wsSocketsRef.current[tabId] ||
      wsSocketsRef.current[session.tabId] ||
      Object.values(wsSocketsRef.current).find((ws) => ws.readyState === WebSocket.OPEN);

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'terminal:typing', cursor, isTyping }));
    }
  };

  const isCurrentHost = currentSession ? currentSession.hostUserId === currentUserId : true;
  const isCurrentController = currentSession
    ? currentSession.controllerId === currentUserId || currentSession.controlMode === 'shared'
    : true;
  const currentTypingBadge =
    typingBadges[activeTabId] ||
    Object.values(typingBadges).find((b) => b.isTyping);

  // Discover live sessions on the network not hosted by this client
  const activeUnjoinedSession = discoveredSessions.find(
    (s) =>
      s.hostUserId !== currentUserId &&
      !dismissedSessionIds[s.id] &&
      !tabs.some((t) => t.multiplayerSessionId === s.id)
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0B] text-[#E0E0E0] overflow-hidden font-mono select-text relative">
      {/* Tabs Header */}
      <div className="flex items-center justify-between bg-[#111112] border-b border-[#222224] px-2 pt-2 gap-2 shrink-0 select-none">
        {/* Open Tabs Submenu Dropdown & Scrollable Tab Strip */}
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {/* Tabs Submenu Dropdown Button */}
          <div className="relative shrink-0">
            <button
              onClick={() => setAllTabsDropdownOpen(!allTabsDropdownOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-md text-xs font-semibold border-t border-x transition-all ${
                allTabsDropdownOpen
                  ? 'bg-[#1C1C1E] text-emerald-400 border-[#2B2B30]'
                  : 'bg-[#141416] hover:bg-[#1C1C1E] text-gray-300 hover:text-white border-[#222224]'
              }`}
              title="Open Tabs Submenu (View and switch between all active tabs)"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-sans font-bold">Tabs ({tabs.length})</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${allTabsDropdownOpen ? 'rotate-180 text-emerald-400' : 'text-gray-400'}`} />
            </button>

            {/* Dropdown Menu listing all open tabs */}
            {allTabsDropdownOpen && (
              <div
                className="absolute left-0 top-full mt-1 w-80 bg-[#141416] border border-[#27272A] rounded-xl shadow-2xl py-1.5 z-40 font-sans text-xs animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-2 border-b border-[#222226] flex items-center justify-between text-gray-400">
                  <span className="font-semibold text-[11px] uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-emerald-400" />
                    All Open Tabs ({tabs.length})
                  </span>
                  <button
                    onClick={() => {
                      setNewTabHostSelectorOpen(true);
                      setAllTabsDropdownOpen(false);
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Tab</span>
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto py-1 divide-y divide-[#1C1C1E]/50">
                  {tabs.map((tab) => {
                    const isSelected = tab.id === activeTabId;
                    const tabHost = tab.host || hosts.find((h) => h.id === tab.hostId);
                    return (
                      <div
                        key={tab.id}
                        onClick={() => {
                          onSelectTab(tab.id);
                          setAllTabsDropdownOpen(false);
                        }}
                        className={`px-3 py-2.5 flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-500/15 text-white font-medium border-l-2 border-emerald-400'
                            : 'text-gray-300 hover:bg-[#1E1E22] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              tab.connectionState === 'connected'
                                ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
                                : tab.connectionState === 'connecting'
                                ? 'bg-amber-400 animate-pulse ring-2 ring-amber-400/20'
                                : 'bg-red-400 ring-2 ring-red-400/20'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-sans font-semibold text-xs">
                                {tabHost?.name || tab.title}
                              </span>
                              {isSelected && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/25 text-emerald-400 font-mono font-bold">
                                  CURRENT
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono truncate mt-0.5">
                              {tabHost ? `${tabHost.username}@${tabHost.hostname}:${tabHost.port || (tabHost.connectionType === 'telnet' ? 23 : 22)}` : 'Local Terminal Station'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReconnectTab(tab.id);
                              setAllTabsDropdownOpen(false);
                            }}
                            className="p-1.5 rounded text-gray-400 hover:text-emerald-400 hover:bg-[#252528] transition-colors"
                            title="Reconnect Session"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCloseTab(tab.id);
                              if (tabs.length === 1) setAllTabsDropdownOpen(false);
                            }}
                            className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-[#252528] transition-colors"
                            title="Close Tab"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Left / Right Scroll buttons if tabs overflow */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => handleScrollTabs('left')}
              className="p-1 rounded text-gray-500 hover:text-white hover:bg-[#1C1C1E] transition-colors"
              title="Scroll Tabs Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleScrollTabs('right')}
              className="p-1 rounded text-gray-500 hover:text-white hover:bg-[#1C1C1E] transition-colors"
              title="Scroll Tabs Right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Horizontal Scrollable Tabs Container */}
          <div
            ref={tabBarRef}
            className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1 min-w-0"
          >
            {tabs.map((tab) => {
              const isSelected = tab.id === activeTabId;
              const tabHost = tab.host || hosts.find((h) => h.id === tab.hostId);
              const tabSession = multiplayerSessions[tab.id];

              return (
                <div
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  onContextMenu={(e) => handleTabContextMenu(e, tab)}
                  onTouchStart={(e) => handleTabTouchStart(e, tab)}
                  onTouchMove={handleTabTouchMove}
                  onTouchEnd={handleTabTouchEnd}
                  className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs font-medium cursor-pointer transition-all border-t border-x select-none shrink-0 ${
                    isSelected
                      ? 'bg-[#0A0A0B] text-emerald-400 border-[#222224] font-semibold'
                      : 'bg-[#1C1C1E] text-gray-400 border-transparent hover:bg-[#252528] hover:text-white'
                  }`}
                  title="Right-click (or long press on mobile) for options: Reconnect, Duplicate, Rename, Clear"
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

                  {/* Tab Multiplayer Participant Stack */}
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

                  {/* Reconnect Tab Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReconnectTab(tab.id);
                    }}
                    className="p-1 rounded text-gray-400 hover:text-emerald-400 hover:bg-[#252528] opacity-70 group-hover:opacity-100 transition-colors"
                    title="Reconnect Session (Restore connection)"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>

                  {/* Close Tab Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    className="p-1 rounded text-gray-500 hover:text-gray-200 hover:bg-[#252528] opacity-60 group-hover:opacity-100 transition-colors"
                    title="Close Tab"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {/* New Tab Button */}
            <div className="relative shrink-0">
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
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 text-gray-400 text-xs pb-1.5">
          {/* User Profile Button with Avatar */}
          <button
            onClick={() => setProfileModalOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 hover:text-white font-sans text-xs border border-[#222224] transition-all group"
            title="Edit your Display Name and Profile Picture"
          >
            <img
              src={currentUserAvatar}
              alt={currentUserName}
              className="w-4 h-4 rounded-full object-cover border border-emerald-500/60 shrink-0"
            />
            <span className="font-medium text-white max-w-[80px] truncate hidden sm:inline">
              {currentUserName}
            </span>
          </button>

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
            <span className="hidden lg:inline">
              {currentSession ? `Multiplayer (${currentSession.id})` : 'Multiplayer'}
            </span>
          </button>

          {/* Join Session Button */}
          <button
            onClick={() => setJoinModalOpen(true)}
            className="relative flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 font-sans text-xs border border-[#222224] transition-colors"
            title="Join an existing collaborative terminal session"
          >
            <LogIn className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Join</span>
            {discoveredSessions.some((s) => s.hostUserId !== currentUserId) && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
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
            <span className="hidden xl:inline">
              {getStoredBackendUrl() ? 'Bridge Set' : 'Mobile Bridge'}
            </span>
          </button>

          {/* Terminal Session Recording & Replay Controls */}
          <div className="flex items-center gap-1">
            {activeRecording?.tabId === activeTabId ? (
              <button
                onClick={handleStopRecording}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 font-sans text-xs transition-all animate-pulse"
                title="Stop Recording Session and View Replay"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-ping" />
                <span className="font-mono font-bold">
                  REC {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}
                </span>
                <Square className="w-3 h-3 fill-red-400 ml-0.5" />
              </button>
            ) : (
              <button
                onClick={handleStartRecording}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 font-sans text-xs border border-[#222224] transition-colors group"
                title="Start Recording Terminal Session"
              >
                <Circle className="w-3.5 h-3.5 text-red-500 fill-red-500/30 group-hover:fill-red-500 transition-colors" />
                <span className="hidden xl:inline">Record</span>
              </button>
            )}

            <button
              onClick={() => window.dispatchEvent(new CustomEvent('xterminal:open-recorder', { detail: {} }))}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 font-sans text-xs border border-[#222224] transition-colors"
              title="Open Saved Recordings & Replay Player"
            >
              <Film className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden xl:inline">Replays</span>
            </button>
          </div>

          {/* Custom Theme Selector */}
          <div className="relative">
            <button
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 font-sans text-xs border border-[#222224] transition-colors"
              title="Change Terminal Color Theme"
            >
              <Palette className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xl:inline">
                {TERMINAL_THEMES[selectedTheme]?.name?.split(' ')[0] || 'Theme'}
              </span>
            </button>

            {themeDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-[#111112] border border-[#222224] rounded-lg shadow-2xl py-1 z-30 font-sans text-xs">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Select Theme
                </div>
                {Object.entries(TERMINAL_THEMES)
                  .filter(([key]) => key !== 'solarized')
                  .map(([key, th]) => (
                    <button
                      key={key}
                      onClick={() => handleSelectTheme(key)}
                      className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#1C1C1E] transition-colors ${
                        selectedTheme === key ? 'text-emerald-400 font-bold bg-emerald-500/10' : 'text-gray-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full border border-gray-600 inline-block shrink-0"
                          style={{ backgroundColor: th.background }}
                        />
                        <span>{th.name}</span>
                      </span>
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-gray-600 inline-block shrink-0"
                        style={{ backgroundColor: th.cursor }}
                        title="Cursor Color"
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
              <span className="hidden xl:inline">{keepaliveInterval}s</span>
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
              <span className="hidden xl:inline">Snippets</span>
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
            <span className="hidden xl:inline">AI Copilot</span>
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

      {/* Active Multiplayer Session Discovery Banner (Shows on mobile/desktop when a live server session is detected) */}
      {activeUnjoinedSession && (
        <div className="bg-gradient-to-r from-emerald-950/90 via-[#0e2a22] to-[#141416] border-b border-emerald-500/40 px-3 py-2 flex items-center justify-between gap-2.5 z-20 shrink-0 animate-in fade-in slide-in-from-top-1 shadow-lg select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0 animate-pulse">
              <Radio className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-emerald-400">Live Session Active:</span>
                <span className="text-xs font-mono font-bold text-white bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  {activeUnjoinedSession.id}
                </span>
                <span className="text-xs text-gray-200 font-sans truncate font-medium">
                  {activeUnjoinedSession.title || 'Server Terminal'}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-sans">
                Host: <span className="text-gray-200">{activeUnjoinedSession.hostName || 'Admin'}</span> &bull; {activeUnjoinedSession.participants?.length || 1} online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                handleJoinSession(
                  activeUnjoinedSession.id,
                  currentUserName,
                  currentUserAvatar
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-sans font-bold text-xs rounded-lg shadow-md hover:shadow-emerald-500/25 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Join Session (1-Tap)</span>
            </button>
            <button
              onClick={() =>
                setDismissedSessionIds((prev) => ({ ...prev, [activeUnjoinedSession.id]: true }))
              }
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Multiplayer Header Bar (Visible when active session or demo is enabled) */}
      {currentSession && (
        <MultiplayerHeader
          session={currentSession}
          currentUserId={currentUserId}
          isHost={isCurrentHost}
          isController={isCurrentController}
          typingBadge={currentTypingBadge}
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
                    tabId={tab.id}
                    host={tabHost}
                    buffer={pane.buffer}
                    themeKey={selectedTheme}
                    terminalSettings={terminalSettings}
                    keepaliveInterval={keepaliveInterval}
                    onExecuteCommand={(cmd) => onExecuteCommand(tab.id, cmd)}
                    onOpenAiWithContext={onOpenAiWithContext}
                    isMultiplayerActive={Boolean(multiplayerSessions[tab.id] || tab.isMultiplayerActive || tab.multiplayerRole === 'participant')}
                    isController={isCurrentController}
                    isMultiplayerParticipant={tab.multiplayerRole === 'participant'}
                    typingBadge={currentTypingBadge}
                    onTerminalInput={(chunk) => handleParticipantInput(tab.id, chunk)}
                    onTerminalOutput={(chunk) => handleTerminalOutput(tab.id, chunk)}
                    onCursorMove={(cursor, isTyping) => handleCursorMove(tab.id, cursor, isTyping)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Multiplayer Collaboration Sidebar (Slide-Over Drawer Overlay) */}
      {currentSession && sidebarOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className="w-full max-w-sm h-full bg-[#111112] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
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
          </div>
        </div>
      )}

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
        availableSessions={discoveredSessions.filter((s) => s.hostUserId !== currentUserId)}
      />

      {/* Mobile Server Bridge Config Modal */}
      <MobileServerConfigModal
        isOpen={mobileConfigOpen}
        onClose={() => setMobileConfigOpen(false)}
      />

      {/* User Profile & Avatar Customizer Modal */}
      <ProfileEditModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onSave={(name, avatar) => {
          setCurrentUserName(name);
          setCurrentUserAvatar(avatar);
          currentUserNameRef.current = name;
          currentUserAvatarRef.current = avatar;
        }}
      />

      {/* Tab Context Menu (Desktop Right-Click & Mobile Long-Press) */}
      {tabContextMenu && tabContextMenu.isOpen && (
        <div
          className="fixed z-50 bg-[#141416]/95 backdrop-blur-md border border-[#27272A] rounded-xl shadow-2xl py-1.5 min-w-[220px] font-sans text-xs animate-in fade-in zoom-in-95 duration-100 select-none"
          style={{ top: tabContextMenu.y, left: tabContextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b border-[#222226] flex items-center justify-between text-gray-400">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-gray-400">
              Tab Actions
            </span>
            <span className="text-[10px] text-emerald-400 font-mono truncate max-w-[110px]">
              {tabContextMenu.tab.title}
            </span>
          </div>

          {/* Reconnect Session */}
          <button
            onClick={() => {
              handleReconnectTab(tabContextMenu.tab.id);
              setTabContextMenu(null);
            }}
            className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300 font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <div>
              <div className="font-semibold">Reconnect Session</div>
              <div className="text-[10px] text-gray-400 font-normal">Resume connection after timeout</div>
            </div>
          </button>

          {/* Duplicate Tab */}
          <button
            onClick={() => {
              handleDuplicateTab(tabContextMenu.tab);
              setTabContextMenu(null);
            }}
            className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-300 hover:bg-[#1E1E22] hover:text-white transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-blue-400" />
            <div>
              <div className="font-semibold">Duplicate Tab</div>
              <div className="text-[10px] text-gray-400 font-normal">Open another tab with same host</div>
            </div>
          </button>

          {/* Rename Tab */}
          <button
            onClick={() => {
              handleStartRename(tabContextMenu.tab);
              setTabContextMenu(null);
            }}
            className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-300 hover:bg-[#1E1E22] hover:text-white transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <div>
              <div className="font-semibold">Rename Tab</div>
              <div className="text-[10px] text-gray-400 font-normal">Change tab title</div>
            </div>
          </button>

          {/* Clear Buffer */}
          <button
            onClick={() => {
              handleClearTab(tabContextMenu.tab.id);
              setTabContextMenu(null);
            }}
            className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-300 hover:bg-[#1E1E22] hover:text-white transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-gray-400" />
            <div>
              <div className="font-semibold">Clear Viewport</div>
              <div className="text-[10px] text-gray-400 font-normal">Reset terminal screen buffer</div>
            </div>
          </button>

          <div className="my-1 border-t border-[#222226]" />

          {/* Close Tab */}
          <button
            onClick={() => {
              onCloseTab(tabContextMenu.tab.id);
              setTabContextMenu(null);
            }}
            className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-red-400" />
            <div className="font-semibold">Close Tab</div>
          </button>
        </div>
      )}

      {/* Rename Tab Modal */}
      {renameModalTab && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 font-sans"
          onClick={() => setRenameModalTab(null)}
        >
          <div
            className="w-full max-w-sm bg-[#141416] border border-[#27272A] rounded-2xl shadow-2xl p-5 animate-in fade-in zoom-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-emerald-400" />
              Rename Tab
            </h3>
            <p className="text-[11px] text-gray-400 mb-3">
              Enter a new label for this terminal tab
            </p>
            <form onSubmit={handleApplyRename} className="space-y-3">
              <input
                type="text"
                autoFocus
                value={renameTitleInput}
                onChange={(e) => setRenameTitleInput(e.target.value)}
                placeholder="e.g. Production Web, DB Worker"
                className="w-full bg-[#1C1C1E] border border-[#2B2B30] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRenameModalTab(null)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
