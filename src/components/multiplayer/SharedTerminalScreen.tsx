import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Users,
  MessageSquare,
  Keyboard,
  ArrowRightLeft,
  Clock,
  Share2,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  LogIn,
  AlertCircle,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { XTermPane } from '../XTermPane';
import { MultiplayerSidebar } from './MultiplayerSidebar';
import {
  MultiplayerSession,
  MultiplayerParticipant,
  TerminalSettings
} from '../../types';
import {
  getBackendHttpUrl,
  getBackendWsUrl
} from '../../lib/networkConfig';
import { DEFAULT_TERMINAL_SETTINGS } from '../../lib/storage';

interface SharedTerminalScreenProps {
  sessionId: string;
}

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';

export const SharedTerminalScreen: React.FC<SharedTerminalScreenProps> = ({
  sessionId: initialSessionId,
}) => {
  const cleanSessionId = initialSessionId.trim().toUpperCase();

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

  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('xterminal_user_name') || 'Collaborator';
  });
  const [userAvatar, setUserAvatar] = useState<string>(() => {
    return localStorage.getItem('xterminal_user_avatar') || DEFAULT_AVATAR;
  });

  const [passcode, setPasscode] = useState('');
  const [session, setSession] = useState<MultiplayerSession | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsPasscode, setNeedsPasscode] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [typingBadge, setTypingBadge] = useState<{
    name: string;
    avatar: string;
    color: string;
    isTyping: boolean;
  } | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const tabId = `shared-session-${cleanSessionId}`;

  // Check if current user has input rights based on controlMode
  const isController = Boolean(
    session && (() => {
      if (session.controlMode === 'read_only') return false;
      if (session.controlMode === 'host_only') return session.hostUserId === currentUserId;
      if (session.controlMode === 'shared') return true;
      // one_controller: only the current designated controller or host
      return session.controllerId === currentUserId || session.hostUserId === currentUserId;
    })()
  );

  const isHost = Boolean(session && session.hostUserId === currentUserId);
  const hasPendingRequest = Boolean(
    session?.pendingRequests?.some((r) => r.userId === currentUserId)
  );

  // 1. Fetch initial session meta from REST
  useEffect(() => {
    let isMounted = true;
    const fetchSessionInfo = async () => {
      try {
        const res = await fetch(
          getBackendHttpUrl(`/api/multiplayer/sessions/${cleanSessionId}`)
        );
        if (!res.ok) {
          if (isMounted) {
            setError(
              `Shared session "${cleanSessionId}" was not found or has ended.`
            );
          }
          return;
        }
        const data = await res.json();
        if (isMounted && data?.session) {
          setSession(data.session);
          if (data.session.accessMode === 'passcode') {
            setNeedsPasscode(true);
            setShowJoinModal(true);
          } else {
            // Auto connect if no passcode required
            connectWs(data.session.accessMode === 'passcode' ? passcode : undefined);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(
            'Unable to connect to xTerminal server. Please check your network connection.'
          );
        }
      }
    };

    fetchSessionInfo();

    return () => {
      isMounted = false;
    };
  }, [cleanSessionId]);

  // 2. Connect WebSocket for live terminal stream & multiplayer interaction
  const connectWs = (code?: string) => {
    setIsConnecting(true);
    setError(null);

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    const trimmedName = userName.trim() || 'Collaborator';
    localStorage.setItem('xterminal_user_name', trimmedName);
    localStorage.setItem('xterminal_user_avatar', userAvatar);

    const wsUrl = getBackendWsUrl('/ws/multiplayer');
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: 'join',
          sessionId: cleanSessionId,
          passcode: code || passcode || undefined,
          user: {
            id: currentUserId,
            name: trimmedName,
            avatar: userAvatar,
            color: '#38bdf8',
            role: 'participant',
          },
        })
      );
      // Immediately request terminal snapshot
      socket.send(JSON.stringify({ type: 'terminal:request-snapshot' }));
      setIsJoined(true);
      setIsConnecting(false);
      setShowJoinModal(false);
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (!msg || !msg.type) return;

        if (msg.type === 'error') {
          setError(msg.message || 'Session error occurred');
          setIsConnecting(false);
          if (
            msg.message?.toLowerCase().includes('passcode') ||
            msg.message?.toLowerCase().includes('password')
          ) {
            setNeedsPasscode(true);
            setShowJoinModal(true);
          }
          window.dispatchEvent(
            new CustomEvent('xterminal:terminal-write', {
              detail: {
                tabId,
                data: `\r\n\x1b[31;1m[Multiplayer Error] ${msg.message}\x1b[0m\r\n`,
              },
            })
          );
          return;
        }

        if (msg.type === 'session:state') {
          setSession(msg.session);
          return;
        }

        if (msg.type === 'terminal:output') {
          window.dispatchEvent(
            new CustomEvent('xterminal:terminal-write', {
              detail: { data: msg.data, tabId },
            })
          );
          return;
        }

        if (msg.type === 'chat:message') {
          setSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              chatMessages: [...(prev.chatMessages || []), msg.message],
            };
          });
          if (!sidebarOpen) {
            setUnreadChatCount((prev) => prev + 1);
          }
          return;
        }

        if (msg.type === 'participant:typing') {
          if (msg.userId !== currentUserId) {
            setTypingBadge({
              name: msg.name,
              avatar: msg.avatar,
              color: msg.color,
              isTyping: Boolean(msg.isTyping),
            });
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
              setTypingBadge(null);
            }, 2500);
          }
          return;
        }

        if (msg.type === 'session:controller-changed' || msg.type === 'control:granted') {
          const newControllerId = msg.controllerId || (msg.type === 'control:granted' ? currentUserId : undefined);
          setSession((prev) => {
            if (!prev) return prev;
            const cid = newControllerId || prev.controllerId;
            return {
              ...prev,
              controllerId: cid,
              pendingRequests: (prev.pendingRequests || []).filter((r) => r.userId !== cid),
              participants: (prev.participants || []).map((p) => ({
                ...p,
                isController: p.id === cid,
                role: p.id === cid ? 'controller' : (p.id === prev.hostUserId ? 'host' : 'participant'),
              })),
            };
          });

          const isMe = newControllerId === currentUserId || msg.type === 'control:granted';
          window.dispatchEvent(
            new CustomEvent('xterminal:terminal-write', {
              detail: {
                tabId,
                data: isMe
                  ? `\r\n\x1b[32;1m✔ Interactive terminal control granted to YOU! You can now type directly.\x1b[0m\r\n`
                  : `\r\n\x1b[36;1mℹ Interactive control transferred to ${msg.controllerName || 'Collaborator'}.\x1b[0m\r\n`,
              },
            })
          );
          return;
        }

        if (msg.type === 'control:revoked') {
          setSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              controllerId: prev.hostUserId,
              participants: (prev.participants || []).map((p) => ({
                ...p,
                isController: p.id === prev.hostUserId,
                role: p.id === prev.hostUserId ? 'host' : 'participant',
              })),
            };
          });
          window.dispatchEvent(
            new CustomEvent('xterminal:terminal-write', {
              detail: {
                tabId,
                data: `\r\n\x1b[33;1mℹ Interactive terminal control was returned to Host.\x1b[0m\r\n`,
              },
            })
          );
          return;
        }

        if (msg.type === 'control:requested') {
          setSession((prev) => {
            if (!prev) return prev;
            const existing = prev.pendingRequests || [];
            if (existing.some((r) => r.userId === msg.request?.userId)) return prev;
            return {
              ...prev,
              pendingRequests: [...existing, msg.request],
            };
          });
          return;
        }

        if (msg.type === 'control:denied') {
          setSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              pendingRequests: (prev.pendingRequests || []).filter((r) => r.userId !== msg.targetUserId),
            };
          });
          if (msg.targetUserId === currentUserId) {
            window.dispatchEvent(
              new CustomEvent('xterminal:terminal-write', {
                detail: {
                  tabId,
                  data: `\r\n\x1b[31;1m✖ Host declined your request for interactive terminal control.\x1b[0m\r\n`,
                },
              })
            );
          }
          return;
        }

        if (msg.type === 'participants:update') {
          setSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              participants: msg.participants,
            };
          });
          return;
        }

        if (msg.type === 'participant:joined') {
          setSession((prev) => {
            if (!prev) return prev;
            const filtered = (prev.participants || []).filter((p) => p.id !== msg.participant.id);
            return {
              ...prev,
              participants: [...filtered, msg.participant],
            };
          });
          return;
        }

        if (msg.type === 'participant:left') {
          setSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              participants: (prev.participants || []).map((p) =>
                p.id === msg.userId ? { ...p, isOnline: false } : p
              ),
            };
          });
          return;
        }

        if (msg.type === 'session:mode-updated') {
          setSession((prev) => {
            if (!prev) return prev;
            return { ...prev, controlMode: msg.controlMode, accessMode: msg.accessMode };
          });
          const modeLabel = msg.controlMode === 'host_only' ? 'Host Only (view-only mode)'
            : msg.controlMode === 'shared' ? 'Shared (everyone can type)'
            : msg.controlMode === 'read_only' ? 'Read Only'
            : 'One Controller';
          window.dispatchEvent(
            new CustomEvent('xterminal:terminal-write', {
              detail: { tabId, data: `\r\n\x1b[36;1mℹ Session mode changed: ${modeLabel}\x1b[0m\r\n` },
            })
          );
          return;
        }

        if (msg.type === 'session:terminated') {
          setError('The host has ended this multiplayer session.');
          window.dispatchEvent(
            new CustomEvent('xterminal:terminal-write', {
              detail: {
                tabId,
                data: `\r\n\x1b[31;1m[Disconnected] Session terminated by Host.\x1b[0m\r\n`,
              },
            })
          );
          return;
        }
      } catch (err) {
        console.error('Failed to parse incoming WebSocket message', err);
      }
    };

    socket.onerror = () => {
      setError('Connection failed. Host may be offline.');
      setIsConnecting(false);
    };

    socket.onclose = () => {
      setIsConnecting(false);
    };
  };

  // Re-request remote snapshot on event
  useEffect(() => {
    const handleSnapshotReq = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'terminal:request-snapshot' }));
      }
    };
    window.addEventListener('xterminal:request-remote-snapshot', handleSnapshotReq);
    return () => {
      window.removeEventListener('xterminal:request-remote-snapshot', handleSnapshotReq);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
      }
    };
  }, []);

  // Actions
  const handleTerminalInput = (chunk: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: 'terminal:input', data: chunk })
      );
    }
  };

  const handleRequestControl = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'control:request',
          user: {
            id: currentUserId,
            name: userName,
            avatar: userAvatar,
          },
        })
      );
    }
  };

  const handleReleaseControl = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'control:release',
          userId: currentUserId,
        })
      );
    }
  };

  const handleSendChat = (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat:send',
          message: {
            id: `msg-${Date.now()}`,
            senderId: currentUserId,
            senderName: userName,
            senderAvatar: userAvatar,
            senderColor: '#38bdf8',
            text,
            timestamp: new Date().toISOString(),
          },
        })
      );
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const activeParticipants = session?.participants?.filter((p) => p.isOnline) || [];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0A0A0B] text-[#E0E0E0] font-sans antialiased select-none">
      {/* Sleek Minimalist Multiplayer Header */}
      <header className="h-10 bg-[#111112] border-b border-[#222224] px-3 flex items-center justify-between shrink-0 select-none z-20 gap-3">
        {/* Left: Live Session Brand & Code */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-xs shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="tracking-tight">Live Terminal</span>
          </div>

          <button
            onClick={handleCopyLink}
            title="Click to copy shared session link"
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1C1C1E] hover:bg-[#26262A] text-gray-200 border border-[#2B2B30] font-mono text-xs transition-colors shrink-0"
          >
            <span className="font-bold text-white">{cleanSessionId}</span>
            {copiedLink ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3 text-gray-400" />
            )}
          </button>

          {session?.title && (
            <span className="hidden md:inline text-xs text-gray-400 truncate max-w-[200px]">
              &bull; {session.title}
            </span>
          )}
        </div>

        {/* Right: Controls, Chat, Fullscreen & Exit */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Active Participants Count & Stack */}
          <div className="hidden sm:flex items-center -space-x-1.5 overflow-hidden py-0.5 mr-1">
            {activeParticipants.slice(0, 4).map((p) => (
              <img
                key={p.id}
                src={p.avatar || DEFAULT_AVATAR}
                alt={p.name}
                title={`${p.name} (${p.role})`}
                className="w-5 h-5 rounded-full object-cover border border-[#111112]"
              />
            ))}
            {activeParticipants.length > 4 && (
              <div className="w-5 h-5 rounded-full bg-[#222226] text-[10px] font-mono flex items-center justify-center text-gray-300 border border-[#111112]">
                +{activeParticipants.length - 4}
              </div>
            )}
          </div>

          {/* Interactive Controller vs Viewer Status */}
          {isController ? (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-medium">
                <Keyboard className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Interactive Control</span>
              </div>
              {!isHost && (
                <button
                  onClick={handleReleaseControl}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-medium transition-all"
                  title="Release keyboard control"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  <span className="hidden sm:inline">Release</span>
                </button>
              )}
            </div>
          ) : hasPendingRequest ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1C1C1E] text-amber-400 border border-amber-500/30 text-[11px] font-medium animate-pulse">
              <Clock className="w-3 h-3" />
              <span>Requested...</span>
            </div>
          ) : (
            <button
              onClick={handleRequestControl}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-200 hover:text-white border border-[#2B2B30] text-[11px] font-medium transition-all"
              title="Request interactive control to type"
            >
              <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Request Control</span>
            </button>
          )}

          {/* Chat Toggle */}
          <button
            onClick={() => {
              setSidebarOpen(!sidebarOpen);
              setUnreadChatCount(0);
            }}
            className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-[11px] border transition-all ${
              sidebarOpen
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-[#1C1C1E] text-gray-300 hover:text-white border-[#2B2B30] hover:bg-[#252528]'
            }`}
            title="Toggle Live Chat & Team"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Chat</span>
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-emerald-500 text-black font-bold text-[9px] animate-bounce">
                {unreadChatCount}
              </span>
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-400 hover:text-white border border-[#2B2B30] transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Terminal'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </header>

      {/* Main Full-Height Terminal Canvas Area */}
      <main className="flex-1 overflow-hidden relative w-full h-full bg-[#0A0A0B]">
        <XTermPane
          paneId="pane-shared-terminal"
          tabId={tabId}
          buffer={[]}
          themeKey="dark"
          terminalSettings={DEFAULT_TERMINAL_SETTINGS}
          keepaliveInterval={15}
          onExecuteCommand={() => {}}
          onOpenAiWithContext={() => {}}
          isMultiplayerActive={true}
          isMultiplayerParticipant={true}
          isController={isController}
          typingBadge={typingBadge}
          onTerminalInput={handleTerminalInput}
          onCursorMove={(_cursor, isTyping) => {
            if (isTyping && wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  type: 'participant:typing',
                  isTyping: true,
                })
              );
            }
          }}
        />

        {/* Join / Passcode Modal Overlay */}
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 font-sans select-none">
            <div className="w-full max-w-sm bg-[#141416] border border-[#26262A] rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <LogIn className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Join Shared Terminal
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">
                    Session: {cleanSessionId}
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-400 font-medium mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g. Collaborator"
                    className="w-full px-3 py-2 rounded-lg bg-[#18181B] border border-[#2A2A2E] text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                {needsPasscode && (
                  <div>
                    <label className="block text-gray-400 font-medium mb-1">
                      Session Passcode
                    </label>
                    <input
                      type="password"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="Enter room passcode"
                      className="w-full px-3 py-2 rounded-lg bg-[#18181B] border border-[#2A2A2E] text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={() => connectWs(passcode)}
                disabled={isConnecting || (needsPasscode && !passcode.trim())}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <span>Connect to Terminal</span>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Slide-over Multiplayer Chat & Team Drawer */}
      {session && sidebarOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className="w-full max-w-sm h-full bg-[#111112] shadow-2xl flex flex-col animate-in slide-in-from-right duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            <MultiplayerSidebar
              session={session}
              currentUserId={currentUserId}
              isHost={isHost}
              onClose={() => setSidebarOpen(false)}
              onSendMessage={handleSendChat}
              onGrantControl={() => {}}
              onDenyControl={() => {}}
              onTakeControl={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
};
