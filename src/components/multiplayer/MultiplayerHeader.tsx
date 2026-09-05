import React from 'react';
import {
  Users,
  Share2,
  Keyboard,
  ShieldCheck,
  Radio,
  MessageSquare,
  Sparkles,
  ArrowRightLeft,
  XCircle,
  Clock
} from 'lucide-react';
import { MultiplayerSession, MultiplayerParticipant } from '../../types';

interface MultiplayerHeaderProps {
  session: MultiplayerSession;
  currentUserId: string;
  isHost: boolean;
  isController: boolean;
  onOpenShareModal: () => void;
  onRequestControl: () => void;
  onTakeControl: () => void;
  onReleaseControl: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  unreadChatCount?: number;
  onToggleDemoMode: () => void;
  isDemoActive?: boolean;
}

export const MultiplayerHeader: React.FC<MultiplayerHeaderProps> = ({
  session,
  currentUserId,
  isHost,
  isController,
  onOpenShareModal,
  onRequestControl,
  onTakeControl,
  onReleaseControl,
  onToggleSidebar,
  sidebarOpen,
  unreadChatCount = 0,
  onToggleDemoMode,
  isDemoActive = false,
}) => {
  const activeParticipants = session.participants.filter((p) => p.isOnline);
  const controller = session.participants.find((p) => p.id === session.controllerId) || {
    id: session.hostUserId,
    name: session.hostName || 'Host',
    avatar: session.hostAvatar,
    color: '#10b981',
  };

  const hasPendingRequest = session.pendingRequests?.some((r) => r.userId === currentUserId);

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-[#141416] border-b border-[#222224] text-xs font-sans select-none z-10 overflow-x-auto scrollbar-none gap-2 shrink-0">
      {/* Left: Live Indicator & Participant Stack */}
      <div className="flex items-center gap-3">
        {/* Live Badge */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-[11px] shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Live Session</span>
          <span className="text-[10px] text-emerald-500 font-mono font-normal">
            ({session.id})
          </span>
        </div>

        {/* Participant Stack */}
        <div className="flex items-center -space-x-2 overflow-hidden py-0.5">
          {activeParticipants.map((p) => {
            const isThisController = p.id === session.controllerId;
            return (
              <div
                key={p.id}
                className="relative group cursor-pointer"
                title={`${p.name} (${p.role})${isThisController ? ' - Controller' : ''}`}
              >
                {p.avatar ? (
                  <img
                    src={p.avatar}
                    alt={p.name}
                    className="w-6 h-6 rounded-full object-cover border-2 transition-transform group-hover:scale-110 group-hover:z-10"
                    style={{ borderColor: isThisController ? '#10b981' : p.color || '#4b5563' }}
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-black border-2 transition-transform group-hover:scale-110 group-hover:z-10"
                    style={{
                      backgroundColor: p.color || '#38bdf8',
                      borderColor: isThisController ? '#10b981' : '#334155',
                    }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {isThisController && (
                  <div
                    className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border border-[#141416] flex items-center justify-center text-[7px] text-black font-black"
                    title="Active Controller"
                  >
                    <Keyboard className="w-2 h-2 text-black stroke-[3]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <span className="text-[11px] text-gray-400 font-medium">
          {activeParticipants.length} {activeParticipants.length === 1 ? 'user' : 'users'}
        </span>
      </div>

      {/* Center: Control Status Indicator */}
      <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#1C1C1E] border border-[#2A2A2D] text-gray-300 text-[11px]">
        <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
        <span>Control:</span>
        <div className="flex items-center gap-1.5 font-semibold text-white">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: controller.color || '#10b981' }}
          />
          <span>{isController ? 'You (Active Controller)' : controller.name}</span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Interactive Demo Mode Toggle */}
        <button
          onClick={onToggleDemoMode}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
            isDemoActive
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
              : 'bg-[#1C1C1E] text-gray-400 hover:text-white border-[#2A2A2D] hover:bg-[#252528]'
          }`}
          title="Toggle interactive Stan & Sarah multiplayer simulation"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Demo Playground</span>
        </button>

        {/* Control Management Buttons */}
        {isHost ? (
          // Host controls
          session.controllerId !== currentUserId ? (
            <button
              onClick={onTakeControl}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-[11px] shadow transition-all"
              title="Reclaim terminal keyboard control immediately"
            >
              <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Take Control</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1C1C1E] text-emerald-400 border border-emerald-500/30 text-[11px]">
              <ShieldCheck className="w-3 h-3" />
              <span>Host in Control</span>
            </div>
          )
        ) : (
          // Participant controls
          isController ? (
            <button
              onClick={onReleaseControl}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-medium text-[11px] transition-all"
              title="Pass control back to Host"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Release Control</span>
            </button>
          ) : hasPendingRequest ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1C1C1E] text-amber-400 border border-amber-500/30 text-[11px] font-medium animate-pulse">
              <Clock className="w-3 h-3" />
              <span>Requested...</span>
            </div>
          ) : (
            <button
              onClick={onRequestControl}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-white border border-[#2A2A2D] font-medium text-[11px] transition-all"
              title="Request keyboard control from host"
            >
              <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Request Control</span>
            </button>
          )
        )}

        {/* Share Button */}
        <button
          onClick={onOpenShareModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-medium text-[11px] transition-all"
          title="Invite collaborators to this session"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        {/* Collaboration Sidebar Toggle */}
        <button
          onClick={onToggleSidebar}
          className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-[11px] border transition-all ${
            sidebarOpen
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-[#1C1C1E] text-gray-300 hover:text-white border-[#2A2A2D] hover:bg-[#252528]'
          }`}
          title="Toggle Collaboration Drawer (Chat, Participants, Activity)"
        >
          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Chat & Team</span>
          {unreadChatCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-emerald-500 text-black font-bold text-[9px] animate-bounce">
              {unreadChatCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
