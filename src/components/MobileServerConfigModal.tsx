import React, { useState, useEffect } from 'react';
import {
  Server,
  Wifi,
  Check,
  X,
  AlertCircle,
  Smartphone,
  Laptop,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import {
  getStoredBackendUrl,
  setStoredBackendUrl,
  isMobileApp
} from '../lib/networkConfig';

interface MobileServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

export const MobileServerConfigModal: React.FC<MobileServerConfigModalProps> = ({
  isOpen,
  onClose,
  onConnected,
}) => {
  const [serverUrl, setServerUrl] = useState(getStoredBackendUrl() || 'http://192.168.1.38:3000');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const current = getStoredBackendUrl();
    if (current) setServerUrl(current);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!serverUrl.trim()) return;

    let clean = serverUrl.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `http://${clean}`;
    }
    if (clean.endsWith('/')) clean = clean.slice(0, -1);

    setTesting(true);
    setTestResult(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${clean}/api/health`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        setStoredBackendUrl(clean);
        setTestResult({ success: true, message: 'Successfully connected to xTerminal Server!' });
        setTimeout(() => {
          onConnected?.();
          onClose();
        }, 800);
      } else {
        setTestResult({
          success: false,
          message: `Server responded with HTTP ${res.status}. Please check the port.`,
        });
      }
    } catch (err: any) {
      // Even if health probe fails due to CORS or local network check, user can still save
      setStoredBackendUrl(clean);
      setTestResult({
        success: true,
        message: 'Server address saved. Reconnecting terminal bridge...',
      });
      setTimeout(() => {
        onConnected?.();
        onClose();
      }, 900);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 font-sans select-none">
      <div className="w-full max-w-md bg-[#141416] border border-[#26262A] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#222226] bg-[#18181B] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">xTerminal Mobile Bridge</h3>
              <p className="text-[11px] text-gray-400">Connect to your Computer on Wi-Fi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#242428] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleTestAndSave} className="p-5 space-y-4 text-xs">
          {/* Diagnostic Context Note */}
          <div className="p-3 rounded-xl bg-[#1C1C1E] border border-[#26262A] text-gray-300 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <Wifi className="w-3.5 h-3.5" />
              <span>Local Wi-Fi Connection</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Your mobile phone and computer need to be connected to the same Wi-Fi or hotspot.
              Enter your computer's IP address below:
            </p>
          </div>

          {/* Server URL Input */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1 text-[11px]">
              Computer / Server IP Address *
            </label>
            <div className="flex items-center gap-2 bg-[#1C1C1E] border border-[#2A2A2D] rounded-xl px-3 py-2.5 focus-within:border-emerald-500">
              <Laptop className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                required
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://192.168.1.38:3000"
                className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-gray-500 font-mono mt-1 block">
              Default: http://192.168.1.38:3000 (Port 3000)
            </span>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-gray-400 font-medium mb-1 text-[10px] uppercase tracking-wider">
              Quick Suggestions
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setServerUrl('http://192.168.1.38:3000')}
                className="px-2.5 py-1 rounded-lg bg-[#222226] hover:bg-[#2A2A2E] text-gray-300 text-[11px] font-mono transition-colors"
              >
                192.168.1.38:3000 (Your PC Wi-Fi)
              </button>
              <button
                type="button"
                onClick={() => setServerUrl('http://10.0.2.2:3000')}
                className="px-2.5 py-1 rounded-lg bg-[#222226] hover:bg-[#2A2A2E] text-gray-300 text-[11px] font-mono transition-colors"
              >
                10.0.2.2:3000 (Emulator)
              </button>
            </div>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs animate-in fade-in ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span className="text-[11px] leading-tight">{testResult.message}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222226]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#242428] hover:bg-[#2E2E34] text-gray-300 font-medium text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={testing || !serverUrl.trim()}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs shadow-lg flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span>Save & Connect</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
