import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  X,
  Save,
  FileCode,
  RotateCcw,
  CheckCircle2,
  Copy,
  Terminal,
  Shield,
  UploadCloud
} from 'lucide-react';

interface MonacoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  filePath: string;
  initialContent: string;
  isRemote?: boolean;
  serverName?: string;
  onSave: (content: string) => Promise<void> | void;
}

export const MonacoEditorModal: React.FC<MonacoEditorModalProps> = ({
  isOpen,
  onClose,
  fileName,
  filePath,
  initialContent,
  isRemote = true,
  serverName = 'Remote Host',
  onSave,
}) => {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [language, setLanguage] = useState(() => detectLanguage(fileName));

  // Reset when opened with new content
  React.useEffect(() => {
    setContent(initialContent);
    setLanguage(detectLanguage(fileName));
  }, [initialContent, fileName]);

  if (!isOpen) return null;

  function detectLanguage(file: string): string {
    const ext = file.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
      case 'sh':
      case 'bash':
      case 'zsh':
        return 'shell';
      case 'py':
        return 'python';
      case 'json':
        return 'json';
      case 'yml':
      case 'yaml':
        return 'yaml';
      case 'conf':
      case 'cnf':
      case 'ini':
        return 'ini';
      case 'sql':
        return 'sql';
      case 'js':
      case 'mjs':
        return 'javascript';
      case 'ts':
        return 'typescript';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'md':
        return 'markdown';
      case 'dockerfile':
        return 'dockerfile';
      default:
        if (file.toLowerCase().includes('dockerfile')) return 'dockerfile';
        if (file.toLowerCase().includes('nginx')) return 'ini';
        return 'plaintext';
    }
  }

  const isDirty = content !== initialContent;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(content);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save file:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs font-sans">
      <div className="w-full max-w-5xl h-[88vh] bg-[#111112] border border-[#222224] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Editor Top Bar */}
        <div className="px-4 py-3 bg-[#0A0A0B] border-b border-[#222224] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <FileCode className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white truncate">{fileName}</span>
                {isDirty && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Unsaved changes" />
                )}
                <span className="px-1.5 py-0.5 rounded bg-[#1C1C1E] text-gray-400 text-[10px] font-mono border border-[#222224]">
                  {language}
                </span>
                {isRemote && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20 flex items-center gap-1">
                    <UploadCloud className="w-3 h-3" />
                    SFTP: {serverName}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-gray-500 font-mono truncate">{filePath}</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-2 py-1 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-gray-300 font-mono focus:outline-hidden"
            >
              <option value="shell">Bash / Shell</option>
              <option value="python">Python</option>
              <option value="yaml">YAML</option>
              <option value="json">JSON</option>
              <option value="ini">INI / Conf</option>
              <option value="dockerfile">Dockerfile</option>
              <option value="sql">SQL</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="markdown">Markdown</option>
              <option value="plaintext">Plain Text</option>
            </select>

            <button
              onClick={() => setContent(initialContent)}
              disabled={!isDirty}
              className="px-2.5 py-1.5 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-400 hover:text-white text-xs border border-[#222224] disabled:opacity-40 transition-colors flex items-center gap-1.5"
              title="Revert to original"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Revert</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-40'
              }`}
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Saved over SFTP!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Uploading...' : 'Save & Sync'}</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-[#1C1C1E] transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Monaco Editor Container */}
        <div className="flex-1 w-full relative bg-[#0A0A0B]">
          <Editor
            height="100%"
            width="100%"
            language={language}
            value={content}
            theme="vs-dark"
            onChange={(val) => setContent(val || '')}
            options={{
              minimap: { enabled: true, side: 'right' },
              fontSize: 13,
              fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
              fontLigatures: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              lineNumbers: 'on',
              renderWhitespace: 'selection',
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              smoothScrolling: true,
              padding: { top: 12, bottom: 12 },
              lineHeight: 20,
            }}
          />
        </div>

        {/* Editor Status Bar */}
        <div className="h-7 px-4 bg-[#0A0A0B] border-t border-[#222224] flex items-center justify-between text-[11px] text-gray-500 font-mono shrink-0 select-none">
          <div className="flex items-center gap-4">
            <span>Encoding: UTF-8</span>
            <span>Line Endings: LF</span>
            <span>Length: {content.length} chars ({content.split('\n').length} lines)</span>
          </div>

          <div className="flex items-center gap-3">
            {isDirty ? (
              <span className="text-amber-400 font-semibold">● Modified (unsaved)</span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Synced with Server
              </span>
            )}
            <span>Monaco Core</span>
          </div>
        </div>
      </div>
    </div>
  );
};
