import React, { useState } from 'react';
import {
  X,
  LogIn,
  User,
  Key,
  Terminal,
  Radio,
  Sparkles
} from 'lucide-react';

import { MultiplayerSession } from '../../types';

interface JoinSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (sessionId: string, userName: string, userAvatar: string, passcode?: string) => void;
  initialSessionId?: string;
  availableSessions?: MultiplayerSession[];
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
];

export const JoinSessionModal: React.FC<JoinSessionModalProps> = ({
  isOpen,
  onClose,
  onJoin,
  initialSessionId = '',
  availableSessions = [],
}) => {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [userName, setUserName] = useState(
    () => localStorage.getItem('xterminal_user_name') || 'Mobile User'
  );
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [passcode, setPasscode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId.trim() || !userName.trim()) return;

    let cleanSessionId = sessionId.trim();
    // If user pasted a full URL like http://localhost:3000/?session=XT-XXXXXX
    if (cleanSessionId.includes('session=')) {
      const match = cleanSessionId.match(/session=([A-Za-z0-9_-]+)/);
      if (match) cleanSessionId = match[1];
    }

    onJoin(cleanSessionId.toUpperCase(), userName.trim(), selectedAvatar, passcode.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-sans select-none">
      <div className="w-full max-w-md bg-[#141416] border border-[#26262A] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222226] bg-[#18181B]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <LogIn className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Join Multiplayer Session</h3>
              <p className="text-[11px] text-gray-400">Connect to a live collaborative terminal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#222226] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Active Sessions on Network */}
          {availableSessions && availableSessions.length > 0 && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                <span>Active Live Sessions on Network</span>
              </div>
              <div className="space-y-2">
                {availableSessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSessionId(s.id);
                      const name = userName.trim() || 'Mobile User';
                      onJoin(s.id, name, selectedAvatar, passcode.trim());
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#18181B] border border-emerald-500/30 hover:border-emerald-500 hover:bg-[#202024] cursor-pointer transition-all group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-xs">{s.id}</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-medium">
                          Live
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-300 truncate font-sans">
                        {s.title || 'Terminal Session'} &bull; Host: <span className="text-white">{s.hostName || 'Admin'}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-[11px] rounded-md shadow transition-colors shrink-0 ml-2"
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Session ID / Link Input */}
          <div>
            <label className="block text-gray-300 font-medium mb-1 text-[11px]">
              Session ID or Invite Link *
            </label>
            <div className="flex items-center gap-2 bg-[#1C1C1E] border border-[#2A2A2D] rounded-lg px-3 py-2 focus-within:border-emerald-500">
              <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
              <input
                type="text"
                required
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="e.g. XT-482910"
                className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none uppercase"
              />
            </div>
          </div>

          {/* User Nickname */}
          <div>
            <label className="block text-gray-300 font-medium mb-1 text-[11px]">
              Your Display Name *
            </label>
            <div className="flex items-center gap-2 bg-[#1C1C1E] border border-[#2A2A2D] rounded-lg px-3 py-2 focus-within:border-emerald-500">
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Stan or Sarah"
                className="flex-1 bg-transparent text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Avatar Selection */}
          <div>
            <label className="block text-gray-400 font-medium mb-1.5 text-[11px]">
              Select Avatar
            </label>
            <div className="flex items-center gap-3">
              {PRESET_AVATARS.map((av, idx) => (
                <img
                  key={idx}
                  src={av}
                  alt={`Avatar ${idx + 1}`}
                  onClick={() => setSelectedAvatar(av)}
                  className={`w-9 h-9 rounded-full object-cover cursor-pointer border-2 transition-transform hover:scale-105 ${
                    selectedAvatar === av ? 'border-emerald-500 scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Optional Passcode */}
          <div>
            <label className="block text-gray-400 font-medium mb-1 text-[11px]">
              Passcode (if required)
            </label>
            <div className="flex items-center gap-2 bg-[#1C1C1E] border border-[#2A2A2D] rounded-lg px-3 py-2 focus-within:border-emerald-500">
              <Key className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Optional passcode"
                className="flex-1 bg-transparent text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#222226]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#2A2A2D] hover:bg-[#343438] text-white font-medium text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!sessionId.trim() || !userName.trim()}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Join Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
