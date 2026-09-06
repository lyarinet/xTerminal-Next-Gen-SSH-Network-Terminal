import React, { useState, useEffect, useRef } from 'react';
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
  Clock,
  Plus,
  Trash2,
  ExternalLink,
  Check,
  Copy,
  Sliders,
  Folder,
  AlertTriangle,
  XCircle,
  Send,
  Zap,
  ArrowUpRight
} from 'lucide-react';
import { TftpStagedFile, TftpTransferItem } from '../types';

interface TftpPreset {
  label: string;
  path: string;
  os: string;
}

export const TftpView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'server' | 'client'>('server');

  // Server state
  const [isRunning, setIsRunning] = useState(false);
  const [port, setPort] = useState(69);
  const [rootDirectory, setRootDirectory] = useState('/tftpboot');
  const [customPathInput, setCustomPathInput] = useState('');
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<TftpStagedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [detectedPlatform, setDetectedPlatform] = useState<string>('windows');
  const [presets, setPresets] = useState<TftpPreset[]>([]);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Live TFTP Client active transfers
  const [transfers, setTransfers] = useState<TftpTransferItem[]>([]);

  // Client tool inputs
  const [clientHost, setClientHost] = useState('');
  const [clientPort, setClientPort] = useState(69);
  const [clientOpcode, setClientOpcode] = useState<'RRQ' | 'WRQ'>('WRQ');
  const [clientFileName, setClientFileName] = useState('');
  const [clientBlockSize, setClientBlockSize] = useState(1420);
  const [uploadSourceMode, setUploadSourceMode] = useState<'staged' | 'computer'>('staged');
  const [selectedStagedFile, setSelectedStagedFile] = useState<string>('');
  const [clientLocalFile, setClientLocalFile] = useState<File | null>(null);

  // Client live transfer progress
  const [activeTransferId, setActiveTransferId] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [clientProgress, setClientProgress] = useState<number | null>(null);
  const [clientStatus, setClientStatus] = useState<string>('');
  const [clientRate, setClientRate] = useState<string>('0 KB/s');
  const [clientTransferredBytes, setClientTransferredBytes] = useState<number>(0);
  const [clientTotalBytes, setClientTotalBytes] = useState<number>(0);
  const [clientError, setClientError] = useState<string | null>(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<'firmware' | 'pxe' | 'config' | 'raw'>('firmware');
  const [newFileDesc, setNewFileDesc] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [copiedFileName, setCopiedFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const clientFileInputRef = useRef<HTMLInputElement>(null);
  const progressPollRef = useRef<NodeJS.Timeout | null>(null);

  // Load server status & initial root directory
  const fetchServerStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tftp/status');
      if (res.ok) {
        const data = await res.json();
        setIsRunning(Boolean(data.running));
        setPort(data.port || 69);
        const activeDir = data.directory || rootDirectory;
        setRootDirectory(activeDir);
        setCustomPathInput(activeDir);
        setStagedFiles(data.files || []);
        setDetectedPlatform(data.platform || 'windows');
        if (data.presets && Array.isArray(data.presets)) {
          setPresets(data.presets);
        }
        if (data.files && data.files.length > 0 && !selectedStagedFile) {
          setSelectedStagedFile(data.files[0].name);
          if (!clientFileName) {
            setClientFileName(data.files[0].name);
          }
        }
        if (data.error) {
          setServerError(data.error);
        } else {
          setServerError(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch TFTP server status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedCustomDir = localStorage.getItem('xterminal_tftp_root_dir');
    if (savedCustomDir) {
      setRootDirectory(savedCustomDir);
      setCustomPathInput(savedCustomDir);
    }
    fetchServerStatus();

    return () => {
      if (progressPollRef.current) {
        clearInterval(progressPollRef.current);
      }
    };
  }, []);

  // Save / Apply Host Root Directory
  const handleSaveRootDirectory = async (targetPath: string) => {
    const cleanPath = targetPath.trim();
    if (!cleanPath) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/tftp/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setDirectory', directory: cleanPath }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRootDirectory(data.directory);
        setCustomPathInput(data.directory);
        setStagedFiles(data.files || []);
        localStorage.setItem('xterminal_tftp_root_dir', data.directory);
        setIsEditingPath(false);
        setSaveSuccessMessage(`Root directory updated: ${data.directory}`);
        setTimeout(() => setSaveSuccessMessage(null), 3000);
      } else {
        setServerError(data.error || 'Failed to update root directory');
      }
    } catch (err: any) {
      setServerError(`Network error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Browse Directory via native Electron dialog or fallback
  const handleBrowseDirectory = async () => {
    try {
      const nativeBridge = (window as any).xterminalxNative;
      if (nativeBridge && typeof nativeBridge.selectDirectory === 'function') {
        const selected = await nativeBridge.selectDirectory(rootDirectory);
        if (selected) {
          await handleSaveRootDirectory(selected);
        }
      } else {
        setIsEditingPath(true);
      }
    } catch (err) {
      console.error('Failed to open native directory selector:', err);
      setIsEditingPath(true);
    }
  };

  // Open Staging Folder in native OS File Explorer (Windows / macOS / Linux)
  const handleOpenFolder = async () => {
    try {
      const nativeBridge = (window as any).xterminalxNative;
      if (nativeBridge && typeof nativeBridge.openPath === 'function') {
        nativeBridge.openPath(rootDirectory);
      } else {
        await fetch('/api/tftp/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'openFolder' }),
        });
      }
    } catch (err) {
      console.error('Failed to open host folder:', err);
    }
  };

  // Toggle TFTP Server Daemon
  const handleToggleServer = async () => {
    setServerError(null);
    try {
      const res = await fetch('/api/tftp/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', port, directory: rootDirectory }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsRunning(Boolean(data.running));
        if (data.error) {
          setServerError(data.error);
        }
      } else {
        setServerError(data.error || 'Failed to start TFTP daemon');
      }
    } catch (err: any) {
      setServerError(`Failed to toggle TFTP daemon: ${err.message}`);
    }
  };

  // Delete staged file from disk
  const handleDeleteFile = async (fileName: string) => {
    if (!confirm(`Are you sure you want to remove "${fileName}" from host staging directory?`)) return;
    try {
      const res = await fetch('/api/tftp/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteFile', fileName }),
      });
      const data = await res.json();
      if (res.ok && data.files) {
        setStagedFiles(data.files);
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  // Stage File submission
  const handleStageFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    setIsUploading(true);
    try {
      let fileContent = null;
      let isBase64 = false;

      if (selectedUploadFile) {
        const arrayBuffer = await selectedUploadFile.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        fileContent = btoa(binary);
        isBase64 = true;
      }

      const res = await fetch('/api/tftp/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload',
          file: {
            name: newFileName.trim(),
            type: newFileType,
            description: newFileDesc || (selectedUploadFile ? `Uploaded ${selectedUploadFile.name}` : 'Staged manual firmware item'),
            size: selectedUploadFile ? selectedUploadFile.size : 1024,
            content: fileContent,
            base64: isBase64,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStagedFiles(data.files || []);
        setShowUploadModal(false);
        setSelectedUploadFile(null);
        setNewFileName('');
        setNewFileDesc('');
      }
    } catch (err) {
      console.error('Failed to stage file:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedUploadFile(file);
      setNewFileName(file.name);
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['bin', 'img', 'tar', 'gz', 'iso'].includes(ext || '')) {
        setNewFileType('firmware');
      } else if (['0', 'pxe', 'kpxe', 'efi'].includes(ext || '')) {
        setNewFileType('pxe');
      } else if (['cfg', 'conf', 'txt', 'rsc'].includes(ext || '')) {
        setNewFileType('config');
      } else {
        setNewFileType('raw');
      }
    }
  };

  // Client Local File selection for WRQ Upload
  const handleClientLocalFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setClientLocalFile(file);
      if (!clientFileName || clientFileName === selectedStagedFile) {
        setClientFileName(file.name);
      }
    }
  };

  // REAL TFTP Client Upload (WRQ) & Download (RRQ) execution
  const handleInitiateClientTransfer = async () => {
    if (!clientHost.trim()) {
      setClientError('Please enter the remote host IP address.');
      return;
    }
    if (!clientFileName.trim()) {
      setClientError('Please specify the target file name.');
      return;
    }

    setClientError(null);
    setIsTransferring(true);
    setClientProgress(0);
    setClientStatus(`Preparing ${clientOpcode === 'WRQ' ? 'Upload' : 'Download'} to ${clientHost}:${clientPort}...`);

    try {
      let fileContent = null;
      let isBase64 = false;

      if (clientOpcode === 'WRQ') {
        if (uploadSourceMode === 'computer') {
          if (!clientLocalFile) {
            setClientError('Please select a local file from your computer to upload.');
            setIsTransferring(false);
            return;
          }
          setClientStatus(`Reading local file "${clientLocalFile.name}" (${formatBytes(clientLocalFile.size)})...`);
          const arrayBuffer = await clientLocalFile.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          fileContent = btoa(binary);
          isBase64 = true;
        } else {
          // Staged file
          if (!selectedStagedFile) {
            setClientError('Please select a staged file from the root directory.');
            setIsTransferring(false);
            return;
          }
        }
      }

      setClientStatus(`Connecting UDP TFTP socket to ${clientHost}:${clientPort} (blksize=${clientBlockSize})...`);

      const res = await fetch('/api/tftp/client-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: clientHost.trim(),
          port: clientPort || 69,
          opcode: clientOpcode,
          fileName: clientFileName.trim(),
          blockSize: clientBlockSize,
          sourceType: uploadSourceMode,
          stagedFileName: selectedStagedFile,
          fileContent,
          base64: isBase64,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to initiate transfer');
      }

      const transferId = data.transferId;
      setActiveTransferId(transferId);

      // Start live progress polling
      if (progressPollRef.current) clearInterval(progressPollRef.current);

      progressPollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/tftp/client-progress/${transferId}`);
          if (pollRes.ok) {
            const pData = await pollRes.json();
            setClientProgress(pData.percent || 0);
            setClientRate(pData.rate || '0 KB/s');
            setClientTransferredBytes(pData.transferredBytes || 0);
            setClientTotalBytes(pData.totalBytes || 0);

            if (pData.status === 'active') {
              setClientStatus(
                `Transferring block #${pData.blocks || 0} (${formatBytes(pData.transferredBytes || 0)} / ${formatBytes(pData.totalBytes || 0)}) • ${pData.rate || '0 KB/s'}`
              );
            } else if (pData.status === 'completed') {
              if (progressPollRef.current) clearInterval(progressPollRef.current);
              setIsTransferring(false);
              setClientProgress(100);
              setClientStatus(
                `Successfully ${clientOpcode === 'WRQ' ? 'uploaded' : 'downloaded'} ${clientFileName} (${formatBytes(pData.totalBytes)}) at ${pData.rate}!`
              );

              // Record in transfer history
              setTransfers((prev) => [
                {
                  id: transferId,
                  fileName: clientFileName,
                  clientIp: clientHost,
                  opcode: clientOpcode,
                  blocksTransferred: pData.blocks || 0,
                  bytesTransferred: pData.totalBytes || pData.transferredBytes || 0,
                  status: 'completed',
                  rate: pData.rate || 'Fast',
                },
                ...prev,
              ]);

              // Refresh staged files if download completed
              if (clientOpcode === 'RRQ') {
                fetchServerStatus();
              }
            } else if (pData.status === 'failed') {
              if (progressPollRef.current) clearInterval(progressPollRef.current);
              setIsTransferring(false);
              setClientError(pData.error || 'Transfer failed or timed out.');
              setClientStatus('Transfer failed.');

              setTransfers((prev) => [
                {
                  id: transferId,
                  fileName: clientFileName,
                  clientIp: clientHost,
                  opcode: clientOpcode,
                  blocksTransferred: pData.blocks || 0,
                  bytesTransferred: pData.transferredBytes || 0,
                  status: 'failed',
                  rate: '0 KB/s',
                },
                ...prev,
              ]);
            }
          }
        } catch (pollErr) {
          console.error('Progress poll error:', pollErr);
        }
      }, 300);
    } catch (err: any) {
      setIsTransferring(false);
      setClientError(err.message);
      setClientStatus('Failed to start transfer.');
    }
  };

  // Cancel active transfer
  const handleCancelTransfer = async () => {
    if (!activeTransferId) return;
    if (progressPollRef.current) clearInterval(progressPollRef.current);
    try {
      await fetch(`/api/tftp/client-cancel/${activeTransferId}`, { method: 'POST' });
    } catch {}
    setIsTransferring(false);
    setClientStatus('Transfer aborted by user.');
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes) return '0 B';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const copyFileName = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopiedFileName(name);
    setTimeout(() => setCopiedFileName(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0B] text-[#E0E0E0] overflow-hidden font-sans">
      {/* View Header */}
      <div className="bg-[#111112] border-b border-[#222224] p-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">TFTP Server &amp; Client</h1>
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold flex items-center gap-1.5 border ${
                    isRunning
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-zinc-800 text-gray-400 border-zinc-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
                    }`}
                  />
                  {isRunning ? `LISTENING (UDP ${port})` : 'STOPPED'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                  {detectedPlatform}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Real RFC 1350/2348 UDP TFTP engine with direct remote client upload (WRQ) and download (RRQ).
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center bg-[#1C1C1E] p-1 rounded-lg border border-[#222224]">
            <button
              onClick={() => setActiveTab('server')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'server'
                  ? 'bg-emerald-500 text-black shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>TFTP Server</span>
            </button>
            <button
              onClick={() => setActiveTab('client')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'client'
                  ? 'bg-emerald-500 text-black shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Remote Transfer Client</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {serverError && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Daemon Notice</span>
              <span>{serverError}</span>
              {serverError.includes('root') && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      setPort(6969);
                      setServerError(null);
                    }}
                    className="px-2.5 py-1 rounded bg-amber-500 text-black font-bold text-[11px] hover:bg-amber-400"
                  >
                    Switch to Port 6969
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {saveSuccessMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}

        {activeTab === 'server' ? (
          <>
            {/* Host Root Staging Directory Configuration Card */}
            <div className="p-5 rounded-xl bg-[#111112] border border-[#222224] space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1F1F22] pb-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-white">Host Root Staging Directory</h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenFolder}
                    className="px-2.5 py-1 rounded bg-[#1C1C1E] hover:bg-[#2A2A2E] text-gray-200 border border-[#2B2B2F] text-xs flex items-center gap-1.5 transition-colors"
                    title="Reveal directory in system file manager"
                  >
                    <ExternalLink className="w-3 h-3 text-emerald-400" />
                    <span>Open Folder in Explorer / Finder</span>
                  </button>
                  <button
                    onClick={handleBrowseDirectory}
                    className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                    title="Select a directory using system file dialog"
                  >
                    <Folder className="w-3 h-3 fill-current" />
                    <span>Browse Folder...</span>
                  </button>
                </div>
              </div>

              {/* Manual Path Input & Apply */}
              <div className="space-y-2">
                <label className="text-xs text-gray-400 flex items-center justify-between font-mono">
                  <span>Directory Path (Windows, Linux, macOS compatible):</span>
                  <span className="text-[11px] text-gray-500">Auto-created if does not exist</span>
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={customPathInput}
                      onChange={(e) => {
                        setCustomPathInput(e.target.value);
                        setIsEditingPath(true);
                      }}
                      placeholder="e.g. C:\tftpboot (Windows) or /var/lib/tftpboot (Linux) or ~/tftpboot (macOS)"
                      className="w-full px-3.5 py-2 rounded-lg bg-[#1C1C1E] border border-[#2B2B2F] text-emerald-400 font-mono text-xs focus:outline-hidden focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => handleSaveRootDirectory(customPathInput)}
                    disabled={!customPathInput.trim() || customPathInput === rootDirectory}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Set &amp; Apply Root</span>
                  </button>
                </div>
              </div>

              {/* Cross-Platform Presets Chips */}
              <div className="pt-2">
                <div className="text-[11px] text-gray-400 uppercase font-mono tracking-wider mb-2">
                  Recommended System Presets:
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const p = detectedPlatform === 'win32' ? 'C:\\tftpboot' : '/tftpboot';
                      setCustomPathInput(p);
                      handleSaveRootDirectory(p);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                      rootDirectory === (detectedPlatform === 'win32' ? 'C:\\tftpboot' : '/tftpboot')
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-[#1C1C1E] text-gray-300 border-[#2A2A2E] hover:border-gray-500'
                    }`}
                  >
                    <span>{detectedPlatform === 'win32' ? 'C:\\tftpboot' : '/tftpboot'}</span>
                    <span className="text-[10px] text-gray-500 ml-1.5">(Root)</span>
                  </button>

                  {presets.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCustomPathInput(preset.path);
                        handleSaveRootDirectory(preset.path);
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                        rootDirectory === preset.path
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-[#1C1C1E] text-gray-300 border-[#2A2A2E] hover:border-gray-500'
                      }`}
                    >
                      <span>{preset.label}</span>
                      <span className="text-[10px] text-gray-500 ml-1.5">({preset.path})</span>
                    </button>
                  ))}

                  {detectedPlatform !== 'win32' && (
                    <button
                      onClick={() => {
                        const p = '/var/lib/tftpboot';
                        setCustomPathInput(p);
                        handleSaveRootDirectory(p);
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                        rootDirectory === '/var/lib/tftpboot'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-[#1C1C1E] text-gray-300 border-[#2A2A2E] hover:border-gray-500'
                      }`}
                    >
                      <span>Linux Standard (/var/lib/tftpboot)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

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
                    className="w-24 px-2 py-1 rounded bg-[#1C1C1E] border border-[#222224] text-xs font-mono text-white disabled:opacity-50"
                  />
                  <span className="text-xs text-gray-500 font-mono">Standard: 69</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-gray-500 uppercase font-mono block">Staged Items</span>
                <span className="text-sm font-mono text-emerald-400 flex items-center gap-1 mt-0.5">
                  <Layers className="w-3.5 h-3.5" /> {stagedFiles.length} file{stagedFiles.length === 1 ? '' : 's'} on disk
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

            {/* Staged Boot & Firmware Images List */}
            <div className="rounded-xl bg-[#111112] border border-[#222224] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#222224] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-white">Files Staged in {rootDirectory}</h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#1C1C1E] text-gray-400 text-[10px] font-mono border border-[#222224]">
                    {stagedFiles.length} files
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchServerStatus}
                    className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#1C1C1E]"
                    title="Refresh file list from disk"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#1C1C1E] text-gray-400 text-[11px]">
                    <tr>
                      <th className="p-3">File Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Size</th>
                      <th className="p-3">Last Modified</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222224]">
                    {stagedFiles.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500 font-mono text-xs">
                          No files found in host staging directory ({rootDirectory}).
                          <div className="mt-2 text-gray-400">
                            Drop files into the folder or click "Stage File" to add firmware/boot images.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      stagedFiles.map((file) => (
                        <tr key={file.name} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 text-white font-medium flex items-center gap-2">
                            <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="truncate max-w-md">{file.name}</span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                file.type === 'firmware'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : file.type === 'pxe'
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                  : file.type === 'config'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-zinc-800 text-gray-300 border border-zinc-700'
                              }`}
                            >
                              {file.type}
                            </span>
                          </td>
                          <td className="p-3 text-gray-300">{formatBytes(file.size)}</td>
                          <td className="p-3 text-gray-500 text-[11px]">
                            {file.modified ? new Date(file.modified).toLocaleString() : 'Recent'}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedStagedFile(file.name);
                                  setClientFileName(file.name);
                                  setUploadSourceMode('staged');
                                  setActiveTab('client');
                                }}
                                className="px-2 py-1 rounded bg-[#1C1C1E] hover:bg-emerald-500 hover:text-black text-gray-300 text-[11px] font-sans flex items-center gap-1 transition-colors"
                                title="Send this file to remote client"
                              >
                                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                                <span>Upload to Switch</span>
                              </button>
                              <button
                                onClick={() => copyFileName(file.name)}
                                className="p-1.5 rounded hover:bg-[#252528] text-gray-400 hover:text-emerald-400 transition-colors"
                                title="Copy file name"
                              >
                                {copiedFileName === file.name ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteFile(file.name)}
                                className="p-1.5 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                                title="Delete file from disk"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Client Tab */
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="p-5 rounded-xl bg-[#111112] border border-[#222224] space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#1F1F22] pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  TFTP Remote Transfer Client
                </h2>
                {/* Transfer Direction Toggle */}
                <div className="flex items-center bg-[#1C1C1E] p-0.5 rounded-lg border border-[#2B2B2F]">
                  <button
                    onClick={() => setClientOpcode('WRQ')}
                    className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      clientOpcode === 'WRQ'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload (WRQ)</span>
                  </button>
                  <button
                    onClick={() => setClientOpcode('RRQ')}
                    className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      clientOpcode === 'RRQ'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Download className="w-3 h-3" />
                    <span>Download (RRQ)</span>
                  </button>
                </div>
              </div>

              {clientError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{clientError}</span>
                </div>
              )}

              {/* Upload Source Selector when WRQ */}
              {clientOpcode === 'WRQ' && (
                <div className="p-3.5 rounded-lg bg-[#161618] border border-[#222224] space-y-3">
                  <label className="text-[11px] text-gray-400 uppercase font-semibold block font-mono">
                    Source File to Upload:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setUploadSourceMode('staged')}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all flex items-center gap-2 ${
                        uploadSourceMode === 'staged'
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                          : 'bg-[#1C1C1E] border-[#2A2A2E] text-gray-400 hover:text-white'
                      }`}
                    >
                      <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-semibold">From Staged Directory</div>
                        <div className="text-[10px] text-gray-400">Files in {rootDirectory}</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUploadSourceMode('computer');
                        clientFileInputRef.current?.click();
                      }}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all flex items-center gap-2 ${
                        uploadSourceMode === 'computer'
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                          : 'bg-[#1C1C1E] border-[#2A2A2E] text-gray-400 hover:text-white'
                      }`}
                    >
                      <Folder className="w-4 h-4 text-blue-400 shrink-0" />
                      <div>
                        <div className="font-semibold">Browse Local Computer</div>
                        <div className="text-[10px] text-gray-400">Pick any file from disk</div>
                      </div>
                    </button>
                  </div>

                  {uploadSourceMode === 'staged' ? (
                    <div>
                      <select
                        value={selectedStagedFile}
                        onChange={(e) => {
                          setSelectedStagedFile(e.target.value);
                          setClientFileName(e.target.value);
                        }}
                        className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#2A2A2E] text-white font-mono text-xs focus:outline-hidden focus:border-emerald-500"
                      >
                        {stagedFiles.length === 0 ? (
                          <option value="">No staged files found in root directory</option>
                        ) : (
                          stagedFiles.map((f) => (
                            <option key={f.name} value={f.name}>
                              {f.name} ({formatBytes(f.size)})
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={clientFileInputRef}
                        onChange={handleClientLocalFilePicked}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => clientFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded bg-[#1C1C1E] hover:bg-[#252528] text-white border border-[#2B2B2F] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Folder className="w-3.5 h-3.5 text-blue-400" />
                        <span>Select File...</span>
                      </button>
                      <span className="text-xs font-mono text-gray-300 truncate">
                        {clientLocalFile ? `${clientLocalFile.name} (${formatBytes(clientLocalFile.size)})` : 'No file selected yet'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Network Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                    Remote Target Host IP / Switch
                  </label>
                  <input
                    type="text"
                    value={clientHost}
                    onChange={(e) => setClientHost(e.target.value)}
                    placeholder="e.g. 192.168.1.1 or 10.0.0.1"
                    className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#2B2B2F] text-white font-mono text-xs focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                    Remote UDP Port
                  </label>
                  <input
                    type="number"
                    value={clientPort}
                    onChange={(e) => setClientPort(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#2B2B2F] text-white font-mono text-xs focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                    Target File Name on Remote
                  </label>
                  <input
                    type="text"
                    value={clientFileName}
                    onChange={(e) => setClientFileName(e.target.value)}
                    placeholder="e.g. cisco-ios-15.bin or config.text"
                    className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#2B2B2F] text-emerald-400 font-mono text-xs focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                    Block Size (RFC 2348 Option)
                  </label>
                  <select
                    value={clientBlockSize}
                    onChange={(e) => setClientBlockSize(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#2B2B2F] text-white font-mono text-xs focus:outline-hidden"
                  >
                    <option value={512}>512 bytes (RFC 1350 Standard)</option>
                    <option value={1024}>1024 bytes (1 KB)</option>
                    <option value={1420}>1420 bytes (Ethernet MTU-Safe)</option>
                    <option value={2048}>2048 bytes (2 KB)</option>
                    <option value={8192}>8192 bytes (High-Speed 8 KB)</option>
                  </select>
                </div>
              </div>

              {/* Progress and status */}
              {clientProgress !== null && (
                <div className="p-4 rounded-xl bg-[#0A0A0B] border border-[#222224] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-300 truncate max-w-sm">{clientStatus}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-bold">{clientRate}</span>
                      <span className="text-white font-bold">{clientProgress}%</span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-[#1C1C1E] rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-200"
                      style={{ width: `${clientProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleInitiateClientTransfer}
                  disabled={isTransferring || !clientHost.trim() || !clientFileName.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-40"
                >
                  {isTransferring ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : clientOpcode === 'WRQ' ? (
                    <Upload className="w-4 h-4" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>
                    {isTransferring
                      ? 'Transfer in Progress...'
                      : clientOpcode === 'WRQ'
                      ? 'Upload File to Remote Device (WRQ)'
                      : 'Download File from Remote (RRQ)'}
                  </span>
                </button>

                {isTransferring && (
                  <button
                    onClick={handleCancelTransfer}
                    className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors"
                  >
                    Abort
                  </button>
                )}
              </div>
            </div>

            {/* Transfer History */}
            {transfers.length > 0 && (
              <div className="p-4 rounded-xl bg-[#111112] border border-[#222224] space-y-3 shadow-sm">
                <span className="text-xs font-bold text-white font-mono">Transfer History &amp; Logs</span>
                <div className="space-y-1.5">
                  {transfers.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between text-xs font-mono p-2.5 rounded bg-black/40 border border-zinc-800"
                    >
                      <div className="flex items-center gap-2">
                        {tx.status === 'completed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        )}
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-gray-300">
                          {tx.opcode}
                        </span>
                        <span className="text-white font-medium truncate max-w-xs">{tx.fileName}</span>
                        <span className="text-gray-500 text-[10px]">({tx.clientIp})</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-emerald-400 font-bold">{tx.rate}</span>
                        <span className="text-gray-400">{formatBytes(tx.bytesTransferred)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stage File Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#111112] border border-[#222224] rounded-xl shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" /> Stage File in Host Directory
            </h3>
            <p className="text-xs text-gray-400 font-mono">
              Target: <span className="text-emerald-400">{rootDirectory}</span>
            </p>

            <form onSubmit={handleStageFile} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                  Choose File from Computer
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFilePicked}
                  className="w-full text-xs text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1C1C1E] file:text-emerald-400 hover:file:bg-[#252528] cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                  File Name
                </label>
                <input
                  type="text"
                  required
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="e.g. cisco-ios-15.bin or netinstall.tar"
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
                  <option value="firmware">Firmware Image (.bin, .tar, .iso)</option>
                  <option value="pxe">PXE Bootloader / Kernel (.0, .efi, vmlinuz)</option>
                  <option value="config">Switch / Router Config (.cfg, .txt, .rsc)</option>
                  <option value="raw">Raw Binary / Generic (.img, .dat)</option>
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
                  placeholder="e.g. Cisco Catalyst 3850 Recovery Firmware"
                  className="w-full px-3 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1C1C1E]">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 rounded bg-[#1C1C1E] text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !newFileName.trim()}
                  className="px-4 py-1.5 rounded bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isUploading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isUploading ? 'Staging...' : 'Stage File'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
