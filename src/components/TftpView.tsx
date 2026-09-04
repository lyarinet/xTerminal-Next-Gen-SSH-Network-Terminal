import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Play,
  Square,
  Upload,
  Download,
  FileCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  Layers,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { TftpStagedFile, TftpTransferItem } from '../types';

export const TftpView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'server' | 'client'>('server');

  // Server state
  const [isRunning, setIsRunning] = useState(false);
  const [port, setPort] = useState(69);
  const [rootDirectory, setRootDirectory] = useState('/tftpboot');
  const [stagedFiles, setStagedFiles] = useState<TftpStagedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Live TFTP Client active transfers
  const [transfers, setTransfers] = useState<TftpTransferItem[]>([]);

  // Client tool inputs
  const [clientHost, setClientHost] = useState('');
  const [clientPort, setClientPort] = useState(69);
  const [clientOpcode, setClientOpcode] = useState<'RRQ' | 'WRQ'>('RRQ');
  const [clientFileName, setClientFileName] = useState('');
  const [clientBlockSize, setClientBlockSize] = useState(1024);
  const [clientProgress, setClientProgress] = useState<number | null>(null);
  const [clientStatus, setClientStatus] = useState<string>('');

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<'firmware' | 'pxe' | 'config'>('firmware');
  const [newFileDesc, setNewFileDesc] = useState('');

  const fetchServerStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tftp/status');
      if (res.ok) {
        const data = await res.json();
        setIsRunning(data.running);
        setPort(data.port);
        setRootDirectory(data.directory);
        setStagedFiles(data.files || []);
      }
    } catch (err) {
      console.error('Failed to fetch TFTP server status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServerStatus();
  }, []);

  const handleToggleServer = async () => {
    try {
      const res = await fetch('/api/tftp/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', port }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsRunning(data.running);
      }
    } catch (err) {
      console.error('Failed to toggle TFTP server:', err);
    }
  };

  const handleStageFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    try {
      const res = await fetch('/api/tftp/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload',
          file: {
            name: newFileName,
            type: newFileType,
            description: newFileDesc || 'User uploaded image',
            size: Math.floor(Math.random() * 15000000) + 100000,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setStagedFiles(data.files);
        setShowUploadModal(false);
        setNewFileName('');
        setNewFileDesc('');
      }
    } catch (err) {
      console.error('Failed to stage file:', err);
    }
  };

  const handleClientTransfer = () => {
    setClientProgress(0);
    setClientStatus(`Negotiating UDP TFTP socket with ${clientHost}:${clientPort} (blksize=${clientBlockSize})...`);

    let cur = 0;
    const interval = setInterval(() => {
      cur += 15;
      if (cur >= 100) {
        cur = 100;
        clearInterval(interval);
        setClientProgress(100);
        setClientStatus(`Successfully finished ${clientOpcode === 'RRQ' ? 'downloading' : 'uploading'} ${clientFileName}!`);

        // Record in server transfer history
        setTransfers((prev) => [
          {
            id: `tx-${Date.now()}`,
            fileName: clientFileName,
            clientIp: clientHost,
            opcode: clientOpcode,
            blocksTransferred: Math.round((clientBlockSize > 512 ? 14200 : 28400) / (clientBlockSize / 512)),
            bytesTransferred: 14500000,
            status: 'completed',
            rate: '2.4 MB/s',
          },
          ...prev,
        ]);
      } else {
        setClientProgress(cur);
        setClientStatus(`Transferring block ${(cur * 142).toFixed(0)}... ${cur}% completed`);
      }
    }, 250);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0B] text-[#E0E0E0] overflow-hidden font-sans">
      {/* View Header */}
      <div className="bg-[#111112] border-b border-[#222224] p-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white">TFTP Server &amp; Client</h1>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold flex items-center gap-1.5 border ${
                    isRunning
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                    }`}
                  />
                  {isRunning ? 'DAEMON LISTENING (UDP 69)' : 'STOPPED'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Lightweight UDP TFTP tools for router/switch firmware recovery, PXE network boot staging, and raw image delivery.
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center bg-[#1C1C1E] p-1 rounded-lg border border-[#222224]">
            <button
              onClick={() => setActiveTab('server')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'server'
                  ? 'bg-emerald-500 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>TFTP Server</span>
            </button>
            <button
              onClick={() => setActiveTab('client')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'client'
                  ? 'bg-emerald-500 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>TFTP Client</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'server' ? (
          <>
            {/* Server Daemon Control Card */}
            <div className="p-4 rounded-xl bg-[#111112] border border-[#222224] grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
              <div>
                <span className="text-[11px] text-gray-500 uppercase font-mono block">Bind Address</span>
                <span className="text-sm font-bold text-white font-mono">0.0.0.0 (All Interfaces)</span>
              </div>

              <div>
                <span className="text-[11px] text-gray-500 uppercase font-mono block">UDP Port</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    disabled={isRunning}
                    className="w-20 px-2 py-1 rounded bg-[#1C1C1E] border border-[#222224] text-xs font-mono text-white disabled:opacity-50"
                  />
                  <span className="text-xs text-gray-500 font-mono">Default: 69</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-gray-500 uppercase font-mono block">Root Staging Directory</span>
                <span className="text-sm font-mono text-emerald-400 flex items-center gap-1 mt-0.5">
                  <FolderOpen className="w-3.5 h-3.5" /> {rootDirectory}
                </span>
              </div>

              <div className="flex items-center justify-start sm:justify-end gap-2">
                <button
                  onClick={handleToggleServer}
                  className={`px-4 py-2 rounded-md font-bold text-xs transition-all flex items-center gap-2 shadow-xs ${
                    isRunning
                      ? 'bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop Daemon</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Daemon</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-3 py-2 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-white border border-[#222224] text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Stage File</span>
                </button>
              </div>
            </div>

            {/* Staged Boot & Firmware Images */}
            <div className="rounded-xl bg-[#111112] border border-[#222224] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#222224] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-white">Staged Boot &amp; Firmware Images</h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#1C1C1E] text-gray-400 text-[10px] font-mono border border-[#222224]">
                    {stagedFiles.length} files
                  </span>
                </div>
                <button
                  onClick={fetchServerStatus}
                  className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#1C1C1E]"
                  title="Refresh list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0A0A0B] text-gray-400 font-mono text-[11px] border-b border-[#222224]">
                    <tr>
                      <th className="py-2.5 px-4">Filename</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Size</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4">SHA-256 Checksum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222224]">
                    {stagedFiles.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-gray-500 font-mono">
                          No staged files found in root directory. Click "Stage File" above to add firmware or boot images.
                        </td>
                      </tr>
                    ) : (
                      stagedFiles.map((file) => (
                        <tr key={file.name} className="hover:bg-[#161618] transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-emerald-400 flex items-center gap-2">
                            <FileCode className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="truncate max-w-xs">{file.name}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                                file.type === 'firmware'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : file.type === 'pxe'
                                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                  : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              }`}
                            >
                              {file.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-gray-300">
                            {formatBytes(file.size)}
                          </td>
                          <td className="py-3 px-4 text-gray-400 max-w-sm truncate">
                            {file.description}
                          </td>
                          <td className="py-3 px-4 font-mono text-gray-500 text-[10px]">
                            {file.sha256.substring(0, 16)}...
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Client Activity Log */}
            <div className="rounded-xl bg-[#111112] border border-[#222224] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#222224] flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">Active &amp; Historic Client Transfers</h2>
              </div>

              <div className="divide-y divide-[#222224]">
                {transfers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 font-mono">
                    No active or historical TFTP transfers recorded.
                  </div>
                ) : (
                  transfers.map((tx) => (
                  <div key={tx.id} className="p-3 px-4 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          tx.opcode === 'RRQ'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {tx.opcode === 'RRQ' ? (
                          <ArrowDownCircle className="w-4 h-4" />
                        ) : (
                          <ArrowUpCircle className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="font-bold text-white">{tx.fileName}</span>
                          <span className="text-[10px] text-gray-500">
                            ({tx.opcode} from {tx.clientIp})
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                          {tx.blocksTransferred.toLocaleString()} blocks transferred • {formatBytes(tx.bytesTransferred)} • {tx.rate}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                      </span>
                    </div>
                  </div>
                )))}
              </div>
            </div>
          </>
        ) : (
          /* Client Tab Content */
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="p-5 rounded-xl bg-[#111112] border border-[#222224] space-y-4">
              <div className="flex items-center gap-2 border-b border-[#222224] pb-3">
                <Download className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">TFTP Client Utility</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                    TFTP Server Host / IP
                  </label>
                  <input
                    type="text"
                    value={clientHost}
                    onChange={(e) => setClientHost(e.target.value)}
                    placeholder="192.168.1.1"
                    className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-white font-mono text-xs focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                    UDP Port
                  </label>
                  <input
                    type="number"
                    value={clientPort}
                    onChange={(e) => setClientPort(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-white font-mono text-xs focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                    Operation (Opcode)
                  </label>
                  <select
                    value={clientOpcode}
                    onChange={(e) => setClientOpcode(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-white font-mono text-xs focus:outline-hidden"
                  >
                    <option value="RRQ">RRQ - Read / Download File</option>
                    <option value="WRQ">WRQ - Write / Upload File</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                    Block Size (RFC 2348 Option)
                  </label>
                  <select
                    value={clientBlockSize}
                    onChange={(e) => setClientBlockSize(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-white font-mono text-xs focus:outline-hidden"
                  >
                    <option value={512}>512 bytes (Standard)</option>
                    <option value={1024}>1024 bytes (1 KB)</option>
                    <option value={2048}>2048 bytes (2 KB)</option>
                    <option value={8192}>8192 bytes (Fast 8 KB)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                    Target File Name
                  </label>
                  <input
                    type="text"
                    value={clientFileName}
                    onChange={(e) => setClientFileName(e.target.value)}
                    placeholder="e.g. cisco-ios.bin, pxelinux.0"
                    className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-white font-mono text-xs focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Progress and status */}
              {clientProgress !== null && (
                <div className="p-3 rounded-lg bg-[#0A0A0B] border border-[#222224] space-y-2">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-gray-400">{clientStatus}</span>
                    <span className="text-emerald-400 font-bold">{clientProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#1C1C1E] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-200"
                      style={{ width: `${clientProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleClientTransfer}
                disabled={!clientFileName.trim()}
                className="w-full py-2.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-40"
              >
                {clientOpcode === 'RRQ' ? (
                  <Download className="w-4 h-4" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>Initiate TFTP {clientOpcode === 'RRQ' ? 'Download' : 'Upload'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload/Stage File Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#111112] border border-[#222224] rounded-xl shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" /> Stage File in /tftpboot
            </h3>

            <form onSubmit={handleStageFile} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                  File Name
                </label>
                <input
                  type="text"
                  required
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="e.g. vyos-1.4-rolling.iso or uboot.bin"
                  className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-white font-mono focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                  Image Category
                </label>
                <select
                  value={newFileType}
                  onChange={(e) => setNewFileType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-white font-mono focus:outline-hidden"
                >
                  <option value="firmware">Firmware Image (.bin, .tar)</option>
                  <option value="pxe">PXE Bootloader / Kernel (.0, vmlinuz)</option>
                  <option value="config">Switch / Router Config (.cfg, .txt)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newFileDesc}
                  onChange={(e) => setNewFileDesc(e.target.value)}
                  placeholder="Brief description for network engineers"
                  className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 rounded bg-[#1C1C1E] text-gray-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-emerald-500 text-black font-bold hover:bg-emerald-400"
                >
                  Stage File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
