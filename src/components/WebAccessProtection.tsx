import React, { useState, useEffect } from 'react';
import { Shield, ShieldOff, Check, AlertCircle, Loader, Lock, Key, RefreshCw } from 'lucide-react';

export const WebAccessProtection: React.FC = () => {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
      const r = await fetch('/api/auth/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: val }),
      });
      const d = await r.json();
      if (d.success) {
        setEnabled(val);
        showFeedback(
          'success',
          val
            ? 'System Password Protection enabled.'
            : 'Protection disabled (Open Access).'
        );
      } else {
        showFeedback('error', d.error || 'Failed to update setting.');
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
        <span>Loading system protection status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enable / Disable Toggle Header */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-[#111112] border border-[#222224]">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            {enabled ? (
              <Shield className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldOff className="w-4 h-4 text-gray-500" />
            )}
            <span className={`text-xs font-semibold ${enabled ? 'text-emerald-400' : 'text-gray-400'}`}>
              {enabled ? 'System Password Lock Active' : 'Protection Disabled (Open Network Access)'}
            </span>
          </div>
          <p className="text-[11.5px] text-gray-400 leading-relaxed">
            {enabled
              ? 'Web interface is secured with your host system password. Users connecting from browser must enter your system password to unlock access.'
              : 'Web interface is currently open — any device on your local network can access xTerminal without a password.'}
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => handleToggle(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 mt-1 ${
            enabled ? 'bg-emerald-500' : 'bg-[#2A2A2E]'
          } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title={enabled ? 'Click to disable' : 'Click to enable'}
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
        <div
          className={`flex items-center gap-2 text-[11px] px-3 py-2 rounded-lg border ${
            saveMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          {saveMsg.type === 'success' ? (
            <Check className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          <span>{saveMsg.text}</span>
        </div>
      )}

      {/* Comprehensive Guide: How System Password Protection Works */}
      <div className="p-4 rounded-xl bg-[#0F0F11] border border-[#1F2026] space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
          <Lock className="w-3.5 h-3.5 text-sky-400" />
          <span>System Password Protection Guide</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {/* Card 1: Lock & Unlock */}
          <div className="p-3 rounded-lg bg-[#161618] border border-[#222226] space-y-1.5">
            <div className="flex items-center gap-1.5 text-sky-400 text-xs font-medium">
              <Key className="w-3.5 h-3.5" />
              <span>Lock &amp; Unlock</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              When enabled, connecting browsers are locked. Enter your Windows system login password to unlock access to the workstation.
            </p>
          </div>

          {/* Card 2: Automatic Synchronization */}
          <div className="p-3 rounded-lg bg-[#161618] border border-[#222226] space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Auto-Synchronized</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Whenever you change your Windows system password, it automatically applies here. No separate password management or manual updates needed.
            </p>
          </div>
        </div>

        {/* Note on zero storage */}
        <div className="text-[10.5px] text-gray-500 leading-relaxed pt-1 flex items-start gap-2">
          <span className="text-sky-400 font-bold">ℹ</span>
          <span>
            Passwords are never stored on disk or cached. Authentication is verified in real-time by the Windows Local Security Authority.
          </span>
        </div>
      </div>
    </div>
  );
};
