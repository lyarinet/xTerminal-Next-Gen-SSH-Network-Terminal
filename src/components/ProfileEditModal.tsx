import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Image as ImageIcon,
  Upload,
  Link2,
  Check,
  Sparkles,
  Smile
} from 'lucide-react';
import { PRESET_AVATARS, DEFAULT_AVATAR } from '../constants/avatars';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (name: string, avatar: string) => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [userName, setUserName] = useState(
    () => localStorage.getItem('xterminal_user_name') || 'Mobile User'
  );
  const [selectedAvatar, setSelectedAvatar] = useState(
    () => localStorage.getItem('xterminal_user_avatar') || DEFAULT_AVATAR
  );
  const [activeTab, setActiveTab] = useState<'all' | 'professional' | 'cyberpunk' | 'illustrated' | 'mascot'>('all');
  const [customUrl, setCustomUrl] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const filteredAvatars = activeTab === 'all'
    ? PRESET_AVATARS
    : PRESET_AVATARS.filter((a) => a.category === activeTab);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size < 5MB
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
      setShowCustomInput(false);
    }
  };

  const handleSave = () => {
    const trimmed = userName.trim() || 'Mobile User';
    localStorage.setItem('xterminal_user_name', trimmed);
    localStorage.setItem('xterminal_user_avatar', selectedAvatar);

    window.dispatchEvent(
      new CustomEvent('xterminal:profile-updated', {
        detail: { name: trimmed, avatar: selectedAvatar },
      })
    );

    onSave?.(trimmed, selectedAvatar);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-sans select-none">
      <div className="w-full max-w-lg bg-[#141416] border border-[#26262A] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222226] bg-[#18181B] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Your Display Profile</h3>
              <p className="text-[11px] text-gray-400">Set how your name and avatar appear to others in terminal sessions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#222226] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-800">
          {/* Live Typing Badge Preview */}
          <div className="p-3.5 rounded-xl bg-[#0D0D0E] border border-[#222224] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={selectedAvatar}
                  alt="Avatar Preview"
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shadow-md"
                />
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#141416] rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">{userName.trim() || 'Your Name'}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                    Typing Badge
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>Shows on terminal cursor when you type</span>
                </div>
              </div>
            </div>

            {/* Quick Upload Button */}
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
                title="Upload custom image from phone or PC"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Upload</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCustomInput(!showCustomInput)}
                className="px-2.5 py-1.5 rounded-lg bg-[#1F1F23] hover:bg-[#28282D] text-gray-200 text-xs font-medium border border-[#2C2C32] flex items-center gap-1.5 transition-colors"
                title="Use image URL"
              >
                <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">URL</span>
              </button>
            </div>
          </div>

          {/* Custom URL Input Accordion */}
          {showCustomInput && (
            <form onSubmit={handleApplyCustomUrl} className="flex gap-2">
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="Paste direct image link (https://...)"
                className="flex-1 bg-[#1C1C1E] border border-[#2A2A2D] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded-lg"
              >
                Apply
              </button>
            </form>
          )}

          {/* Display Name Input */}
          <div>
            <label className="block text-gray-300 font-medium mb-1 text-xs">
              Your Display Name *
            </label>
            <div className="flex items-center gap-2 bg-[#1C1C1E] border border-[#2A2A2D] rounded-lg px-3 py-2 focus-within:border-emerald-500">
              <User className="w-4 h-4 text-emerald-400 shrink-0" />
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Asif, Sara, Alex, Developer"
                className="flex-1 bg-transparent text-white font-medium text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Avatar Categories Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-gray-300 font-medium text-xs flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5 text-emerald-400" />
                <span>Choose Profile Picture ({PRESET_AVATARS.length} Available)</span>
              </label>
              <span className="text-[10px] text-gray-400 font-mono">Tap any picture to select</span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-[#0D0D0E] rounded-lg border border-[#222224] overflow-x-auto scrollbar-none mb-3">
              {(
                [
                  { id: 'all', label: 'All Pictures' },
                  { id: 'professional', label: 'Tech & Devs' },
                  { id: 'cyberpunk', label: 'Cyberpunk' },
                  { id: 'illustrated', label: '3D Characters' },
                  { id: 'mascot', label: 'Bots & Mascots' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-emerald-500 text-black font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-[#1C1C1E]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Grid of Avatars */}
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5 max-h-56 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-800">
              {filteredAvatars.map((av) => {
                const isSelected = selectedAvatar === av.url;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setSelectedAvatar(av.url)}
                    className={`relative rounded-xl p-1 flex flex-col items-center gap-1 transition-all group ${
                      isSelected
                        ? 'bg-emerald-500/20 ring-2 ring-emerald-500 scale-105'
                        : 'bg-[#18181B] hover:bg-[#222226] opacity-75 hover:opacity-100 hover:scale-105'
                    }`}
                  >
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-[#2C2C32]">
                      <img
                        src={av.url}
                        alt={av.label}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-emerald-500/40 flex items-center justify-center backdrop-blur-xs">
                          <Check className="w-4 h-4 text-white stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-gray-300 font-sans truncate w-full text-center group-hover:text-white">
                      {av.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#222226] bg-[#18181B] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#222226] hover:bg-[#2C2C32] text-gray-300 hover:text-white text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!userName.trim()}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Save Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};
