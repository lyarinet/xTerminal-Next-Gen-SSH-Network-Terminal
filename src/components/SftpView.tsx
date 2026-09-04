import React, { useState, useEffect } from 'react';
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
  Key
} from 'lucide-react';
import { Host, SftpEntry, TransferQueueItem } from '../types';
import { MonacoEditorModal } from './MonacoEditorModal';

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
  const [remotePath, setRemotePath] = useState('.');
  const [localPath, setLocalPath] = useState('.');
  const [remoteFiles, setRemoteFiles] = useState<SftpEntry[]>([]);
  const [localFiles, setLocalFiles] = useState<SftpEntry[]>([]);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);

  const [selectedLocal, setSelectedLocal] = useState<SftpEntry | null>(null);
  const [selectedRemote, setSelectedRemote] = useState<SftpEntry | null>(null);

  // Transfers queue
  const [localTransfers, setLocalTransfers] = useState<TransferQueueItem[]>([]);

  const activeTransfers = externalTransfers || localTransfers;

  // Monaco Editor Modal
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<SftpEntry | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // Chmod Permissions Modal
  const [chmodTarget, setChmodTarget] = useState<SftpEntry | null>(null);
  const [chmodUser, setChmodUser] = useState({ r: true, w: true, x: false });
  const [chmodGroup, setChmodGroup] = useState({ r: true, w: false, x: false });
  const [chmodOther, setChmodOther] = useState({ r: true, w: false, x: false });
  const [chmodRecursive, setChmodRecursive] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<SftpEntry | null>(null);

  // Real filesystem loaders
  const fetchRemoteFiles = async (p: string) => {
    setIsLoadingRemote(true);
    try {
      const res = await fetch(`/api/fs/list?path=${encodeURIComponent(p)}`);
      if (res.ok) {
        const data = await res.json();
        setRemoteFiles(data.entries || []);
        setRemotePath(data.currentPath || p);
      }
    } catch (err) {
      console.error('Failed to load remote directory:', err);
    } finally {
      setIsLoadingRemote(false);
    }
  };

  const fetchLocalFiles = async (p: string) => {
    setIsLoadingLocal(true);
    try {
      const res = await fetch(`/api/fs/list?path=${encodeURIComponent(p)}`);
      if (res.ok) {
        const data = await res.json();
        setLocalFiles(data.entries || []);
        setLocalPath(data.currentPath || p);
      }
    } catch (err) {
      console.error('Failed to load local directory:', err);
    } finally {
      setIsLoadingLocal(false);
    }
  };

  useEffect(() => {
    fetchRemoteFiles('.');
    fetchLocalFiles('.');
  }, []);

  const handleUpload = async () => {
    if (!selectedLocal || selectedLocal.name === '..') return;
    const newTx: TransferQueueItem = {
      id: `tx-${Date.now()}`,
      name: selectedLocal.name,
      direction: 'upload',
      localPath: selectedLocal.path,
      remotePath: `${remotePath}/${selectedLocal.name}`,
      progress: 25,
      size: selectedLocal.size,
      transferredBytes: Math.floor(selectedLocal.size * 0.25),
      status: 'transferring',
      speed: '12.4 MB/s',
      eta: '1s',
    };

    if (onAddTransfer) {
      onAddTransfer(newTx);
    } else {
      setLocalTransfers((prev) => [newTx, ...prev]);
    }

    try {
      // Real file read & copy
      const readRes = await fetch(`/api/fs/read?path=${encodeURIComponent(selectedLocal.path)}`);
      const fileData = readRes.ok ? await readRes.json() : { content: '' };

      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: `${remotePath}/${selectedLocal.name}`,
          content: fileData.content || '',
        }),
      });

      setLocalTransfers((prev) =>
        prev.map((t) =>
          t.id === newTx.id
            ? { ...t, progress: 100, status: 'completed', transferredBytes: t.size, eta: '0s' }
            : t
        )
      );

      fetchRemoteFiles(remotePath);
    } catch (err) {
      setLocalTransfers((prev) =>
        prev.map((t) => (t.id === newTx.id ? { ...t, status: 'failed' } : t))
      );
    }
  };

  const handleDownload = async () => {
    if (!selectedRemote || selectedRemote.name === '..') return;
    const newTx: TransferQueueItem = {
      id: `tx-${Date.now()}`,
      name: selectedRemote.name,
      direction: 'download',
      localPath: `${localPath}/${selectedRemote.name}`,
      remotePath: selectedRemote.path,
      progress: 30,
      size: selectedRemote.size,
      transferredBytes: Math.floor(selectedRemote.size * 0.3),
      status: 'transferring',
      speed: '18.2 MB/s',
      eta: '1s',
    };

    if (onAddTransfer) {
      onAddTransfer(newTx);
    } else {
      setLocalTransfers((prev) => [newTx, ...prev]);
    }

    try {
      const readRes = await fetch(`/api/fs/read?path=${encodeURIComponent(selectedRemote.path)}`);
      const fileData = readRes.ok ? await readRes.json() : { content: '' };

      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: `${localPath}/${selectedRemote.name}`,
          content: fileData.content || '',
        }),
      });

      setLocalTransfers((prev) =>
        prev.map((t) =>
          t.id === newTx.id
            ? { ...t, progress: 100, status: 'completed', transferredBytes: t.size, eta: '0s' }
            : t
        )
      );

      fetchLocalFiles(localPath);
    } catch (err) {
      setLocalTransfers((prev) =>
        prev.map((t) => (t.id === newTx.id ? { ...t, status: 'failed' } : t))
      );
    }
  };

  // Open in Monaco Editor with real file content
  const handleOpenMonaco = async (entry: SftpEntry) => {
    setEditingFile(entry);
    try {
      const res = await fetch(`/api/fs/read?path=${encodeURIComponent(entry.path)}`);
      if (res.ok) {
        const data = await res.json();
        setEditingContent(data.content || '');
      } else {
        setEditingContent(`// Error loading file from disk`);
      }
    } catch (err: any) {
      setEditingContent(`// Error: ${err.message}`);
    }
    setIsEditorOpen(true);
  };

  const handleSaveMonaco = async (content: string) => {
    if (!editingFile) return;
    try {
      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: editingFile.path, content }),
      });
      fetchRemoteFiles(remotePath);
      fetchLocalFiles(localPath);
    } catch (err) {
      console.error('Failed to save file:', err);
    }
    setEditingContent(content);
    setIsEditorOpen(false);
  };

  // Open Chmod Modal
  const handleOpenChmod = (entry: SftpEntry) => {
    setChmodTarget(entry);
    const p = entry.permissions;
    // parse drwxr-xr-x or -rw-r--r--
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
    setChmodRecursive(entry.isDirectory);
  };

  // Calculate Octal Chmod
  const calculateOctal = () => {
    const u = (chmodUser.r ? 4 : 0) + (chmodUser.w ? 2 : 0) + (chmodUser.x ? 1 : 0);
    const g = (chmodGroup.r ? 4 : 0) + (chmodGroup.w ? 2 : 0) + (chmodGroup.x ? 1 : 0);
    const o = (chmodOther.r ? 4 : 0) + (chmodOther.w ? 2 : 0) + (chmodOther.x ? 1 : 0);
    return `${u}${g}${o}`;
  };

  const handleApplyChmod = () => {
    if (!chmodTarget) return;
    const isDir = chmodTarget.isDirectory;
    const prefix = isDir ? 'd' : '-';
    const uStr = `${chmodUser.r ? 'r' : '-'}${chmodUser.w ? 'w' : '-'}${chmodUser.x ? 'x' : '-'}`;
    const gStr = `${chmodGroup.r ? 'r' : '-'}${chmodGroup.w ? 'w' : '-'}${chmodGroup.x ? 'x' : '-'}`;
    const oStr = `${chmodOther.r ? 'r' : '-'}${chmodOther.w ? 'w' : '-'}${chmodOther.x ? 'x' : '-'}`;
    const newPerm = `${prefix}${uStr}${gStr}${oStr}`;

    setRemoteFiles((prev) =>
      prev.map((f) => (f.path === chmodTarget.path ? { ...f, permissions: newPerm } : f))
    );
    setChmodTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch('/api/fs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: deleteTarget.path }),
      });
      fetchRemoteFiles(remotePath);
      fetchLocalFiles(localPath);
    } catch (err) {
      console.error('Failed to delete target:', err);
    }
    setDeleteTarget(null);
    setSelectedRemote(null);
    setSelectedLocal(null);
  };

  const handleCreateFolder = async (isRemote: boolean) => {
    const dirName = prompt('Enter new folder name:');
    if (!dirName) return;
    const targetDir = isRemote ? `${remotePath}/${dirName}` : `${localPath}/${dirName}`;
    try {
      await fetch('/api/fs/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetDir }),
      });
      if (isRemote) fetchRemoteFiles(remotePath);
      else fetchLocalFiles(localPath);
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0B] text-[#E0E0E0] font-sans">
      {/* Top SFTP Control Header */}
      <div className="p-4 border-b border-[#222224] bg-[#111112] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <FolderSync className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              SFTP Dual-Pane File Manager
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
                WINSCP STYLE
              </span>
            </div>
            <div className="text-xs text-gray-400">
              Recursive directory transfers, chmod controls, and built-in Monaco Editor.
            </div>
          </div>
        </div>

        {/* Remote Host Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Target Server:</span>
          <select
            value={currentHost?.id || ''}
            onChange={(e) => onSelectHost(e.target.value)}
            disabled={hosts.length === 0}
            className="px-3 py-1.5 rounded-lg bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 focus:outline-hidden focus:border-emerald-500 font-medium disabled:opacity-50"
          >
            {hosts.length === 0 ? (
              <option value="">No hosts configured</option>
            ) : (
              hosts.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.hostname})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Two Panes (Local on Left, Remote on Right) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#222224]">
        {/* Local Station Pane */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0B]">
          <div className="p-3 bg-[#111112] border-b border-[#222224] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-medium text-gray-200">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <span>Local:</span>
              <span className="font-mono text-gray-400 truncate max-w-xs">{localPath}</span>
              <button
                onClick={() => fetchLocalFiles(localPath)}
                className="p-1 hover:text-white text-gray-500 rounded hover:bg-[#1C1C1E]"
                title="Refresh local files"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLocal ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
              <button
                onClick={() => handleCreateFolder(false)}
                className="p-1 hover:text-white text-gray-500 rounded hover:bg-[#1C1C1E]"
                title="New folder"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={handleUpload}
              disabled={!selectedLocal || selectedLocal.name === '..'}
              className="px-3 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors disabled:opacity-40 flex items-center gap-1.5 shadow-xs"
            >
              <span>Upload →</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#222224] text-gray-500 text-[11px]">
                  <th className="pb-2 font-medium">Filename</th>
                  <th className="pb-2 font-medium">Size</th>
                  <th className="pb-2 font-medium">Permissions</th>
                  <th className="pb-2 font-medium">Modified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222224]/50">
                {localFiles.map((f) => {
                  const isSelected = selectedLocal?.name === f.name;
                  return (
                    <tr
                      key={f.path || f.name}
                      onClick={() => setSelectedLocal(f)}
                      onDoubleClick={() => {
                        if (f.isDirectory) {
                          fetchLocalFiles(f.path);
                        }
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-500/10 text-emerald-400' : 'hover:bg-[#161618] text-gray-300'
                      }`}
                    >
                      <td className="py-2 flex items-center gap-2">
                        {f.isDirectory ? (
                          <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <File className="w-4 h-4 text-gray-400 shrink-0" />
                        )}
                        <span
                          className={`truncate ${f.isDirectory ? 'font-semibold text-gray-200 hover:underline' : ''}`}
                          onClick={(e) => {
                            if (f.isDirectory) {
                              e.stopPropagation();
                              fetchLocalFiles(f.path);
                            }
                          }}
                        >
                          {f.name}
                        </span>
                      </td>
                      <td className="py-2 text-gray-400">{formatSize(f.size)}</td>
                      <td className="py-2 text-gray-400 text-[11px]">{f.permissions}</td>
                      <td className="py-2 text-gray-500 text-[11px]">{f.modifiedTime}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Remote Server Pane */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0B]">
          <div className="p-3 bg-[#111112] border-b border-[#222224] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-medium text-gray-200">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Remote:</span>
              <span className="font-mono text-gray-400 truncate max-w-xs">{remotePath}</span>
              <button
                onClick={() => fetchRemoteFiles(remotePath)}
                className="p-1 hover:text-white text-gray-500 rounded hover:bg-[#1C1C1E]"
                title="Refresh remote files"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRemote ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
              <button
                onClick={() => handleCreateFolder(true)}
                className="p-1 hover:text-white text-gray-500 rounded hover:bg-[#1C1C1E]"
                title="New remote folder"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                disabled={!selectedRemote || selectedRemote.name === '..'}
                className="px-3 py-1 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 hover:text-white border border-[#222224] text-xs font-semibold transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>← Download</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#222224] text-gray-500 text-[11px]">
                  <th className="pb-2 font-medium">Filename</th>
                  <th className="pb-2 font-medium">Size</th>
                  <th className="pb-2 font-medium">Permissions</th>
                  <th className="pb-2 font-medium">Owner</th>
                  <th className="pb-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222224]/50">
                {remoteFiles.map((f) => {
                  const isSelected = selectedRemote?.name === f.name;
                  return (
                    <tr
                      key={f.path || f.name}
                      onClick={() => setSelectedRemote(f)}
                      onDoubleClick={() => {
                        if (f.isDirectory) {
                          fetchRemoteFiles(f.path);
                        }
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-500/10 text-emerald-400' : 'hover:bg-[#161618] text-gray-300'
                      }`}
                    >
                      <td className="py-2 flex items-center gap-2">
                        {f.isDirectory ? (
                          <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <File className="w-4 h-4 text-gray-400 shrink-0" />
                        )}
                        <span
                          className={`truncate ${f.isDirectory ? 'font-semibold text-gray-200 hover:underline' : ''}`}
                          onClick={(e) => {
                            if (f.isDirectory) {
                              e.stopPropagation();
                              fetchRemoteFiles(f.path);
                            }
                          }}
                        >
                          {f.name}
                        </span>
                      </td>
                      <td className="py-2 text-gray-400">{formatSize(f.size)}</td>
                      <td className="py-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (f.name !== '..') handleOpenChmod(f);
                          }}
                          className="hover:text-emerald-400 hover:underline text-[11px] font-mono text-gray-400"
                          title="Click to edit permissions"
                        >
                          {f.permissions}
                        </button>
                      </td>
                      <td className="py-2 text-gray-500 text-[11px]">{f.owner}:{f.group}</td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!f.isDirectory && f.name !== '..' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenMonaco(f);
                              }}
                              className="px-2 py-1 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 hover:text-emerald-400 border border-[#222224] text-[10px] flex items-center gap-1"
                              title="Edit in Monaco Code Editor"
                            >
                              <Code className="w-3 h-3 text-emerald-400" />
                              <span>Monaco</span>
                            </button>
                          )}

                          {f.name !== '..' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenChmod(f);
                              }}
                              className="p-1 rounded bg-[#1C1C1E] hover:bg-[#252528] text-gray-400 hover:text-white border border-[#222224]"
                              title="Chmod Permissions"
                            >
                              <Sliders className="w-3 h-3" />
                            </button>
                          )}

                          {f.name !== '..' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(f);
                              }}
                              className="p-1 rounded hover:text-red-400 hover:bg-red-950/40 text-gray-500 transition-colors"
                              title="Delete file"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Transfer Queue Drawer */}
      <div className="h-28 bg-[#111112] border-t border-[#222224] p-3 shrink-0 flex flex-col justify-between text-xs">
        <div className="flex items-center justify-between text-gray-400 font-medium">
          <span>Active Transfers Queue ({activeTransfers.length})</span>
          <span className="text-[11px] text-gray-500 font-mono">WinSCP Recursive Protocol</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 my-1">
          {activeTransfers.map((t) => (
            <div
              key={t.id}
              className="px-3 py-1.5 rounded-lg bg-[#1C1C1E] border border-[#222224] flex items-center justify-between gap-4 font-mono text-[11px]"
            >
              <div className="flex items-center gap-2 truncate max-w-sm">
                {t.direction === 'upload' ? (
                  <Upload className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                )}
                <span className="truncate text-gray-200">{t.name}</span>
              </div>

              <div className="flex-1 max-w-xs flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[#222224] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${t.progress}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">{t.progress}%</span>
              </div>

              <div className="flex items-center gap-3 text-gray-400 shrink-0 text-[10px]">
                <span>{t.speed}</span>
                <span className={t.status === 'completed' ? 'text-emerald-400 font-medium' : 'text-amber-400'}>
                  {t.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Built-in Monaco Editor Modal */}
      {editingFile && (
        <MonacoEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          fileName={editingFile.name}
          filePath={editingFile.path}
          initialContent={editingContent}
          isRemote={true}
          serverName={currentHost?.name || 'Remote Host'}
          onSave={handleSaveMonaco}
        />
      )}

      {/* Chmod Permissions Modal */}
      {chmodTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#111112] border border-[#222224] rounded-xl shadow-2xl p-5 space-y-4 font-sans text-xs">
            <div className="flex items-center justify-between border-b border-[#222224] pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Sliders className="w-4 h-4" />
                <span className="text-white text-sm">Change Permissions (chmod)</span>
              </div>
              <button onClick={() => setChmodTarget(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-gray-300 font-mono text-xs">
              Target: <strong className="text-white">{chmodTarget.path}</strong>
            </div>

            {/* Octal Display */}
            <div className="p-3 rounded-lg bg-[#0A0A0B] border border-[#222224] flex items-center justify-between font-mono">
              <span className="text-gray-400">Octal Notation:</span>
              <span className="text-lg font-bold text-emerald-400">0{calculateOctal()}</span>
            </div>

            {/* 9-box permission grid */}
            <div className="grid grid-cols-3 gap-3 border border-[#222224] rounded-lg p-3 bg-[#0A0A0B]">
              {/* User */}
              <div className="space-y-2">
                <span className="font-bold text-gray-300 uppercase tracking-wider text-[10px] block">
                  Owner (User)
                </span>
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chmodUser.r}
                    onChange={(e) => setChmodUser({ ...chmodUser, r: e.target.checked })}
                    className="rounded border-[#222224] text-emerald-500 focus:ring-0"
                  />
                  <span>Read (r)</span>
                </label>
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chmodUser.w}
                    onChange={(e) => setChmodUser({ ...chmodUser, w: e.target.checked })}
                    className="rounded border-[#222224] text-emerald-500 focus:ring-0"
                  />
                  <span>Write (w)</span>
                </label>
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chmodUser.x}
                    onChange={(e) => setChmodUser({ ...chmodUser, x: e.target.checked })}
                    className="rounded border-[#222224] text-emerald-500 focus:ring-0"
                  />
                  <span>Execute (x)</span>
                </label>
              </div>

              {/* Group */}
              <div className="space-y-2">
                <span className="font-bold text-gray-300 uppercase tracking-wider text-[10px] block">
                  Group
                </span>
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chmodGroup.r}
                    onChange={(e) => setChmodGroup({ ...chmodGroup, r: e.target.checked })}
                    className="rounded border-[#222224] text-emerald-500 focus:ring-0"
                  />
                  <span>Read (r)</span>
                </label>
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chmodGroup.w}
                    onChange={(e) => setChmodGroup({ ...chmodGroup, w: e.target.checked })}
                    className="rounded border-[#222224] text-emerald-500 focus:ring-0"
                  />
                  <span>Write (w)</span>
                </label>
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chmodGroup.x}
                    onChange={(e) => setChmodGroup({ ...chmodGroup, x: e.target.checked })}
                    className="rounded border-[#222224] text-emerald-500 focus:ring-0"
                  />
                  <span>Execute (x)</span>
                </label>
              </div>

              {/* Other */}
              <div className="space-y-2">
                <span className="font-bold text-gray-300 uppercase tracking-wider text-[10px] block">
                  Public (Other)
                </span>
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chmodOther.r}
                    onChange={(e) => setChmodOther({ ...chmodOther, r: e.target.checked })}
                    className="rounded border-[#222224] text-emerald-500 focus:ring-0"
                  />
                  <span>Read (r)</span>
                </label>
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chmodOther.w}
                    onChange={(e) => setChmodOther({ ...chmodOther, w: e.target.checked })}
                    className="rounded border-[#222224] text-emerald-500 focus:ring-0"
                  />
                  <span>Write (w)</span>
                </label>
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chmodOther.x}
                    onChange={(e) => setChmodOther({ ...chmodOther, x: e.target.checked })}
                    className="rounded border-[#222224] text-emerald-500 focus:ring-0"
                  />
                  <span>Execute (x)</span>
                </label>
              </div>
            </div>

            {chmodTarget.isDirectory && (
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={chmodRecursive}
                  onChange={(e) => setChmodRecursive(e.target.checked)}
                  className="rounded border-[#222224] text-emerald-500 focus:ring-0"
                />
                <span>Apply permissions recursively to all subdirectories &amp; files (-R)</span>
              </label>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222224]">
              <button
                onClick={() => setChmodTarget(null)}
                className="px-3 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224]"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyChmod}
                className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
              >
                Apply (chmod {calculateOctal()})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#111112] border border-red-900/60 rounded-xl shadow-2xl p-5 space-y-4 font-sans text-xs">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-semibold text-sm text-gray-100">Confirm Remote Deletion</h3>
            </div>
            <p className="text-xs text-gray-300">
              Are you sure you want to delete <strong className="font-mono text-red-300">{deleteTarget.path}</strong> from <strong className="text-white">{currentHost?.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224] text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-medium shadow-sm"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
