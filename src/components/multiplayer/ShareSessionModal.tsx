import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  Shield,
  Users,
  Lock,
  Globe,
  Radio,
  ExternalLink
} from 'lucide-react';
import { MultiplayerSession, MultiplayerControlMode, MultiplayerAccessMode } from '../../types';

interface ShareSessionModalProps {
  session: MultiplayerSession;
  isOpen: boolean;
  onClose: () => void;
  onUpdateMode?: (controlMode: MultiplayerControlMode, accessMode: MultiplayerAccessMode) => void;
}

export const ShareSessionModal: React.FC<ShareSessionModalProps> = ({
  session,
  isOpen,
  onClose,
  onUpdateMode,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [controlMode, setControlMode] = useState<MultiplayerControlMode>(session.controlMode || 'one_controller');
  const [accessMode, setAccessMode] = useState<MultiplayerAccessMode>(session.accessMode || 'link_only');

  if (!isOpen) return null;

  const joinUrl = `${window.location.origin}${window.location.pathname}?session=${session.id}`;

  const handleCopyId = () => {
    navigator.clipboard.writeText(session.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveMode = () => {
    if (onUpdateMode) {
      onUpdateMode(controlMode, accessMode);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-sans select-none">
      <div className="w-full max-w-md bg-[#141416] border border-[#26262A] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222226] bg-[#18181B]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Share Multiplayer Session</h3>
              <p className="text-[11px] text-gray-400">Collaborate with teammates in real-time</p>
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
        <div className="p-5 space-y-4 text-xs">
          {/* Session ID Box */}
          <div>
            <label className="block text-gray-400 font-medium mb-1 text-[11px]">
              Session ID
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#1C1C1E] border border-[#2A2A2D] rounded-lg px-3 py-2 text-emerald-400 font-mono text-sm tracking-wider font-bold">
                {session.id}
              </div>
              <button
                onClick={handleCopyId}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#2A2A2D] hover:bg-[#343438] text-white font-medium transition-colors"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Shareable Link Box */}
          <div>
            <label className="block text-gray-400 font-medium mb-1 text-[11px]">
              Direct Join Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={joinUrl}
                className="flex-1 bg-[#1C1C1E] border border-[#2A2A2D] rounded-lg px-3 py-2 text-gray-300 font-mono text-[11px] truncate focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-semibold transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Control Mode Selection */}
          <div className="pt-2 border-t border-[#222226]">
            <label className="block text-gray-300 font-semibold mb-2 text-xs">
              Control Policy
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div
                onClick={() => { setControlMode('one_controller'); handleSaveMode(); }}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                  controlMode === 'one_controller'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                    : 'bg-[#1C1C1E] border-[#2A2A2D] text-gray-400 hover:bg-[#242428]'
                }`}
              >
                <div className="font-semibold text-xs text-white mb-0.5">One Controller</div>
                <div className="text-[10px] text-gray-400">One person types at a time (request & grant)</div>
              </div>

              <div
                onClick={() => { setControlMode('host_only'); handleSaveMode(); }}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                  controlMode === 'host_only'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                    : 'bg-[#1C1C1E] border-[#2A2A2D] text-gray-400 hover:bg-[#242428]'
                }`}
              >
                <div className="font-semibold text-xs text-white mb-0.5">Host Only</div>
                <div className="text-[10px] text-gray-400">Only host can type; guests are view-only</div>
              </div>
            </div>
          </div>

          {/* Active Collaborators count */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#18181B] border border-[#26262A] text-gray-400">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Active Collaborators:</span>
            </div>
            <span className="font-semibold text-white">
              {session.participants.length} connected
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-[#222226] bg-[#18181B]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#2A2A2D] hover:bg-[#343438] text-white font-medium text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
