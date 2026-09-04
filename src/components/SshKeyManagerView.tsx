import React, { useState } from 'react';
import {
  Key,
  Plus,
  Copy,
  Check,
  Download,
  Trash2,
  Shield,
  Fingerprint,
  HardDrive,
  CheckCircle2,
  Eye,
  EyeOff,
  Terminal,
  Upload,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { SshKeyItem } from '../types';

export const SshKeyManagerView: React.FC = () => {
  const [keys, setKeys] = useState<SshKeyItem[]>([]);

  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyAlgo, setNewKeyAlgo] = useState<'ed25519' | 'rsa-4096' | 'ecdsa-p384'>('ed25519');
  const [newKeyComment, setNewKeyComment] = useState('user@xterminalx');
  const [newKeyPassphrase, setNewKeyPassphrase] = useState('');

  const selectedKey = keys.find((k) => k.id === selectedKeyId) || keys[0];

  const handleCopyPublicKey = (keyText: string, id: string) => {
    navigator.clipboard.writeText(keyText);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleGenerateKey = () => {
    if (!newKeyName.trim()) return;

    const newId = `key-${Date.now()}`;
    const randomHex = Math.random().toString(16).substring(2, 10);
    const keyFingerprint = `SHA256:${Math.random().toString(36).substring(2, 15)}...${Math.random().toString(36).substring(2, 15)}`;

    const generated: SshKeyItem = {
      id: newId,
      name: newKeyName.trim(),
      algorithm: newKeyAlgo,
      fingerprint: keyFingerprint,
      randomArt: [
        `+--[${newKeyAlgo.toUpperCase()}]--+`,
        '|      .o*o..     |',
        '|      . =+o .    |',
        '|       o +== .   |',
        '|      . = S + .  |',
        '|       o * + o   |',
        '|        E = + o  |',
        '|         + * o . |',
        '|          o = .  |',
        '|           .     |',
        '+----[SHA256]-----+ ',
      ],
      publicKey: `ssh-${newKeyAlgo.startsWith('rsa') ? 'rsa' : 'ed25519'} AAAAB3NzaC1...${randomHex} ${newKeyComment}`,
      comment: newKeyComment,
      createdAt: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
    };

    setKeys([generated, ...keys]);
    setSelectedKeyId(newId);
    setIsGenerateModalOpen(false);
    setNewKeyName('');
  };

  const handleDeleteKey = (id: string) => {
    if (keys.length <= 1) return;
    const remaining = keys.filter((k) => k.id !== id);
    setKeys(remaining);
    setSelectedKeyId(remaining[0].id);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0B] text-[#E0E0E0] overflow-hidden font-sans">
      {/* Top Header */}
      <div className="p-4 border-b border-[#222224] bg-[#111112] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              SSH Identity & Key Manager
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
                RSA • ED25519 • YUBIKEY
              </span>
            </div>
            <div className="text-xs text-gray-400">
              Manage public/private keypairs, hardware security tokens, OpenSSH randomart, and authorized keys.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Generate New Key</span>
          </button>
        </div>
      </div>

      {/* Main Split: Left Key List, Right Details & Visualizer */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#222224]">
        {/* Left Keys List */}
        <div className="w-full md:w-80 flex flex-col bg-[#0E0E10] shrink-0 overflow-hidden">
          <div className="p-3 border-b border-[#222224] flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Identities ({keys.length})
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">Stronghold Vault</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {keys.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-xs">
                No keys in ring. Click "Generate Key" above to create an SSH key pair.
              </div>
            ) : (
              keys.map((k) => {
              const isSelected = k.id === selectedKeyId;
              return (
                <div
                  key={k.id}
                  onClick={() => setSelectedKeyId(k.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                      : 'bg-[#141416] border-[#222224] text-gray-400 hover:bg-[#1C1C1E] hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 font-medium text-xs text-gray-200 truncate">
                      {k.isHardwareKey ? (
                        <Cpu className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <Key className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      <span className="truncate">{k.name}</span>
                    </div>

                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-[#1C1C1E] text-gray-400 border border-[#222224]">
                      {k.algorithm}
                    </span>
                  </div>

                  <div className="text-[10px] text-gray-500 font-mono truncate">
                    {k.comment}
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
                    <span>Created: {k.createdAt}</span>
                    {k.isHardwareKey && (
                      <span className="text-amber-400 font-medium">YubiKey 5</span>
                    )}
                  </div>
                </div>
              );
            })
            )}
          </div>
        </div>

        {/* Right Details & Randomart */}
        <div className="flex-1 flex flex-col bg-[#0A0A0B] overflow-y-auto p-6 space-y-6">
          {selectedKey ? (
            <>
              {/* Header Title */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#222224]">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedKey.name}
                    {selectedKey.isHardwareKey && (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-normal">
                        FIDO2 HARDWARE TOKEN
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Algorithm: <span className="font-mono text-emerald-400 uppercase">{selectedKey.algorithm}</span> • Comment: <span className="font-mono text-gray-300">{selectedKey.comment}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyPublicKey(selectedKey.publicKey, selectedKey.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#1C1C1E] hover:bg-[#252528] text-gray-200 border border-[#222224] text-xs flex items-center gap-1.5 transition-colors"
                  >
                    {copiedKeyId === selectedKey.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Public Key</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDeleteKey(selectedKey.id)}
                    className="p-1.5 rounded-lg bg-[#1C1C1E] hover:bg-red-950/40 text-gray-400 hover:text-red-400 border border-[#222224] transition-colors"
                    title="Delete Key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Fingerprint & Randomart Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Fingerprint Card */}
                <div className="p-4 rounded-xl bg-[#111112] border border-[#222224] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
                    <Fingerprint className="w-4 h-4 text-emerald-400" />
                    <span>SHA256 Fingerprint</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0A0A0B] border border-[#222224] font-mono text-xs text-emerald-300 break-all select-all">
                    {selectedKey.fingerprint}
                  </div>

                  <div className="text-xs text-gray-400 space-y-1.5">
                    <div className="flex justify-between">
                      <span>Key Storage:</span>
                      <span className="text-gray-200 font-mono">Tauri Stronghold (AES-256-GCM)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Used:</span>
                      <span className="text-gray-200 font-mono">{selectedKey.lastUsed}</span>
                    </div>
                    {selectedKey.yubiKeySlot && (
                      <div className="flex justify-between">
                        <span>Hardware Slot:</span>
                        <span className="text-amber-400 font-mono">{selectedKey.yubiKeySlot}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* OpenSSH Randomart Visualizer */}
                <div className="p-4 rounded-xl bg-[#111112] border border-[#222224] space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span>OpenSSH Key Randomart</span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">ssh-keygen -lv</span>
                  </div>

                  <pre className="p-3 rounded-lg bg-[#0A0A0B] border border-[#222224] font-mono text-xs text-emerald-400/90 leading-tight select-none">
                    {selectedKey.randomArt.join('\n')}
                  </pre>
                </div>
              </div>

              {/* Public Key Card */}
              <div className="p-4 rounded-xl bg-[#111112] border border-[#222224] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-gray-300 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>Public Key (Authorized Keys Format)</span>
                  </div>
                  <span className="text-[11px] text-gray-500">Paste into remote server ~/.ssh/authorized_keys</span>
                </div>

                <div className="p-3 rounded-lg bg-[#0A0A0B] border border-[#222224] font-mono text-xs text-gray-300 break-all select-all leading-relaxed">
                  {selectedKey.publicKey}
                </div>
              </div>

              {/* Quick Remote Deployment Instructions */}
              <div className="p-4 rounded-xl bg-[#141416] border border-[#222224] space-y-2 text-xs">
                <div className="font-semibold text-gray-300">Quick Shell Deployment:</div>
                <pre className="p-2.5 rounded bg-[#0A0A0B] border border-[#222224] font-mono text-emerald-400 overflow-x-auto">
                  ssh-copy-id -i {selectedKey.name}.pub user@your-server-ip
                </pre>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Select an identity key on the left to view details.
            </div>
          )}
        </div>
      </div>

      {/* Generate Key Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#18181A] border border-[#2C2C2E] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-[#2C2C2E] flex items-center justify-between">
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                <span>Generate New SSH Keypair</span>
              </div>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-sans">
              <div>
                <label className="block text-gray-300 mb-1 font-medium">Key Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. id_ed25519_aws_us_east"
                  className="w-full px-3 py-2 rounded-lg bg-[#111112] border border-[#2C2C2E] text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-medium">Cryptographic Algorithm</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ed25519', label: 'ED25519', sub: 'Recommended' },
                    { id: 'rsa-4096', label: 'RSA 4096', sub: 'Legacy' },
                    { id: 'ecdsa-p384', label: 'ECDSA P-384', sub: 'NIST' },
                  ].map((algo) => (
                    <button
                      key={algo.id}
                      onClick={() => setNewKeyAlgo(algo.id as any)}
                      className={`p-2.5 rounded-lg border text-center transition-all ${
                        newKeyAlgo === algo.id
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold'
                          : 'bg-[#111112] border-[#2C2C2E] text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <div className="text-xs">{algo.label}</div>
                      <div className="text-[9px] text-gray-500">{algo.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-medium">Key Comment / Email</label>
                <input
                  type="text"
                  value={newKeyComment}
                  onChange={(e) => setNewKeyComment(e.target.value)}
                  placeholder="user@xterminalx"
                  className="w-full px-3 py-2 rounded-lg bg-[#111112] border border-[#2C2C2E] text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-medium">Passphrase (Optional)</label>
                <input
                  type="password"
                  value={newKeyPassphrase}
                  onChange={(e) => setNewKeyPassphrase(e.target.value)}
                  placeholder="Secure with Stronghold master password"
                  className="w-full px-3 py-2 rounded-lg bg-[#111112] border border-[#2C2C2E] text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#2C2C2E] bg-[#141416] flex justify-end gap-2">
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateKey}
                disabled={!newKeyName.trim()}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-xs active:scale-95 disabled:opacity-40"
              >
                Generate Keypair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
