import React, { useState, useEffect, useRef } from 'react';
import {
  FolderSync,
  Folder,
  File,
  Upload,
  Download,
  Trash2,
  Edit,
  Plus,
  RefreshCw,
  HardDrive,
  Server,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  Code,
  Lock,
  Sliders,
  FolderDown,
  FolderUp,
  Key,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
  Search,
  FileText,
  FileCode,
  Archive,
  Image as ImageIcon,
  Check,
  Copy,
  Home,
  SlidersHorizontal,
  Smartphone,
  Eye,
  MoreVertical,
  CheckSquare,
  Square
} from 'lucide-react';
import { Host, SftpEntry, TransferQueueItem } from '../types';
import { MonacoEditorModal } from './MonacoEditorModal';
import { getBackendHttpUrl } from '../lib/networkConfig';

interface SftpViewProps {
  hosts: Host[];
  selectedHostId?: string;
  onSelectHost: (hostId: string) => void;
  transfers?: TransferQueueItem[];
  onAddTransfer?: (tx: TransferQueueItem) => void;
}

export const SftpView: React.FC<SftpViewProps> = ({
  hosts,
  selectedHostId,
  onSelectHost,
  transfers: externalTransfers,
  onAddTransfer,
}) => {
  const currentHost = hosts.find((h) => h.id === selectedHostId) || hosts[0];

  // Remote Path & Navigation
  const [remotePath, setRemotePath] = useState<string>('~');
  const [remoteFiles, setRemoteFiles] = useState<SftpEntry[]>([]);
  const [isLoadingRemote, setIsLoadingRemote] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Path Editing & Breadcrumbs
  const [isEditingPath, setIsEditingPath] = useState<boolean>(false);
  const [pathInputValue, setPathInputValue] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  // Search & Filter & Sort
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'modified' | 'permissions'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Selection
  const [selectedRemote, setSelectedRemote] = useState<SftpEntry | null>(null);
  const [checkedPaths, setCheckedPaths] = useState<Set<string>>(new Set());

  // View Layout
  const [viewMode, setViewMode] = useState<'single' | 'dual'>('single');

  // Local Station State (for Dual-Pane mode)
  const [localPath, setLocalPath] = useState<string>('.');
  const [localFiles, setLocalFiles] = useState<SftpEntry[]>([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState<boolean>(false);
  const [selectedLocal, setSelectedLocal] = useState<SftpEntry | null>(null);

  // Transfers Queue
  const [localTransfers, setLocalTransfers] = useState<TransferQueueItem[]>([]);
  const activeTransfers = externalTransfers || localTransfers;

  // Modals & Popups
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingFile, setEditingFile] = useState<SftpEntry | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');

  const [newFolderModalOpen, setNewFolderModalOpen] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');

  const [renameModalEntry, setRenameModalEntry] = useState<SftpEntry | null>(null);
  const [renameNewName, setRenameNewName] = useState<string>('');

  const [deleteModalEntry, setDeleteModalEntry] = useState<SftpEntry | null>(null);
  const [deleteBatchModalOpen, setDeleteBatchModalOpen] = useState<boolean>(false);

  // Chmod modal
  const [chmodTarget, setChmodTarget] = useState<SftpEntry | null>(null);
  const [chmodUser, setChmodUser] = useState({ r: true, w: true, x: false });
  const [chmodGroup, setChmodGroup] = useState({ r: true, w: false, x: false });
  const [chmodOther, setChmodOther] = useState({ r: true, w: false, x: false });

  // Drag & Drop / Upload
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadNotice, setUploadNotice] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // REAL REMOTE SFTP API CALLS
  // ==========================================

  const fetchRemoteFiles = async (targetPath: string, updateHistory = true) => {
    if (!currentHost) return;
    setIsLoadingRemote(true);
    setStatusMessage(`Connecting to ${currentHost.hostname}...`);

    try {
      const res = await fetch(getBackendHttpUrl('/api/sftp/list'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: currentHost,
          path: targetPath,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to list remote files');
      }

      setRemoteFiles(data.entries || []);
      const resolvedPath = data.currentPath || targetPath;
      setRemotePath(resolvedPath);
      setPathInputValue(resolvedPath);
      setConnectionStatus('connected');
      setStatusMessage('');
      setCheckedPaths(new Set());
      setSelectedRemote(null);

      if (updateHistory) {
        setHistory((prev) => {
          const next = [...prev.slice(0, historyIdx + 1), resolvedPath];
          setHistoryIdx(next.length - 1);
          return next;
        });
      }
    } catch (err: any) {
      console.error('[SFTP] List error:', err);
      setConnectionStatus('error');
      setStatusMessage(err.message || 'Connection failed');
    } finally {
      setIsLoadingRemote(false);
    }
  };

  // Local filesystem loader (for left pane in dual view)
  const fetchLocalFiles = async (p: string) => {
    setIsLoadingLocal(true);
    try {
      const res = await fetch(getBackendHttpUrl(`/api/fs/list?path=${encodeURIComponent(p)}`));
      if (res.ok) {
        const data = await res.json();
        setLocalFiles(data.entries || []);
        setLocalPath(data.currentPath || p);
      }
    } catch (err) {
      console.error('[Local] Failed to load files:', err);
    } finally {
      setIsLoadingLocal(false);
    }
  };

  // Initial load when host changes
  useEffect(() => {
    if (currentHost) {
      setConnectionStatus('connecting');
      fetchRemoteFiles('~', true);
    }
    if (viewMode === 'dual') {
      fetchLocalFiles('.');
    }
  }, [currentHost?.id]);

  // Handle Dual Mode Toggle
  useEffect(() => {
    if (viewMode === 'dual' && localFiles.length === 0) {
      fetchLocalFiles('.');
    }
  }, [viewMode]);

  // Quick Bookmarks Navigation
  const handleNavigate = (path: string) => {
    fetchRemoteFiles(path, true);
  };

  const handleHistoryBack = () => {
    if (historyIdx > 0) {
      const target = history[historyIdx - 1];
      setHistoryIdx(historyIdx - 1);
      fetchRemoteFiles(target, false);
    }
  };

  const handleHistoryForward = () => {
    if (historyIdx < history.length - 1) {
      const target = history[historyIdx + 1];
      setHistoryIdx(historyIdx + 1);
      fetchRemoteFiles(target, false);
    }
  };

  const handleParentDirectory = () => {
    if (remotePath === '/' || remotePath === '') return;
    const parts = remotePath.split('/').filter(Boolean);
    parts.pop();
    const parent = '/' + parts.join('/');
    fetchRemoteFiles(parent === '' ? '/' : parent, true);
  };

  const handleApplyPathInput = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingPath(false);
    if (pathInputValue.trim()) {
      fetchRemoteFiles(pathInputValue.trim(), true);
    }
  };

  // ==========================================
  // FILE ACTIONS: DOWNLOAD, UPLOAD, EDIT, DELETE
  // ==========================================

  // Direct Native Browser Download
  const handleDownload = async (entry: SftpEntry) => {
    if (!currentHost || entry.name === '..' || entry.isDirectory) return;

    try {
      const res = await fetch(getBackendHttpUrl('/api/sftp/download-ticket'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: currentHost,
          path: entry.path,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate download ticket');

      // Trigger standard native browser download
      const dlUrl = getBackendHttpUrl(`/api/sftp/download?ticket=${encodeURIComponent(data.ticket)}`);
      const link = document.createElement('a');
      link.href = dlUrl;
      link.download = entry.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const tx: TransferQueueItem = {
        id: `tx-${Date.now()}`,
        name: entry.name,
        direction: 'download',
        localPath: 'Browser Downloads',
        remotePath: entry.path,
        progress: 100,
        size: entry.size,
        transferredBytes: entry.size,
        status: 'completed',
        speed: 'High-speed stream',
        eta: 'Done',
      };
      if (onAddTransfer) onAddTransfer(tx);
      else setLocalTransfers((prev) => [tx, ...prev]);
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    }
  };

  // Upload Files via Base64 Buffer Stream
  const uploadFiles = async (files: FileList | File[]) => {
    if (!currentHost || files.length === 0) return;
    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadNotice(`Uploading ${file.name} (${i + 1}/${files.length})...`);

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const res = reader.result as string;
            const b64 = res.split(',')[1] || '';
            resolve(b64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await fetch(getBackendHttpUrl('/api/sftp/upload'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: currentHost,
            targetDirectory: remotePath,
            fileName: file.name,
            contentBase64: base64,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Upload error');
        }

        const tx: TransferQueueItem = {
          id: `tx-${Date.now()}-${i}`,
          name: file.name,
          direction: 'upload',
          localPath: file.name,
          remotePath: `${remotePath}/${file.name}`,
          progress: 100,
          size: file.size,
          transferredBytes: file.size,
          status: 'completed',
          speed: 'LAN / SSH',
          eta: 'Done',
        };
        if (onAddTransfer) onAddTransfer(tx);
        else setLocalTransfers((prev) => [tx, ...prev]);
      } catch (err: any) {
        console.error(`Failed to upload ${file.name}:`, err);
        alert(`Failed to upload ${file.name}: ${err.message}`);
      }
    }

    setUploadNotice('');
    setIsUploading(false);
    fetchRemoteFiles(remotePath, false);
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  // Open & Edit in Monaco
  const handleOpenEditor = async (entry: SftpEntry) => {
    if (!currentHost || entry.isDirectory) return;
    setEditingFile(entry);
    setIsLoadingRemote(true);

    try {
      const res = await fetch(getBackendHttpUrl('/api/sftp/read'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: currentHost,
          path: entry.path,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not read file');

      setEditingContent(data.content || '');
      setIsEditorOpen(true);
    } catch (err: any) {
      alert(`Could not open editor: ${err.message}`);
    } finally {
      setIsLoadingRemote(false);
    }
  };

  const handleSaveEditor = async (content: string) => {
    if (!currentHost || !editingFile) return;

    try {
      const res = await fetch(getBackendHttpUrl('/api/sftp/write'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: currentHost,
          path: editingFile.path,
          content,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Save failed');
      }

      setIsEditorOpen(false);
      fetchRemoteFiles(remotePath, false);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  // Create Folder
  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHost || !newFolderName.trim()) return;

    try {
      const dirPath = remotePath === '/' ? `/${newFolderName.trim()}` : `${remotePath}/${newFolderName.trim()}`;
      const res = await fetch(getBackendHttpUrl('/api/sftp/mkdir'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: currentHost,
          path: dirPath,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create folder');
      }

      setNewFolderModalOpen(false);
      setNewFolderName('');
      fetchRemoteFiles(remotePath, false);
    } catch (err: any) {
      alert(`Error creating directory: ${err.message}`);
    }
  };

  // Rename File / Folder
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHost || !renameModalEntry || !renameNewName.trim()) return;

    try {
      const parts = renameModalEntry.path.split('/');
      parts.pop();
      const parent = parts.join('/') || '/';
      const targetPath = parent === '/' ? `/${renameNewName.trim()}` : `${parent}/${renameNewName.trim()}`;

      const res = await fetch(getBackendHttpUrl('/api/sftp/rename'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: currentHost,
          oldPath: renameModalEntry.path,
          newPath: targetPath,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Rename failed');
      }

      setRenameModalEntry(null);
      setRenameNewName('');
      fetchRemoteFiles(remotePath, false);
    } catch (err: any) {
      alert(`Rename error: ${err.message}`);
    }
  };

  // Delete File / Folder
  const handleDeleteConfirm = async () => {
    if (!currentHost || !deleteModalEntry) return;

    try {
      const res = await fetch(getBackendHttpUrl('/api/sftp/delete'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: currentHost,
          path: deleteModalEntry.path,
          isDirectory: deleteModalEntry.isDirectory,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }

      setDeleteModalEntry(null);
      fetchRemoteFiles(remotePath, false);
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  // Batch Delete
  const handleBatchDelete = async () => {
    if (!currentHost || checkedPaths.size === 0) return;

    try {
      for (const path of checkedPaths) {
        const entry = remoteFiles.find((f) => f.path === path);
        await fetch(getBackendHttpUrl('/api/sftp/delete'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: currentHost,
            path,
            isDirectory: entry?.isDirectory || false,
          }),
        });
      }
      setDeleteBatchModalOpen(false);
      setCheckedPaths(new Set());
      fetchRemoteFiles(remotePath, false);
    } catch (err: any) {
      alert(`Batch delete error: ${err.message}`);
    }
  };

  // Chmod Permissions
  const handleOpenChmod = (entry: SftpEntry) => {
    setChmodTarget(entry);
    const p = entry.permissions || '-rw-r--r--';
    setChmodUser({
      r: p[1] === 'r',
      w: p[2] === 'w',
      x: p[3] === 'x',
    });
    setChmodGroup({
      r: p[4] === 'r',
      w: p[5] === 'w',
      x: p[6] === 'x',
    });
    setChmodOther({
      r: p[7] === 'r',
      w: p[8] === 'w',
      x: p[9] === 'x',
    });
  };

  const calculateOctal = () => {
    const u = (chmodUser.r ? 4 : 0) + (chmodUser.w ? 2 : 0) + (chmodUser.x ? 1 : 0);
    const g = (chmodGroup.r ? 4 : 0) + (chmodGroup.w ? 2 : 0) + (chmodGroup.x ? 1 : 0);
    const o = (chmodOther.r ? 4 : 0) + (chmodOther.w ? 2 : 0) + (chmodOther.x ? 1 : 0);
    return `0${u}${g}${o}`;
  };

  const handleApplyChmod = async () => {
    if (!currentHost || !chmodTarget) return;
    const octal = calculateOctal();

    try {
      const res = await fetch(getBackendHttpUrl('/api/sftp/chmod'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: currentHost,
          path: chmodTarget.path,
          mode: octal,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to change chmod permissions');
      }

      setChmodTarget(null);
      fetchRemoteFiles(remotePath, false);
    } catch (err: any) {
      alert(`Chmod error: ${err.message}`);
    }
  };

  const applyPresetChmod = (uR: boolean, uW: boolean, uX: boolean, gR: boolean, gW: boolean, gX: boolean, oR: boolean, oW: boolean, oX: boolean) => {
    setChmodUser({ r: uR, w: uW, x: uX });
    setChmodGroup({ r: gR, w: gW, x: gX });
    setChmodOther({ r: oR, w: oW, x: oX });
  };

  // Selection toggles
  const toggleCheck = (path: string) => {
    setCheckedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const selectable = filteredFiles.filter((f) => f.name !== '..');
    if (checkedPaths.size === selectable.length) {
      setCheckedPaths(new Set());
    } else {
      setCheckedPaths(new Set(selectable.map((f) => f.path)));
    }
  };

  // Helper: File Icon Resolver
  const getFileIcon = (entry: SftpEntry) => {
    if (entry.isDirectory) {
      return <Folder className="w-4 h-4 text-amber-400 shrink-0" />;
    }
    const ext = entry.name.split('.').pop()?.toLowerCase() || '';
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'sh', 'bash', 'go', 'rs', 'php', 'c', 'cpp', 'html', 'css', 'sql'].includes(ext)) {
      return <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    if (['json', 'yaml', 'yml', 'toml', 'ini', 'conf', 'env'].includes(ext)) {
      return <SlidersHorizontal className="w-4 h-4 text-cyan-400 shrink-0" />;
    }
    if (['zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar'].includes(ext)) {
      return <Archive className="w-4 h-4 text-amber-300 shrink-0" />;
    }
    if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'ico'].includes(ext)) {
      return <ImageIcon className="w-4 h-4 text-purple-400 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-gray-400 shrink-0" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Filter & Sort
  const filteredFiles = remoteFiles
    .filter((f) => {
      if (!searchQuery.trim()) return true;
      if (f.name === '..') return true;
      return f.name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (a.name === '..') return -1;
      if (b.name === '..') return 1;
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;

      let res = 0;
      if (sortBy === 'name') res = a.name.localeCompare(b.name);
      else if (sortBy === 'size') res = (a.size || 0) - (b.size || 0);
      else if (sortBy === 'modified') res = (a.modifiedTime || '').localeCompare(b.modifiedTime || '');
      else if (sortBy === 'permissions') res = (a.permissions || '').localeCompare(b.permissions || '');

      return sortOrder === 'asc' ? res : -res;
    });

  // Breadcrumb segments
  const pathSegments = remotePath === '/' ? [] : remotePath.split('/').filter(Boolean);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0B] text-[#E0E0E0] font-sans">
      {/* Top SFTP Control Header */}
      <div className="px-4 py-3 border-b border-[#222224] bg-[#111112] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <FolderSync className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>SFTP File Manager</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono font-semibold uppercase">
                Real SSH2 Engine
              </span>
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-2">
              <span>Direct SSH Port 22 Subsystem</span>
              <span className="text-gray-600">•</span>
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-400 ring-2 ring-emerald-400/20'
                      : connectionStatus === 'connecting'
                      ? 'bg-amber-400 animate-ping'
                      : connectionStatus === 'error'
                      ? 'bg-red-400'
                      : 'bg-gray-500'
                  }`}
                />
                <span className="text-[11px] font-mono text-gray-300 capitalize">
                  {connectionStatus === 'connected'
                    ? `Connected to ${currentHost?.name}`
                    : connectionStatus === 'connecting'
                    ? 'Connecting to SFTP...'
                    : connectionStatus === 'error'
                    ? 'Connection Error'
                    : 'Idle'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Server Selector & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Target Host Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#1C1C1E] border border-[#222224] rounded-lg px-2 py-1 text-xs">
            <Server className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <select
              value={currentHost?.id || ''}
              onChange={(e) => onSelectHost(e.target.value)}
              className="bg-transparent text-white focus:outline-hidden font-medium cursor-pointer pr-1"
            >
              {hosts.map((h) => (
                <option key={h.id} value={h.id} className="bg-[#18181A] text-white">
                  {h.name} ({h.username}@{h.hostname}:{h.port})
                </option>
              ))}
            </select>
          </div>

          {/* Reconnect Button */}
          <button
            onClick={() => fetchRemoteFiles(remotePath, false)}
            className="p-1.5 rounded-lg bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 hover:text-white border border-[#222224] transition-colors cursor-pointer"
            title="Reconnect / Refresh SFTP"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRemote ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Dual-Pane View Toggle (Desktop Only) */}
          <button
            onClick={() => setViewMode(viewMode === 'single' ? 'dual' : 'single')}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              viewMode === 'dual'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border-[#222224]'
            }`}
            title="Toggle WinSCP Dual-Pane view (Local + Remote)"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>{viewMode === 'dual' ? 'Dual-Pane' : 'Remote Only'}</span>
          </button>
        </div>
      </div>

      {/* Error / Connecting Banner */}
      {statusMessage && connectionStatus === 'error' && (
        <div className="bg-red-950/80 border-b border-red-500/30 px-4 py-2 text-xs text-red-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-mono">{statusMessage}</span>
          </div>
          <button
            onClick={() => fetchRemoteFiles('~', true)}
            className="px-2.5 py-1 rounded bg-red-800/60 hover:bg-red-700 text-white font-medium text-[11px] transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#222224]">
        {/* ========================================================= */}
        {/* LOCAL STATION PANE (Only in Dual-Pane Mode) */}
        {/* ========================================================= */}
        {viewMode === 'dual' && (
          <div className="w-full md:w-1/2 flex flex-col overflow-hidden bg-[#0A0A0B]">
            <div className="p-2.5 bg-[#121214] border-b border-[#222224] flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <HardDrive className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="font-bold text-white">Local Workstation</span>
                <span className="font-mono text-gray-400 truncate max-w-[200px] text-[11px]">
                  {localPath}
                </span>
              </div>
              <button
                onClick={() => fetchLocalFiles(localPath)}
                className="p-1 hover:text-white text-gray-400 hover:bg-[#1C1C1E] rounded cursor-pointer"
                title="Refresh Local Files"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLocal ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#222224] text-gray-500 text-[11px]">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Size</th>
                    <th className="pb-2 font-medium">Permissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222224]/40">
                  {localFiles.map((f) => {
                    const isSelected = selectedLocal?.path === f.path;
                    return (
                      <tr
                        key={f.path}
                        onClick={() => setSelectedLocal(f)}
                        onDoubleClick={() => {
                          if (f.isDirectory) fetchLocalFiles(f.path);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-cyan-500/10 text-cyan-400' : 'hover:bg-[#141416] text-gray-300'
                        }`}
                      >
                        <td className="py-1.5 flex items-center gap-2">
                          {f.isDirectory ? (
                            <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : (
                            <File className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          )}
                          <span className={`truncate ${f.isDirectory ? 'font-semibold text-gray-200' : ''}`}>
                            {f.name}
                          </span>
                        </td>
                        <td className="py-1.5 text-gray-400 text-[11px]">{formatSize(f.size)}</td>
                        <td className="py-1.5 text-gray-500 text-[11px]">{f.permissions}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* REMOTE SERVER SFTP PANE */}
        {/* ========================================================= */}
        <div
          className={`flex-1 flex flex-col overflow-hidden bg-[#0A0A0B] relative ${
            isDraggingOver ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-950/10' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Quick Bookmarks Bar */}
          <div className="px-3 py-1.5 bg-[#141416] border-b border-[#222224] flex items-center justify-between gap-2 overflow-x-auto scrollbar-none shrink-0 text-xs select-none">
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mr-1">
                Quick Jumps:
              </span>
              <button
                onClick={() => handleNavigate('~')}
                className="px-2 py-0.5 rounded-md bg-[#1C1C1E] hover:bg-emerald-500/20 hover:text-emerald-400 text-gray-300 font-mono text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                title="Jump to User Home Directory"
              >
                <Home className="w-3 h-3 text-emerald-400" />
                <span>Home (~)</span>
              </button>
              <button
                onClick={() => handleNavigate('/')}
                className="px-2 py-0.5 rounded-md bg-[#1C1C1E] hover:bg-emerald-500/20 hover:text-emerald-400 text-gray-300 font-mono text-[11px] transition-colors cursor-pointer"
                title="Jump to Root Directory"
              >
                / Root
              </button>
              <button
                onClick={() => handleNavigate('/etc')}
                className="px-2 py-0.5 rounded-md bg-[#1C1C1E] hover:bg-emerald-500/20 hover:text-emerald-400 text-gray-300 font-mono text-[11px] transition-colors cursor-pointer"
                title="Jump to Configuration Directory"
              >
                /etc
              </button>
              <button
                onClick={() => handleNavigate('/var/log')}
                className="px-2 py-0.5 rounded-md bg-[#1C1C1E] hover:bg-emerald-500/20 hover:text-emerald-400 text-gray-300 font-mono text-[11px] transition-colors cursor-pointer"
                title="Jump to Logs"
              >
                /var/log
              </button>
              <button
                onClick={() => handleNavigate('/var/www')}
                className="px-2 py-0.5 rounded-md bg-[#1C1C1E] hover:bg-emerald-500/20 hover:text-emerald-400 text-gray-300 font-mono text-[11px] transition-colors cursor-pointer"
                title="Jump to Web Directory"
              >
                /var/www
              </button>
              <button
                onClick={() => handleNavigate('/tmp')}
                className="px-2 py-0.5 rounded-md bg-[#1C1C1E] hover:bg-emerald-500/20 hover:text-emerald-400 text-gray-300 font-mono text-[11px] transition-colors cursor-pointer"
                title="Jump to Temporary Files"
              >
                /tmp
              </button>
            </div>
          </div>

          {/* Breadcrumbs & Navigation Bar */}
          <div className="px-3 py-2 bg-[#111112] border-b border-[#222224] flex items-center justify-between gap-2 shrink-0">
            {/* History arrows + Up button */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleHistoryBack}
                disabled={historyIdx <= 0}
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#1C1C1E] disabled:opacity-30 transition-colors cursor-pointer"
                title="Back"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleHistoryForward}
                disabled={historyIdx >= history.length - 1}
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#1C1C1E] disabled:opacity-30 transition-colors cursor-pointer"
                title="Forward"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleParentDirectory}
                disabled={remotePath === '/'}
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#1C1C1E] disabled:opacity-30 transition-colors cursor-pointer"
                title="Go to Parent Directory"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>

            {/* Path Breadcrumbs / Input Field */}
            <div className="flex-1 min-w-0 bg-[#161618] border border-[#27272A] rounded-lg px-2.5 py-1 flex items-center gap-1.5 font-mono text-xs overflow-hidden">
              <Server className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {isEditingPath ? (
                <form onSubmit={handleApplyPathInput} className="flex-1 flex items-center gap-1">
                  <input
                    type="text"
                    autoFocus
                    value={pathInputValue}
                    onChange={(e) => setPathInputValue(e.target.value)}
                    onBlur={() => setIsEditingPath(false)}
                    placeholder="/var/www/html or ~"
                    className="w-full bg-transparent text-white focus:outline-hidden font-mono text-xs"
                  />
                  <button type="submit" className="text-emerald-400 hover:text-emerald-300 text-[11px] font-bold cursor-pointer">
                    Go
                  </button>
                </form>
              ) : (
                <div
                  onClick={() => setIsEditingPath(true)}
                  className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-none cursor-text select-none py-0.5"
                  title="Click to manually edit path"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigate('/');
                    }}
                    className="hover:text-emerald-400 hover:underline text-gray-400 font-bold px-1 py-0.5 rounded cursor-pointer"
                  >
                    /
                  </button>
                  {pathSegments.map((seg, idx) => {
                    const segPath = '/' + pathSegments.slice(0, idx + 1).join('/');
                    const isLast = idx === pathSegments.length - 1;
                    return (
                      <React.Fragment key={segPath}>
                        <span className="text-gray-600">/</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate(segPath);
                          }}
                          className={`px-1 py-0.5 rounded font-mono text-xs hover:bg-[#252528] transition-colors cursor-pointer ${
                            isLast ? 'text-emerald-400 font-bold' : 'text-gray-300 hover:text-white'
                          }`}
                        >
                          {seg}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
              <button
                onClick={() => setIsEditingPath(!isEditingPath)}
                className="p-1 text-gray-500 hover:text-white rounded shrink-0 cursor-pointer"
                title="Edit Path Directly"
              >
                <Edit className="w-3 h-3" />
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={() => fetchRemoteFiles(remotePath, false)}
              className="p-1.5 rounded-lg bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 hover:text-white border border-[#222224] transition-colors shrink-0 cursor-pointer"
              title="Refresh Directory"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRemote ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>

          {/* Action Toolbar & Search */}
          <div className="px-3 py-2 bg-[#141416] border-b border-[#222224] flex items-center justify-between gap-2 flex-wrap shrink-0">
            {/* Left Action Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Upload Button */}
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files) uploadFiles(e.target.files);
                }}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Upload files from PC or phone to remote directory"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>

              {/* New Folder Button */}
              <button
                onClick={() => setNewFolderModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-[#1C1C1E] hover:bg-[#252528] text-gray-200 hover:text-white border border-[#222224] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Create new folder"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">New Folder</span>
              </button>

              {/* Batch Actions when checked */}
              {checkedPaths.size > 0 && (
                <div className="flex items-center gap-1 pl-1 border-l border-[#2B2B30]">
                  <span className="text-[11px] font-mono text-emerald-400 px-1.5">
                    {checkedPaths.size} selected
                  </span>
                  <button
                    onClick={() => setDeleteBatchModalOpen(true)}
                    className="px-2 py-1 rounded-md bg-red-950/60 hover:bg-red-900 text-red-400 hover:text-red-200 border border-red-500/30 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title="Delete selected files"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                  <button
                    onClick={() => setCheckedPaths(new Set())}
                    className="px-2 py-1 rounded-md text-gray-400 hover:text-white text-xs cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Right Search Input */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter files..."
                className="pl-8 pr-7 py-1 rounded-lg bg-[#1C1C1E] border border-[#2B2B30] text-xs text-white placeholder-gray-500 focus:outline-hidden focus:border-emerald-500 w-36 sm:w-48 transition-all font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-gray-500 hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Upload Progress Indicator */}
          {uploadNotice && (
            <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-300 flex items-center gap-2 animate-pulse shrink-0">
              <Upload className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
              <span className="font-mono font-medium">{uploadNotice}</span>
            </div>
          )}

          {/* Drag Overlay Notice */}
          {isDraggingOver && (
            <div className="absolute inset-0 bg-emerald-950/70 backdrop-blur-xs flex flex-col items-center justify-center z-30 pointer-events-none">
              <div className="p-6 rounded-2xl bg-[#141416] border border-emerald-500/50 shadow-2xl flex flex-col items-center gap-2 text-center">
                <Upload className="w-10 h-10 text-emerald-400 animate-bounce" />
                <div className="text-sm font-bold text-white">Drop files to upload to server</div>
                <div className="text-xs text-gray-400 font-mono">{remotePath}</div>
              </div>
            </div>
          )}

          {/* Main Remote File Table */}
          <div className="flex-1 overflow-y-auto p-2">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-[#222224] text-gray-400 text-[11px] select-none">
                  <th className="pb-2 w-7 text-center">
                    <button onClick={toggleSelectAll} className="p-0.5 hover:text-white cursor-pointer">
                      {checkedPaths.size > 0 && checkedPaths.size === filteredFiles.filter((f) => f.name !== '..').length ? (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-gray-500" />
                      )}
                    </button>
                  </th>
                  <th
                    className="pb-2 font-medium cursor-pointer hover:text-white"
                    onClick={() => {
                      if (sortBy === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else {
                        setSortBy('name');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    Name {sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th
                    className="pb-2 font-medium cursor-pointer hover:text-white hidden sm:table-cell"
                    onClick={() => {
                      if (sortBy === 'size') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else {
                        setSortBy('size');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    Size {sortBy === 'size' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th
                    className="pb-2 font-medium cursor-pointer hover:text-white hidden md:table-cell"
                    onClick={() => {
                      if (sortBy === 'permissions') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else {
                        setSortBy('permissions');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    Permissions
                  </th>
                  <th className="pb-2 font-medium hidden lg:table-cell">Owner</th>
                  <th
                    className="pb-2 font-medium cursor-pointer hover:text-white hidden sm:table-cell"
                    onClick={() => {
                      if (sortBy === 'modified') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else {
                        setSortBy('modified');
                        setSortOrder('asc');
                      }
                    }}
                  >
                    Modified
                  </th>
                  <th className="pb-2 font-medium text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C1E]/60">
                {filteredFiles.map((f) => {
                  const isSelected = selectedRemote?.path === f.path;
                  const isChecked = checkedPaths.has(f.path);
                  const isParent = f.name === '..';

                  return (
                    <tr
                      key={f.path || f.name}
                      onClick={() => setSelectedRemote(f)}
                      onDoubleClick={() => {
                        if (f.isDirectory) fetchRemoteFiles(f.path, true);
                        else handleOpenEditor(f);
                      }}
                      className={`group cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-emerald-500/15 text-white'
                          : isSelected
                          ? 'bg-[#18181B] text-emerald-400 font-medium'
                          : 'hover:bg-[#141416] text-gray-300'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        {!isParent && (
                          <button onClick={() => toggleCheck(f.path)} className="p-0.5 hover:text-white cursor-pointer">
                            {isChecked ? (
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400" />
                            )}
                          </button>
                        )}
                      </td>

                      {/* File Name */}
                      <td className="py-2 flex items-center gap-2.5 pr-2">
                        {getFileIcon(f)}
                        <span
                          className={`truncate select-none ${
                            f.isDirectory ? 'font-semibold text-gray-100 hover:underline' : ''
                          }`}
                          onClick={(e) => {
                            if (f.isDirectory) {
                              e.stopPropagation();
                              fetchRemoteFiles(f.path, true);
                            }
                          }}
                        >
                          {f.name}
                        </span>
                        {f.isSymlink && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-mono">
                            link
                          </span>
                        )}
                      </td>

                      {/* Size */}
                      <td className="py-2 text-gray-400 text-[11px] hidden sm:table-cell">
                        {formatSize(f.size)}
                      </td>

                      {/* Permissions */}
                      <td className="py-2 hidden md:table-cell">
                        {!isParent && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenChmod(f);
                            }}
                            className="hover:text-emerald-400 hover:underline text-[11px] font-mono text-gray-400 cursor-pointer"
                            title="Click to edit chmod permissions"
                          >
                            {f.permissions}
                          </button>
                        )}
                      </td>

                      {/* Owner */}
                      <td className="py-2 text-gray-500 text-[11px] hidden lg:table-cell">
                        {!isParent ? `${f.owner}:${f.group}` : ''}
                      </td>

                      {/* Modified */}
                      <td className="py-2 text-gray-400 text-[11px] hidden sm:table-cell whitespace-nowrap">
                        {f.modifiedTime}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-2 text-right pr-2">
                        {!isParent && (
                          <div className="flex items-center justify-end gap-1">
                            {/* Download Button */}
                            {!f.isDirectory && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(f);
                                }}
                                className="p-1 rounded text-gray-400 hover:text-cyan-400 hover:bg-[#252528] transition-colors cursor-pointer"
                                title="Download directly to browser / device"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Edit in Monaco */}
                            {!f.isDirectory && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditor(f);
                                }}
                                className="p-1 rounded text-gray-400 hover:text-emerald-400 hover:bg-[#252528] transition-colors cursor-pointer"
                                title="Edit in Monaco Code Editor"
                              >
                                <Code className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Chmod Permissions */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenChmod(f);
                              }}
                              className="p-1 rounded text-gray-400 hover:text-amber-400 hover:bg-[#252528] transition-colors hidden sm:inline-block cursor-pointer"
                              title="Chmod Permissions"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>

                            {/* Rename */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenameModalEntry(f);
                                setRenameNewName(f.name);
                              }}
                              className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#252528] transition-colors hidden sm:inline-block cursor-pointer"
                              title="Rename"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteModalEntry(f);
                              }}
                              className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
                              title="Delete file or folder"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredFiles.length === 0 && !isLoadingRemote && (
              <div className="py-12 text-center text-gray-500 font-sans text-xs">
                {searchQuery ? `No files match "${searchQuery}"` : 'This directory is empty'}
              </div>
            )}
          </div>

          {/* Bottom Status Bar */}
          <div className="px-3 py-1.5 bg-[#111112] border-t border-[#222224] text-[11px] text-gray-400 flex items-center justify-between gap-3 shrink-0 font-mono">
            <div className="flex items-center gap-3">
              <span>{filteredFiles.filter((f) => f.name !== '..').length} items</span>
              <span>•</span>
              <span>
                Total Size:{' '}
                {formatSize(
                  filteredFiles
                    .filter((f) => !f.isDirectory && f.name !== '..')
                    .reduce((acc, cur) => acc + (cur.size || 0), 0)
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-[10px]">
              <span>Tip: Drag files from your computer to upload directly</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODALS: MONACO, CHMOD, RENAME, NEW FOLDER, DELETE */}
      {/* ========================================== */}

      {/* Monaco Code Editor Modal */}
      {isEditorOpen && editingFile && (
        <MonacoEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          fileName={editingFile.name}
          filePath={editingFile.path}
          initialContent={editingContent}
          serverName={currentHost?.name || 'Remote Host'}
          onSave={handleSaveEditor}
        />
      )}

      {/* Chmod Permissions Modal */}
      {chmodTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
          onClick={() => setChmodTarget(null)}
        >
          <div
            className="w-full max-w-md bg-[#141416] border border-[#27272A] rounded-2xl shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#222224] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Chmod Permissions</h3>
              </div>
              <button
                onClick={() => setChmodTarget(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-1">Target Path:</div>
              <div className="text-xs font-mono text-emerald-400 bg-[#1C1C1E] p-2 rounded-lg truncate">
                {chmodTarget.path}
              </div>
            </div>

            {/* Matrix */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono mb-4 bg-[#18181A] p-3 rounded-xl border border-[#222224]">
              <div className="text-gray-500 font-semibold">Scope</div>
              <div className="text-gray-400 font-semibold">Read (4)</div>
              <div className="text-gray-400 font-semibold">Write (2)</div>
              <div className="text-gray-400 font-semibold">Execute (1)</div>

              <div className="text-left font-bold text-white">Owner</div>
              <div>
                <input
                  type="checkbox"
                  checked={chmodUser.r}
                  onChange={(e) => setChmodUser({ ...chmodUser, r: e.target.checked })}
                  className="rounded accent-emerald-500"
                />
              </div>
              <div>
                <input
                  type="checkbox"
                  checked={chmodUser.w}
                  onChange={(e) => setChmodUser({ ...chmodUser, w: e.target.checked })}
                  className="rounded accent-emerald-500"
                />
              </div>
              <div>
                <input
                  type="checkbox"
                  checked={chmodUser.x}
                  onChange={(e) => setChmodUser({ ...chmodUser, x: e.target.checked })}
                  className="rounded accent-emerald-500"
                />
              </div>

              <div className="text-left font-bold text-white">Group</div>
              <div>
                <input
                  type="checkbox"
                  checked={chmodGroup.r}
                  onChange={(e) => setChmodGroup({ ...chmodGroup, r: e.target.checked })}
                  className="rounded accent-emerald-500"
                />
              </div>
              <div>
                <input
                  type="checkbox"
                  checked={chmodGroup.w}
                  onChange={(e) => setChmodGroup({ ...chmodGroup, w: e.target.checked })}
                  className="rounded accent-emerald-500"
                />
              </div>
              <div>
                <input
                  type="checkbox"
                  checked={chmodGroup.x}
                  onChange={(e) => setChmodGroup({ ...chmodGroup, x: e.target.checked })}
                  className="rounded accent-emerald-500"
                />
              </div>

              <div className="text-left font-bold text-white">Public</div>
              <div>
                <input
                  type="checkbox"
                  checked={chmodOther.r}
                  onChange={(e) => setChmodOther({ ...chmodOther, r: e.target.checked })}
                  className="rounded accent-emerald-500"
                />
              </div>
              <div>
                <input
                  type="checkbox"
                  checked={chmodOther.w}
                  onChange={(e) => setChmodOther({ ...chmodOther, w: e.target.checked })}
                  className="rounded accent-emerald-500"
                />
              </div>
              <div>
                <input
                  type="checkbox"
                  checked={chmodOther.x}
                  onChange={(e) => setChmodOther({ ...chmodOther, x: e.target.checked })}
                  className="rounded accent-emerald-500"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 mb-4 flex-wrap text-xs">
              <span className="text-[11px] text-gray-500 mr-1">Presets:</span>
              <button
                onClick={() => applyPresetChmod(true, true, true, true, false, true, true, false, true)}
                className="px-2 py-1 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 font-mono text-[11px] cursor-pointer"
              >
                755 (Folder/Exec)
              </button>
              <button
                onClick={() => applyPresetChmod(true, true, false, true, false, false, true, false, false)}
                className="px-2 py-1 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 font-mono text-[11px] cursor-pointer"
              >
                644 (File)
              </button>
              <button
                onClick={() => applyPresetChmod(true, true, false, false, false, false, false, false, false)}
                className="px-2 py-1 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 font-mono text-[11px] cursor-pointer"
              >
                600 (Private)
              </button>
              <button
                onClick={() => applyPresetChmod(true, true, true, true, true, true, true, true, true)}
                className="px-2 py-1 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 font-mono text-[11px] cursor-pointer"
              >
                777 (Full)
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#222224]">
              <div className="text-xs font-mono">
                <span className="text-gray-400">Octal Mode: </span>
                <span className="text-emerald-400 font-bold">{calculateOctal()}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setChmodTarget(null)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyChmod}
                  className="px-4 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Apply Chmod
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {newFolderModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
          onClick={() => setNewFolderModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-[#141416] border border-[#27272A] rounded-2xl shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              Create New Folder
            </h3>
            <p className="text-xs text-gray-400 mb-3 truncate">Directory will be created in {remotePath}</p>
            <form onSubmit={handleCreateFolderSubmit} className="space-y-3">
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. backup, logs, scripts"
                className="w-full bg-[#1C1C1E] border border-[#2B2B30] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-hidden focus:border-emerald-500 font-mono"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setNewFolderModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameModalEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
          onClick={() => setRenameModalEntry(null)}
        >
          <div
            className="w-full max-w-sm bg-[#141416] border border-[#27272A] rounded-2xl shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Edit className="w-4 h-4 text-amber-400" />
              Rename
            </h3>
            <p className="text-xs text-gray-400 mb-3 truncate">Current: {renameModalEntry.name}</p>
            <form onSubmit={handleRenameSubmit} className="space-y-3">
              <input
                type="text"
                autoFocus
                value={renameNewName}
                onChange={(e) => setRenameNewName(e.target.value)}
                className="w-full bg-[#1C1C1E] border border-[#2B2B30] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-hidden focus:border-emerald-500 font-mono"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRenameModalEntry(null)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
          onClick={() => setDeleteModalEntry(null)}
        >
          <div
            className="w-full max-w-sm bg-[#141416] border border-red-500/30 rounded-2xl shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-red-400 mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Delete {deleteModalEntry.isDirectory ? 'Directory' : 'File'}?
            </h3>
            <p className="text-xs text-gray-300 mb-2 font-mono bg-[#1C1C1E] p-2 rounded-lg truncate">
              {deleteModalEntry.path}
            </p>
            <p className="text-[11px] text-gray-400 mb-4">
              This action cannot be undone on the remote server.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalEntry(null)}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {deleteBatchModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
          onClick={() => setDeleteBatchModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-[#141416] border border-red-500/30 rounded-2xl shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-red-400 mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Delete {checkedPaths.size} Selected Items?
            </h3>
            <p className="text-[11px] text-gray-400 mb-4">
              Are you sure you want to permanently delete the {checkedPaths.size} selected items from the remote server?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteBatchModalOpen(false)}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBatchDelete}
                className="px-4 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-xs cursor-pointer"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
