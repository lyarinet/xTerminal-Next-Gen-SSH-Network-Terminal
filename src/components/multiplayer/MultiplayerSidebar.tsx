import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  MessageSquare,
  History,
  X,
  Send,
  Shield,
  Keyboard,
  UserCheck,
  UserX,
  Wifi,
  Sparkles,
  Check,
  Ban
} from 'lucide-react';
import {
  MultiplayerSession,
  MultiplayerParticipant,
  MultiplayerChatMessage,
  MultiplayerActivityEvent
} from '../../types';

interface MultiplayerSidebarProps {
  session: MultiplayerSession;
  currentUserId: string;
  isHost: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => void;
  onGrantControl: (targetUserId: string) => void;
  onDenyControl: (targetUserId: string) => void;
  onTakeControl: () => void;
  pendingRequests?: { userId: string; userName: string; userAvatar: string; requestedAt: string }[];
}

export const MultiplayerSidebar: React.FC<MultiplayerSidebarProps> = ({
  session,
  currentUserId,
  isHost,
  onClose,
  onSendMessage,
  onGrantControl,
  onDenyControl,
  onTakeControl,
  pendingRequests = [],
}) => {
  const [activeTab, setActiveTab] = useState<'participants' | 'chat' | 'activity'>('chat');
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [session.chatMessages?.length, activeTab]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
  };

  return (
    <div className="w-80 h-full flex flex-col bg-[#111112] border-l border-[#222224] text-[#E0E0E0] select-none font-sans z-20 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#222224] bg-[#141416]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-xs text-white">Multiplayer Collab</span>
          <span className="text-[10px] text-gray-500 font-mono">({session.id})</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#222224] transition-colors"
          title="Close Sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center border-b border-[#222224] bg-[#141416]/50 text-xs">
        <button
          onClick={() => setActiveTab('participants')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'participants'
              ? 'border-emerald-500 text-emerald-400 bg-[#1C1C1E]/50'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Users ({session.participants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'chat'
              ? 'border-emerald-500 text-emerald-400 bg-[#1C1C1E]/50'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'activity'
              ? 'border-emerald-500 text-emerald-400 bg-[#1C1C1E]/50'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit Log</span>
        </button>
      </div>

      {/* Pending Control Requests Banner for Host */}
      {isHost && pendingRequests.length > 0 && (
        <div className="p-2 bg-amber-500/10 border-b border-amber-500/30">
          <div className="text-[11px] font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5" />
            <span>Control Requests ({pendingRequests.length})</span>
          </div>
          {pendingRequests.map((req) => (
            <div
              key={req.userId}
              className="flex items-center justify-between gap-2 p-1.5 rounded bg-[#1C1C1E] border border-amber-500/20 text-xs mb-1"
            >
              <div className="flex items-center gap-2 truncate">
                <img
                  src={req.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={req.userName}
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span className="truncate text-white font-medium">{req.userName}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onGrantControl(req.userId)}
                  className="px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-[10px] flex items-center gap-1"
                  title="Grant Control"
                >
                  <Check className="w-3 h-3" />
                  <span>Allow</span>
                </button>
                <button
                  onClick={() => onDenyControl(req.userId)}
                  className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 font-medium text-[10px] flex items-center gap-1"
                  title="Deny Request"
                >
                  <Ban className="w-3 h-3" />
                  <span>Deny</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 1: Participants List */}
      {activeTab === 'participants' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {session.participants.map((p) => {
            const isController = p.id === session.controllerId;
            const isThisUserHost = p.id === session.hostUserId;
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                  isController
                    ? 'bg-emerald-500/5 border-emerald-500/30 shadow-sm'
                    : 'bg-[#18181B] border-[#2A2A2D]'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="relative">
                    {p.avatar ? (
                      <img
                        src={p.avatar}
                        alt={p.name}
                        className="w-8 h-8 rounded-full object-cover border"
                        style={{ borderColor: p.color || '#38bdf8' }}
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black"
                        style={{ backgroundColor: p.color || '#38bdf8' }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#111112] ${
                        p.isOnline ? 'bg-emerald-500' : 'bg-gray-500'
                      }`}
                    />
                  </div>

                  <div className="flex flex-col truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white truncate">
                        {p.name} {p.id === currentUserId && '(You)'}
                      </span>
                      {isThisUserHost && (
                        <span className="px-1 py-0.2 rounded bg-blue-500/20 text-blue-400 text-[9px] font-semibold border border-blue-500/30">
                          HOST
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                      <span>{p.latencyMs || 18}ms</span>
                      <span>•</span>
                      <span className="capitalize">{p.role}</span>
                    </div>
                  </div>
                </div>

                {/* Controller Badge or Host Action */}
                <div className="flex items-center gap-1">
                  {isController ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold">
                      <Keyboard className="w-3 h-3" />
                      <span>Typing</span>
                    </div>
                  ) : isHost && p.id !== currentUserId ? (
                    <button
                      onClick={() => onGrantControl(p.id)}
                      className="px-2 py-1 rounded bg-[#2A2A2D] hover:bg-emerald-600/30 hover:text-emerald-300 text-gray-300 text-[10px] font-medium transition-colors"
                      title="Grant terminal control to this participant"
                    >
                      Give Control
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Live Chat */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {session.chatMessages?.map((msg) => {
              if (msg.isSystem) {
                return (
                  <div
                    key={msg.id}
                    className="text-center text-[10px] text-gray-400 bg-[#18181B] py-1 px-2 rounded-md border border-[#262629]"
                  >
                    {msg.text}
                  </div>
                );
              }

              const isMe = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 text-xs ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {msg.senderAvatar ? (
                    <img
                      src={msg.senderAvatar}
                      alt={msg.senderName}
                      className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5 border"
                      style={{ borderColor: msg.senderColor || '#38bdf8' }}
                    />
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-black shrink-0 mt-0.5"
                      style={{ backgroundColor: msg.senderColor || '#38bdf8' }}
                    >
                      {msg.senderName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-gray-400">
                      <span className="font-semibold text-gray-300">{msg.senderName}</span>
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div
                      className={`px-3 py-1.5 rounded-xl break-words text-xs ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-tr-none'
                          : 'bg-[#222226] text-gray-200 border border-[#2D2D32] rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendChat} className="p-2 border-t border-[#222224] bg-[#141416]">
            <div className="flex items-center gap-1.5 bg-[#1C1C1E] border border-[#2A2A2D] rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Message teammates..."
                className="flex-1 bg-transparent border-none text-xs text-white placeholder-gray-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-1 rounded text-emerald-400 hover:text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Activity Log */}
      {activeTab === 'activity' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
          {session.activityLog?.map((act) => (
            <div
              key={act.id}
              className="flex items-start gap-2 p-2 rounded-md bg-[#18181B] border border-[#242428] text-gray-300"
            >
              <div className="mt-0.5 text-emerald-400">
                {act.type === 'control_grant' || act.type === 'control_request' ? (
                  <Keyboard className="w-3.5 h-3.5" />
                ) : act.type === 'join' ? (
                  <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-200">{act.description}</p>
                <span className="text-[10px] text-gray-500 font-mono">
                  {new Date(act.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
