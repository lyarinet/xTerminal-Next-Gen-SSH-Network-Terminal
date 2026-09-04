import React, { useState } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  FileCode,
  FolderInput,
  X,
  Server,
  Download,
  Copy,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Host, EnvironmentType } from '../types';

interface UniversalImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportHosts: (importedHosts: Host[]) => void;
}

export const UniversalImportModal: React.FC<UniversalImportModalProps> = ({
  isOpen,
  onClose,
  onImportHosts,
}) => {
  const [sourceFormat, setSourceFormat] = useState<
    'openssh' | 'putty' | 'securecrt' | 'termius' | 'mobaxterm' | 'csv'
  >('openssh');
  const [inputContent, setInputContent] = useState<string>('');
  const [parsedHosts, setParsedHosts] = useState<Host[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Preset sample templates for each format so user can test instantly with 1 click
  const loadSample = (format: typeof sourceFormat) => {
    setErrorMsg(null);
    if (format === 'openssh') {
      setInputContent(
`# Sample ~/.ssh/config
Host prod-bastion
    HostName bastion.corp.example.com
    User opsadmin
    Port 2222
    IdentityFile ~/.ssh/id_ed25519

Host prod-db-primary
    HostName 10.0.12.45
    User postgres
    Port 5432
    ProxyJump prod-bastion

Host staging-api-01
    HostName api-stg.internal.net
    User deploy
    Port 22`
      );
    } else if (format === 'putty') {
      setInputContent(
`Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\\Software\\SimonTatham\\PuTTY\\Sessions\\ISP-Core-Router]
"HostName"="192.168.100.1"
"PortNumber"=dword:00000016
"UserName"="noc_admin"

[HKEY_CURRENT_USER\\Software\\SimonTatham\\PuTTY\\Sessions\\Edge-Switch-BGP]
"HostName"="10.254.0.1"
"PortNumber"=dword:00000016
"UserName"="cisco"`
      );
    } else if (format === 'securecrt') {
      setInputContent(
`<?xml version="1.0" encoding="UTF-8"?>
<VanDykeSecureCRT Version="9.4">
  <Sessions>
    <Session Name="DC1-Hypervisor-01">
      <Hostname>172.16.20.10</Hostname>
      <Port>22</Port>
      <Username>root</Username>
      <Protocol>SSH2</Protocol>
    </Session>
    <Session Name="DC1-SAN-Storage">
      <Hostname>172.16.20.25</Hostname>
      <Port>22</Port>
      <Username>storage_admin</Username>
      <Protocol>SSH2</Protocol>
    </Session>
  </Sessions>
</VanDykeSecureCRT>`
      );
    } else if (format === 'termius') {
      setInputContent(
JSON.stringify(
  [
    {
      label: "AWS-EKS-ControlPlane",
      address: "eks-master.us-west-2.aws.com",
      port: 22,
      username: "ubuntu",
      group: "Cloud Infra",
      tags: ["k8s", "production"]
    },
    {
      label: "Edge-Redis-Cache",
      address: "10.0.4.19",
      port: 22,
      username: "redis",
      group: "Databases",
      tags: ["cache", "staging"]
    }
  ],
  null,
  2
)
      );
    } else if (format === 'mobaxterm') {
      setInputContent(
`[Bookmarks]
SubRep=Datacenter Nodes
ISP-Cisco-BGP=#109#1#192.168.88.1#22#cisco##-1#-1#-1####0#0#0##1080#None#0#0#0#
Web-LoadBalancer=#109#1#192.168.88.10#22#admin##-1#-1#-1####0#0#0##1080#None#0#0#0#`
      );
    } else if (format === 'csv') {
      setInputContent(
`name,hostname,port,username,environment,tags
App-Cluster-01,10.10.1.10,22,sysadmin,production,"app,core"
App-Cluster-02,10.10.1.11,22,sysadmin,production,"app,core"
Postgres-Replica,10.10.2.15,5432,dbadmin,database,"postgres,db"`
      );
    }
  };

  const handleParse = () => {
    setErrorMsg(null);
    if (!inputContent.trim()) {
      setErrorMsg('Please paste configuration content or load a template.');
      return;
    }

    try {
      const results: Host[] = [];

      if (sourceFormat === 'openssh') {
        const lines = inputContent.split('\n');
        let current: Partial<Host> | null = null;

        lines.forEach((line) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('#') || !trimmed) return;

          const parts = trimmed.split(/\s+/);
          const key = parts[0].toLowerCase();
          const val = parts.slice(1).join(' ');

          if (key === 'host') {
            if (current && current.name && current.hostname) {
              results.push(finalizeHost(current));
            }
            current = {
              name: val,
              hostname: val,
              port: 22,
              username: 'root',
              tags: ['openssh-import'],
              environment: 'production',
            };
          } else if (current) {
            if (key === 'hostname') current.hostname = val;
            if (key === 'port') current.port = parseInt(val, 10) || 22;
            if (key === 'user') current.username = val;
            if (key === 'proxyjump') {
              current.tags = [...(current.tags || []), 'proxy-jump'];
            }
          }
        });

        if (current && current.name && current.hostname) {
          results.push(finalizeHost(current));
        }
      } else if (sourceFormat === 'termius') {
        const json = JSON.parse(inputContent);
        const list = Array.isArray(json) ? json : json.hosts || [];
        list.forEach((item: any) => {
          results.push(
            finalizeHost({
              name: item.label || item.address || 'Termius Host',
              hostname: item.address || item.hostname || 'localhost',
              port: item.port || 22,
              username: item.username || 'root',
              tags: item.tags || ['termius-import'],
              environment: 'production',
            })
          );
        });
      } else if (sourceFormat === 'putty') {
        const lines = inputContent.split('\n');
        let current: Partial<Host> | null = null;

        lines.forEach((line) => {
          const trimmed = line.trim();
          const sessionMatch = trimmed.match(/\[.*\\Sessions\\(.*)\]/);
          if (sessionMatch) {
            if (current && current.name && current.hostname) {
              results.push(finalizeHost(current));
            }
            current = {
              name: decodeURIComponent(sessionMatch[1]),
              hostname: '',
              port: 22,
              username: 'admin',
              tags: ['putty-session'],
              environment: 'production',
            };
          } else if (current) {
            if (trimmed.startsWith('"HostName"=')) {
              current.hostname = trimmed.split('=')[1].replace(/"/g, '');
            }
            if (trimmed.startsWith('"UserName"=')) {
              current.username = trimmed.split('=')[1].replace(/"/g, '');
            }
          }
        });

        if (current && current.name && current.hostname) {
          results.push(finalizeHost(current));
        }
      } else if (sourceFormat === 'csv') {
        const lines = inputContent.trim().split('\n');
        const rows = lines.slice(1);
        rows.forEach((row) => {
          const cols = row.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          if (cols.length >= 2) {
            results.push(
              finalizeHost({
                name: cols[0] || cols[1],
                hostname: cols[1],
                port: parseInt(cols[2], 10) || 22,
                username: cols[3] || 'root',
                environment: (cols[4] as EnvironmentType) || 'production',
                tags: cols[5] ? cols[5].split(';') : ['csv-import'],
              })
            );
          }
        });
      } else {
        // Generic fallback regex parser
        const ipMatches = inputContent.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || [];
        const uniqueIps: string[] = Array.from(new Set<string>(ipMatches));
        uniqueIps.forEach((ip, idx) => {
          results.push(
            finalizeHost({
              name: `${sourceFormat.toUpperCase()}-Node-${idx + 1}`,
              hostname: ip,
              port: 22,
              username: 'admin',
              tags: [`${sourceFormat}-import`],
              environment: 'production',
            })
          );
        });
      }

      if (results.length === 0) {
        setErrorMsg('No valid hosts could be parsed from the provided text.');
        setParsedHosts([]);
      } else {
        setParsedHosts(results);
      }
    } catch (err: any) {
      setErrorMsg(`Parsing Error: ${err.message || 'Invalid format'}`);
      setParsedHosts([]);
    }
  };

  const finalizeHost = (partial: Partial<Host>): Host => {
    return {
      id: `host-imp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: partial.name || 'Imported Server',
      hostname: partial.hostname || 'localhost',
      port: partial.port || 22,
      username: partial.username || 'root',
      tags: partial.tags || ['imported'],
      color: '#10B981',
      environment: partial.environment || 'production',
      connectionType: 'ssh',
      fingerprint: 'SHA256:imported...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      favorite: false,
      status: 'online',
    };
  };

  const handleCommitImport = () => {
    if (parsedHosts.length === 0) return;
    onImportHosts(parsedHosts);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-3xl bg-[#141416] border border-[#2C2C2E] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#222224] bg-[#18181A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <FolderInput className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-2">
                Universal Connection Importer
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
                  PUTTY • SECURECRT • TERMIUS • OPENSSH
                </span>
              </div>
              <div className="text-xs text-gray-400">
                Seamlessly migrate your infrastructure bookmarks and sessions from other terminal clients.
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#222224] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Pills */}
        <div className="p-4 border-b border-[#222224] bg-[#111112] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'openssh', label: 'OpenSSH Config' },
              { id: 'putty', label: 'PuTTY Registry' },
              { id: 'securecrt', label: 'SecureCRT XML' },
              { id: 'termius', label: 'Termius JSON' },
              { id: 'mobaxterm', label: 'MobaXterm INI' },
              { id: 'csv', label: 'CSV / Excel' },
            ].map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => {
                  setSourceFormat(fmt.id as any);
                  setParsedHosts([]);
                  loadSample(fmt.id as any);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sourceFormat === fmt.id
                    ? 'bg-emerald-500 text-black font-bold shadow-xs'
                    : 'bg-[#1C1C1E] text-gray-400 hover:text-white hover:bg-[#252528]'
                }`}
              >
                {fmt.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadSample(sourceFormat)}
            className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-mono"
          >
            <span>Load Sample {sourceFormat.toUpperCase()}</span>
          </button>
        </div>

        {/* Input Text Area */}
        <div className="p-4 flex-1 flex flex-col space-y-3 overflow-y-auto">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Paste your configuration file content or drop text below:</span>
            <span className="font-mono text-[11px] text-gray-500">Auto-detected schema</span>
          </div>

          <textarea
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            placeholder="Paste config or session export text here..."
            rows={7}
            className="w-full p-3 rounded-xl bg-[#0A0A0B] border border-[#222224] font-mono text-xs text-emerald-300 placeholder-gray-600 focus:outline-hidden focus:border-emerald-500 resize-none leading-relaxed shadow-inner"
          />

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/50 text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action to Parse */}
          <div className="flex justify-between items-center pt-1">
            <button
              onClick={handleParse}
              className="px-4 py-2 rounded-lg bg-[#222224] hover:bg-[#2C2C2E] text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Analyze & Preview Hosts</span>
            </button>

            {parsedHosts.length > 0 && (
              <div className="text-xs text-emerald-400 font-semibold font-mono">
                ✓ Successfully parsed {parsedHosts.length} connection(s)
              </div>
            )}
          </div>

          {/* Parsed Preview Table */}
          {parsedHosts.length > 0 && (
            <div className="mt-3 border border-[#222224] rounded-xl overflow-hidden bg-[#111112]">
              <div className="p-2.5 bg-[#18181A] border-b border-[#222224] text-xs font-semibold text-gray-300">
                Preview Detected Hosts:
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-[#222224]">
                {parsedHosts.map((h, i) => (
                  <div key={i} className="p-2.5 flex items-center justify-between text-xs font-sans">
                    <div className="flex items-center gap-2">
                      <Server className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-bold text-white">{h.name}</span>
                      <span className="text-[11px] font-mono text-gray-400">
                        {h.username}@{h.hostname}:{h.port}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {h.tags.map((t, ti) => (
                        <span key={ti} className="text-[10px] px-1.5 py-0.5 rounded bg-[#1C1C1E] text-gray-400 font-mono">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#222224] bg-[#141416] flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white"
          >
            Cancel
          </button>

          <button
            onClick={handleCommitImport}
            disabled={parsedHosts.length === 0}
            className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-40"
          >
            <span>Import {parsedHosts.length} Hosts to Workstation</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
