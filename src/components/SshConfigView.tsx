import React, { useState } from 'react';
import {
  FileCode,
  Download,
  Upload,
  Copy,
  Check,
  Server,
  ArrowRight,
  Shield,
  FileCheck
} from 'lucide-react';
import { Host, Identity } from '../types';
import { generateSshConfig, parseSshConfig } from '../lib/sshConfig';

interface SshConfigViewProps {
  hosts: Host[];
  identities: Identity[];
  onImportHosts: (newHosts: Host[]) => void;
}

export const SshConfigView: React.FC<SshConfigViewProps> = ({
  hosts,
  identities,
  onImportHosts,
}) => {
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const exportedConfig = generateSshConfig(hosts, identities);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportedConfig);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([exportedConfig], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'config';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    try {
      const parsed = parseSshConfig(importText);
      if (parsed.length === 0) {
        setImportMessage('No valid Host declarations found in the provided config text.');
        return;
      }
      onImportHosts(parsed);
      setImportMessage(`Successfully imported ${parsed.length} hosts into NexusTerm!`);
      setImportText('');
    } catch (err: any) {
      setImportMessage(`Import error: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0A0A0B] text-[#E0E0E0] p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white tracking-tight">OpenSSH Config Interoperability</h1>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            ~/.ssh/config
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          Bidirectional synchronization between standard OpenSSH configuration files and NexusTerm inventory.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export / Preview Pane */}
        <div className="bg-[#111112] border border-[#222224] rounded-xl p-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium text-sm text-white">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span>Exported OpenSSH Config</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224] text-xs font-medium transition-colors flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download ~/.ssh/config</span>
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-[340px] bg-[#0A0A0B] border border-[#222224] rounded-lg p-3 font-mono text-xs text-gray-300 overflow-x-auto whitespace-pre leading-relaxed select-all">
            {exportedConfig}
          </div>
          <p className="text-[11px] text-gray-400">
            Compatible with command-line OpenSSH, Ansible, Terraform, VS Code Remote-SSH, and Git.
          </p>
        </div>

        {/* Import Pane */}
        <div className="bg-[#111112] border border-[#222224] rounded-xl p-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium text-sm text-white">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Import Existing SSH Config</span>
            </div>
            <button
              onClick={handleImport}
              disabled={!importText.trim()}
              className="px-3 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors disabled:opacity-40 flex items-center gap-1"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Parse &amp; Import</span>
            </button>
          </div>

          <textarea
            rows={14}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={`# Paste contents of your ~/.ssh/config here:

Host prod-api-01
    HostName 10.0.1.45
    User deploy
    Port 22
    ProxyJump edge-bastion`}
            className="flex-1 min-h-[340px] w-full bg-[#0A0A0B] border border-[#222224] rounded-lg p-3 font-mono text-xs text-gray-200 focus:outline-hidden focus:border-emerald-500 leading-relaxed resize-none"
          />

          {importMessage && (
            <div
              className={`p-2.5 rounded-lg text-xs font-mono ${
                importMessage.includes('Successfully')
                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50'
                  : 'bg-amber-950/40 text-amber-300 border border-amber-800/50'
              }`}
            >
              {importMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
