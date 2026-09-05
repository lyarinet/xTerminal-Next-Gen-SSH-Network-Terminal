import React, { useState, useRef } from 'react';
import {
  X,
  LogIn,
  User,
  Key,
  Terminal,
  Radio,
  Sparkles,
  Upload,
  Link2,
  Check,
  Smile
} from 'lucide-react';
import { MultiplayerSession } from '../../types';
import { PRESET_AVATARS, DEFAULT_AVATAR } from '../../constants/avatars';

interface JoinSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (sessionId: string, userName: string, userAvatar: string, passcode?: string) => void;
  initialSessionId?: string;
  availableSessions?: MultiplayerSession[];
}

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
  const [selectedAvatar, setSelectedAvatar] = useState(
    () => localStorage.getItem('xterminal_user_avatar') || DEFAULT_AVATAR
  );
  const [activeCategory, setActiveCategory] = useState<'all' | 'professional' | 'cyberpunk' | 'illustrated' | 'mascot'>('all');
  const [customUrl, setCustomUrl] = useState('');
  const [showCustomUrl, setShowCustomUrl] = useState(false);
  const [passcode, setPasscode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initialSessionId if it changes
  React.useEffect(() => {
    if (initialSessionId) {
      setSessionId(initialSessionId);
    }
  }, [initialSessionId]);

  if (!isOpen) return null;

  const filteredAvatars = activeCategory === 'all'
    ? PRESET_AVATARS
    : PRESET_AVATARS.filter((a) => a.category === activeCategory);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim()) {
      setSelectedAvatar(customUrl.trim());
      setShowCustomUrl(false);
    }
  };

  const executeJoin = (targetSessionId: string) => {
    const trimmedName = userName.trim() || 'Mobile User';
    localStorage.setItem('xterminal_user_name', trimmedName);
    localStorage.setItem('xterminal_user_avatar', selectedAvatar);

    onJoin(targetSessionId, trimmedName, selectedAvatar, passcode.trim());
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId.trim() || !userName.trim()) return;

    let cleanSessionId = sessionId.trim();
    // If user pasted a full URL like http://localhost:3000/?session=XT-XXXXXX
    if (cleanSessionId.includes('session=')) {
      const match = cleanSessionId.match(/session=([A-Za-z0-9_-]+)/);
      if (match) cleanSessionId = match[1];
    }

    executeJoin(cleanSessionId.toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 font-sans select-none">
      <div className="w-full max-w-lg bg-[#141416] border border-[#26262A] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222226] bg-[#18181B] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <LogIn className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Join Multiplayer Session</h3>
              <p className="text-[11px] text-gray-400">Connect to a live shared terminal workspace</p>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-800">
          {/* Active Sessions on Network */}
          {availableSessions && availableSessions.length > 0 && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                <span>Live Sessions Discovered on Network</span>
              </div>
              <div className="space-y-2">
                {availableSessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSessionId(s.id);
                      executeJoin(s.id);
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
                      className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] rounded-md shadow transition-colors shrink-0 ml-2"
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
            <div className="flex items-center gap-2 bg-[#1C1C1E] border border-[#2A2A2D] rounded-xl px-3 py-2 focus-within:border-emerald-500">
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
              Your Display Name * (Shows on PC screen while typing)
            </label>
            <div className="flex items-center gap-2 bg-[#1C1C1E] border border-[#2A2A2D] rounded-xl px-3 py-2 focus-within:border-emerald-500">
              <User className="w-4 h-4 text-emerald-400 shrink-0" />
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value);
                  localStorage.setItem('xterminal_user_name', e.target.value);
                }}
                placeholder="Enter your name (e.g. Asif, Sara, Dev)"
                className="flex-1 bg-transparent text-white font-semibold text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Selected Avatar Preview & Quick Upload Controls */}
          <div className="p-3 rounded-xl bg-[#0D0D0E] border border-[#222224] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={selectedAvatar}
                  alt="Selected Avatar"
                  className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500 shadow-md"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#141416] rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">{userName.trim() || 'Your Name'}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                    Live Preview
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Shown in typing badge & participant stack
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-lg bg-[#1F1F23] hover:bg-[#28282D] text-gray-200 text-xs font-medium border border-[#2C2C32] flex items-center gap-1.5 transition-colors"
                title="Upload custom image from phone"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Upload</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCustomUrl(!showCustomUrl)}
                className="px-2.5 py-1.5 rounded-lg bg-[#1F1F23] hover:bg-[#28282D] text-gray-200 text-xs font-medium border border-[#2C2C32] flex items-center gap-1.5 transition-colors"
                title="Paste image link"
              >
                <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">URL</span>
              </button>
            </div>
          </div>

          {/* Custom URL Input Accordion */}
          {showCustomUrl && (
            <div className="flex gap-2">
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="Paste direct image link (https://...)"
                className="flex-1 bg-[#1C1C1E] border border-[#2A2A2D] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleApplyCustomUrl}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded-xl"
              >
                Apply
              </button>
            </div>
          )}

          {/* Expanded Avatar Gallery */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-gray-300 font-medium text-[11px] flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5 text-emerald-400" />
                <span>Select Profile Picture ({PRESET_AVATARS.length} Available)</span>
              </label>
              <span className="text-[10px] text-gray-400 font-mono">Tap any image to apply</span>
            </div>

            {/* Categories */}
            <div className="flex items-center gap-1 p-1 bg-[#0D0D0E] rounded-lg border border-[#222224] overflow-x-auto scrollbar-none mb-2.5">
              {(
                [
                  { id: 'all', label: 'All Pictures' },
                  { id: 'professional', label: 'Devs' },
                  { id: 'cyberpunk', label: 'Cyberpunk' },
                  { id: 'illustrated', label: '3D Styles' },
                  { id: 'mascot', label: 'Bots' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors ${
                    activeCategory === tab.id
                      ? 'bg-emerald-500 text-black font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-[#1C1C1E]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Grid of Avatars */}
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-800">
              {filteredAvatars.map((av) => {
                const isSelected = selectedAvatar === av.url;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(av.url);
                      localStorage.setItem('xterminal_user_avatar', av.url);
                    }}
                    className={`relative rounded-xl p-1 flex flex-col items-center gap-1 transition-all group ${
                      isSelected
                        ? 'bg-emerald-500/20 ring-2 ring-emerald-500 scale-105'
                        : 'bg-[#18181B] hover:bg-[#222226] opacity-75 hover:opacity-100 hover:scale-105'
                    }`}
                  >
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-[#2C2C32]">
                      <img
                        src={av.url}
                        alt={av.label}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-emerald-500/40 flex items-center justify-center backdrop-blur-xs">
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <span className="text-[8.5px] text-gray-300 font-sans truncate w-full text-center group-hover:text-white">
                      {av.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Passcode */}
          <div>
            <label className="block text-gray-400 font-medium mb-1 text-[11px]">
              Passcode (if required by host)
            </label>
            <div className="flex items-center gap-2 bg-[#1C1C1E] border border-[#2A2A2D] rounded-xl px-3 py-2 focus-within:border-emerald-500">
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
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#222226] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#2A2A2D] hover:bg-[#343438] text-white font-medium text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!sessionId.trim() || !userName.trim()}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span>Join Session</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
