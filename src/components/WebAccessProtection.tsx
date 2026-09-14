import React, { useState, useEffect } from 'react';
import { Shield, ShieldOff, Eye, EyeOff, Check, AlertCircle, Loader } from 'lucide-react';

export const WebAccessProtection: React.FC = () => {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password change form
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Load current config on mount
  useEffect(() => {
    fetch('/api/auth/config')
      .then((r) => r.json())
      .then((d) => {
        setEnabled(Boolean(d.enabled));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setSaveMsg({ type, text });
    setTimeout(() => setSaveMsg(null), 3500);
  };

  const handleToggle = async (val: boolean) => {
    setSaving(true);
    try {
      const body: any = { enabled: val };
      // If turning OFF while currently enabled, need currentPassword
      if (!val && enabled && currentPwd) body.currentPassword = currentPwd;
      const r = await fetch('/api/auth/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.success) {
        setEnabled(val);
        showFeedback('success', val ? 'Password protection enabled.' : 'Password protection disabled.');
      } else {
        showFeedback('error', d.error || 'Failed to update setting.');
      }
    } catch {
      showFeedback('error', 'Network error. Please try again.');
    }
    setSaving(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 6) {
      showFeedback('error', 'New password must be at least 6 characters.');
      return;
    }
    if (newPwd !== confirmPwd) {
      showFeedback('error', 'New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch('/api/auth/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPwd, currentPassword: currentPwd }),
      });
      const d = await r.json();
      if (d.success) {
        setCurrentPwd('');
        setNewPwd('');
        setConfirmPwd('');
        showFeedback('success', 'Password changed successfully.');
      } else {
        showFeedback('error', d.error || 'Incorrect current password.');
      }
    } catch {
      showFeedback('error', 'Network error. Please try again.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-xs py-2">
        <Loader className="w-3.5 h-3.5 animate-spin" />
        <span>Loading protection settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Enable / Disable Toggle */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {enabled
              ? <Shield className="w-3.5 h-3.5 text-sky-400" />
              : <ShieldOff className="w-3.5 h-3.5 text-gray-500" />
            }
            <span className={`text-xs font-semibold ${enabled ? 'text-sky-400' : 'text-gray-400'}`}>
              {enabled ? 'Protection Enabled' : 'Protection Disabled'}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            {enabled
              ? 'Anyone accessing the web UI must enter the password first.'
              : 'Web UI is open — anyone on the network can access it without a password.'}
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => handleToggle(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 mt-0.5 ${
            enabled ? 'bg-sky-500' : 'bg-[#2A2A2E]'
          } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Feedback message */}
      {saveMsg && (
        <div className={`flex items-center gap-2 text-[11px] px-3 py-2 rounded-lg border ${
          saveMsg.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {saveMsg.type === 'success'
            ? <Check className="w-3 h-3 flex-shrink-0" />
            : <AlertCircle className="w-3 h-3 flex-shrink-0" />
          }
          {saveMsg.text}
        </div>
      )}

      {/* Password change form — only shown when enabled */}
      {enabled && (
        <form onSubmit={handlePasswordChange} className="space-y-3 pt-2 border-t border-[#1E1F26]">
          <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Change Password</p>

          <div>
            <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-wide font-medium">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3 py-2 pr-9 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 text-xs focus:outline-none focus:border-sky-500"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-wide font-medium">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2 pr-9 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 text-xs focus:outline-none focus:border-sky-500"
                />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-wide font-medium">Confirm Password</label>
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !currentPwd || !newPwd || !confirmPwd}
            className="px-4 py-1.5 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {saving ? <Loader className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Change Password
          </button>
        </form>
      )}

      {/* Default password hint */}
      {!enabled && (
        <div className="text-[10.5px] text-gray-600 leading-relaxed">
          💡 Default password is <span className="font-mono text-gray-500">xTerminal@999</span> — change it after enabling.
        </div>
      )}
    </div>
  );
};
