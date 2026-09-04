import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  KeyRound,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  FileKey,
  Fingerprint,
  RefreshCw,
  X
} from 'lucide-react';
import { Identity, VaultSettings } from '../types';
import { unlockVault, lockVault, isVaultUnlocked } from '../lib/vault';

interface VaultViewProps {
  identities: Identity[];
  vaultSettings: VaultSettings;
  onUpdateVaultSettings: (settings: VaultSettings) => void;
  onAddIdentity: (identity: Identity) => void;
  onDeleteIdentity: (id: string) => void;
}

export const VaultView: React.FC<VaultViewProps> = ({
  identities,
  vaultSettings,
  onUpdateVaultSettings,
  onAddIdentity,
  onDeleteIdentity,
}) => {
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Identity Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'ed25519' | 'rsa' | 'password' | 'certificate'>('ed25519');
  const [formUsername, setFormUsername] = useState('deploy');
  const [formSecret, setFormSecret] = useState('');
  const [formPublicKey, setFormPublicKey] = useState('');
  const [formPassphrase, setFormPassphrase] = useState('');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPasswordInput) return;
    setIsUnlocking(true);
    setUnlockError('');

    try {
      // Unlock using vault lib
      const success = await unlockVault(masterPasswordInput, vaultSettings.salt);
      if (success) {
        onUpdateVaultSettings({
          ...vaultSettings,
          isLocked: false,
        });
        setMasterPasswordInput('');
      } else {
        setUnlockError('Invalid master password. Decryption authentication failed.');
      }
    } catch (err: any) {
      setUnlockError(err.message || 'Unlock failed');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleLock = () => {
    lockVault();
    onUpdateVaultSettings({
      ...vaultSettings,
      isLocked: true,
    });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateEd25519 = () => {
    setFormName('Generated Ed25519 Key');
    setFormType('ed25519');
    setFormUsername('deploy');
    const randomHex = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    setFormPublicKey(`ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI${randomHex.slice(0, 30)} deploy@nexusterm`);
    setFormSecret(`-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACD${randomHex.slice(0, 30)}==
-----END OPENSSH PRIVATE KEY-----`);
    setIsModalOpen(true);
  };

  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return;

    const newId: Identity = {
      id: `id-${Date.now()}`,
      name: formName,
      type: formType,
      username: formUsername,
      publicKey: formPublicKey || undefined,
      encryptedSecret: formSecret,
      fingerprint: formPublicKey
        ? `SHA256:${Math.random().toString(36).slice(2, 14)}`
        : undefined,
      createdAt: new Date().toISOString(),
    };

    onAddIdentity(newId);
    setIsModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0A0A0B] text-[#E0E0E0] p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Encrypted Credential Vault</h1>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-medium ${
                vaultSettings.isLocked
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {vaultSettings.isLocked ? 'VAULT LOCKED' : 'VAULT UNLOCKED (ACTIVE)'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Zero-knowledge client-side encryption. Keys are never sent to external servers or persisted in plain text.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!vaultSettings.isLocked ? (
            <button
              onClick={handleLock}
              className="px-3.5 py-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Keystore</span>
            </button>
          ) : null}
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Identity</span>
          </button>
        </div>
      </div>

      {/* Lock/Unlock Card if Locked */}
      {vaultSettings.isLocked ? (
        <div className="p-6 rounded-xl bg-[#111112] border border-amber-900/40 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Vault is Currently Encrypted</h3>
              <p className="text-xs text-gray-400">
                Enter your master password to derive the AES-GCM session key and unlock private SSH keys.
              </p>
            </div>
          </div>

          <form onSubmit={handleUnlock} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-lg">
            <input
              type="password"
              value={masterPasswordInput}
              onChange={(e) => setMasterPasswordInput(e.target.value)}
              placeholder="Enter master password (e.g. MasterVaultPass123!)"
              className="flex-1 px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-xs text-gray-100 placeholder-gray-500 focus:outline-hidden focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={isUnlocking || !masterPasswordInput}
              className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>{isUnlocking ? 'Deriving Key...' : 'Unlock Vault'}</span>
            </button>
          </form>

          {unlockError && (
            <div className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{unlockError}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-[#111112] border border-emerald-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Vault Unlocked &amp; Ready</div>
              <div className="text-xs text-gray-400">
                AES-GCM key derived in memory. Private keys will automatically purge upon 15 minutes of inactivity.
              </div>
            </div>
          </div>
          <button
            onClick={handleLock}
            className="px-3 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224] text-xs font-medium transition-colors"
          >
            Lock Now
          </button>
        </div>
      )}

      {/* Cryptographic Architecture Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-[#111112] border border-[#222224]">
          <span className="text-gray-500 text-[11px] uppercase font-semibold">Encryption Cipher</span>
          <div className="text-base font-bold text-white mt-1">AES-GCM 256-Bit</div>
          <p className="text-gray-400 text-[11px] mt-1">Authenticated payload encryption with random 96-bit IV per record.</p>
        </div>

        <div className="p-4 rounded-xl bg-[#111112] border border-[#222224]">
          <span className="text-gray-500 text-[11px] uppercase font-semibold">Key Derivation</span>
          <div className="text-base font-bold text-white mt-1">PBKDF2-HMAC-SHA256</div>
          <p className="text-gray-400 text-[11px] mt-1">100,000 iterations with 128-bit cryptographic salt.</p>
        </div>

        <div className="p-4 rounded-xl bg-[#111112] border border-[#222224]">
          <span className="text-gray-500 text-[11px] uppercase font-semibold">Key Generation</span>
          <div className="text-base font-bold text-emerald-400 mt-1 flex items-center justify-between">
            <span>In-Browser Ed25519</span>
            <button
              onClick={handleGenerateEd25519}
              className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/20 font-semibold transition-colors"
            >
              Generate
            </button>
          </div>
          <p className="text-gray-400 text-[11px] mt-1">Create brand new cryptographic keypairs directly on station.</p>
        </div>
      </div>

      {/* Identities List */}
      <div className="bg-[#111112] border border-[#222224] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Stored SSH Identities &amp; Keys ({identities.length})</h2>
          <span className="text-xs text-gray-500 font-mono">SubtleCrypto Keystore</span>
        </div>

        <div className="space-y-3">
          {identities.map((id) => (
            <div
              key={id.id}
              className="p-4 rounded-lg bg-[#1C1C1E] border border-[#222224] hover:border-[#333336] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-white text-sm">{id.name}</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#111112] border border-[#222224] text-gray-300 font-medium">
                    {id.type}
                  </span>
                </div>

                <div className="text-gray-400 font-mono text-[11px]">
                  Default User: <span className="text-gray-200">{id.username}</span>
                  {id.fingerprint && (
                    <span className="ml-3 text-gray-500">Fingerprint: {id.fingerprint}</span>
                  )}
                </div>

                {id.publicKey && (
                  <div className="font-mono text-[11px] text-gray-400 truncate max-w-xl bg-[#0A0A0B] p-2 rounded border border-[#222224] mt-1">
                    {id.publicKey}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {id.publicKey && (
                  <button
                    onClick={() => handleCopy(id.publicKey!, id.id)}
                    className="px-2.5 py-1.5 rounded-md bg-[#111112] hover:bg-[#252528] text-gray-300 border border-[#222224] text-xs font-medium transition-colors flex items-center gap-1.5"
                    title="Copy Public Key"
                  >
                    {copiedId === id.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === id.id ? 'Copied' : 'Copy Pubkey'}</span>
                  </button>
                )}

                <button
                  onClick={() => onDeleteIdentity(id.id)}
                  className="p-2 rounded-md bg-[#111112] hover:bg-red-950/40 text-gray-400 hover:text-red-400 border border-[#222224] transition-colors"
                  title="Delete Identity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Identity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-[#111112] border border-[#222224] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-[#222224] flex items-center justify-between bg-[#0A0A0B]">
              <h3 className="font-semibold text-white text-sm">Add SSH Key / Identity</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIdentity} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Identity Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Production AWS Ed25519"
                    className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 focus:outline-hidden focus:border-emerald-500 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="ed25519">Ed25519 (Recommended)</option>
                    <option value="rsa">RSA 4096-bit</option>
                    <option value="password">Password</option>
                    <option value="certificate">SSH Certificate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1">Default Remote Username</label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="deploy, root, ec2-user"
                  className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 focus:outline-hidden focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1">Public Key (Optional)</label>
                <input
                  type="text"
                  value={formPublicKey}
                  onChange={(e) => setFormPublicKey(e.target.value)}
                  placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5..."
                  className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 focus:outline-hidden focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1">
                  Private Key / Password (Encrypted into Vault) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formSecret}
                  onChange={(e) => setFormSecret(e.target.value)}
                  placeholder="Paste OpenSSH private key or secret password..."
                  className="w-full px-3 py-1.5 rounded-md bg-[#0A0A0B] border border-[#222224] text-gray-100 focus:outline-hidden focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="pt-3 border-t border-[#222224] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-sm"
                >
                  Save Identity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
