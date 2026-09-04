import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Search,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RotateCcw,
  X
} from 'lucide-react';
import { KnownHost } from '../types';

interface KnownHostsViewProps {
  knownHosts: KnownHost[];
  onTrustKey: (hostId: string) => void;
  onDeleteKey: (hostId: string) => void;
}

export const KnownHostsView: React.FC<KnownHostsViewProps> = ({
  knownHosts,
  onTrustKey,
  onDeleteKey,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [reviewingHost, setReviewingHost] = useState<KnownHost | null>(null);

  const handleCopy = (kh: KnownHost) => {
    navigator.clipboard.writeText(kh.fingerprint);
    setCopiedId(kh.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = knownHosts.filter(
    (kh) =>
      kh.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kh.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kh.fingerprint.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0B] text-[#E0E0E0] p-6 space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white tracking-tight">Known Hosts &amp; Fingerprints</h1>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            HOST KEY VERIFIER
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          NexusTerm validates cryptographic host key signatures on every SSH handshake to protect against MITM attacks.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Filter by hostname, IP address, or SHA256 fingerprint..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 placeholder-gray-500 focus:outline-hidden focus:border-emerald-500 font-mono"
        />
      </div>

      {/* Host Keys Table */}
      <div className="flex-1 overflow-y-auto bg-[#111112] border border-[#222224] rounded-xl p-4">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-[#222224] text-gray-500 text-[11px]">
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Host / IP</th>
              <th className="pb-3 font-medium">Algorithm</th>
              <th className="pb-3 font-medium">SHA256 Fingerprint</th>
              <th className="pb-3 font-medium">First / Last Seen</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222224]">
            {filtered.map((kh) => {
              const isMismatch = kh.status === 'mismatch';
              return (
                <tr
                  key={kh.id}
                  className={`transition-colors ${
                    isMismatch ? 'bg-red-950/20 text-red-200' : 'hover:bg-[#1C1C1E] text-gray-300'
                  }`}
                >
                  <td className="py-3">
                    {isMismatch ? (
                      <span className="flex items-center gap-1.5 text-red-400 font-medium">
                        <ShieldAlert className="w-4 h-4" /> Mismatch
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <ShieldCheck className="w-4 h-4" /> Trusted
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="font-semibold text-white font-sans">{kh.hostname}</div>
                    <div className="text-[11px] text-gray-500">{kh.ip}</div>
                  </td>
                  <td className="py-3 text-gray-300 uppercase">{kh.algorithm}</td>
                  <td className="py-3 font-mono text-[11px] text-emerald-400 truncate max-w-xs">
                    {kh.fingerprint}
                  </td>
                  <td className="py-3 text-gray-500 text-[11px]">
                    <div>Seen: {new Date(kh.lastSeen).toLocaleDateString()}</div>
                    <div className="text-gray-600">Added: {new Date(kh.firstSeen).toLocaleDateString()}</div>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleCopy(kh)}
                        className="p-1.5 rounded-md hover:bg-[#1C1C1E] text-gray-400 hover:text-white"
                        title="Copy Fingerprint"
                      >
                        {copiedId === kh.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      {isMismatch && (
                        <button
                          onClick={() => setReviewingHost(kh)}
                          className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-500 text-white font-medium text-[11px] flex items-center gap-1 shadow-xs"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Review Alert</span>
                        </button>
                      )}

                      <button
                        onClick={() => onDeleteKey(kh.id)}
                        className="p-1.5 rounded-md hover:bg-red-950/40 text-gray-400 hover:text-red-400"
                        title="Remove Host Key"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Review Changed Fingerprint Modal */}
      {reviewingHost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-[#111112] border border-red-800/80 rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-950/60 border border-red-700 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">WARNING: SERVER IDENTITY CHANGED</h3>
                <p className="text-xs text-red-300">Host: {reviewingHost.hostname} ({reviewingHost.ip})</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              The cryptographic host key provided by this server does not match the key recorded in your known hosts store.
            </p>

            <div className="space-y-2 p-3 bg-[#0A0A0B] border border-red-900/50 rounded-lg font-mono text-xs">
              <div>
                <span className="text-gray-400 block text-[10px]">Expected Fingerprint (Previously Trusted):</span>
                <span className="text-emerald-400 break-all">{reviewingHost.expectedFingerprint}</span>
              </div>
              <div className="pt-2 border-t border-[#222224]">
                <span className="text-gray-400 block text-[10px]">Received Fingerprint (Current Probe):</span>
                <span className="text-red-400 break-all">{reviewingHost.fingerprint}</span>
              </div>
            </div>

            <div className="p-3 bg-[#1C1C1E] border border-[#222224] rounded-lg text-[11px] text-gray-400 space-y-1">
              <span className="font-semibold text-gray-300 block">Possible Causes:</span>
              <div>• Server operating system reinstalled or SSH daemon regenerated keys</div>
              <div>• Target IP address reassigned to a different instance</div>
              <div>• Possible Man-in-the-Middle (MITM) interception attack</div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setReviewingHost(null)}
                className="px-3.5 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224] text-xs font-medium"
              >
                Cancel &amp; Abort
              </button>
              <button
                onClick={() => {
                  onTrustKey(reviewingHost.id);
                  setReviewingHost(null);
                }}
                className="px-4 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-medium shadow-sm"
              >
                I Confirm &amp; Trust New Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
