import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  X,
  Play,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Terminal,
  RotateCcw
} from 'lucide-react';
import { analyzeCommandRisk } from '../lib/safetyEngine';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  terminalContext?: string;
  onExecuteCommand: (command: string) => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  terminalContext,
  onExecuteCommand,
}) => {
  const [prompt, setPrompt] = useState('');
  const [taskType, setTaskType] = useState<'explain' | 'generate' | 'diagnose' | 'refactor'>('generate');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    { sender: 'user' | 'assistant'; text: string; suggestedCommands?: string[] }[]
  >([
    {
      sender: 'assistant',
      text: "Hello! I'm your NexusTerm AI infrastructure assistant powered by Gemini. Ask me to generate bash scripts, troubleshoot Linux daemons, inspect Docker/Kubernetes configurations, or explain terminal output.",
      suggestedCommands: ['df -hT', 'journalctl -xe -u nginx --no-pager -n 30', 'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"'],
    },
  ]);

  if (!isOpen) return null;

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || prompt;
    if (!textToSend.trim()) return;

    const userMsg = { sender: 'user' as const, text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          terminalContext: terminalContext || '',
          taskType,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: data.response || 'No response generated.',
            suggestedCommands: data.suggestedCommands || [],
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: `[Error from AI engine]: ${data.error || 'Failed to generate response'}`,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `[Network Error]: ${err.message || 'Unable to connect to AI backend'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#111112] border border-[#222224] rounded-xl shadow-2xl overflow-hidden flex flex-col h-[650px] max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#222224] flex items-center justify-between bg-[#0A0A0B]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-white text-sm flex items-center gap-2">
                Infrastructure AI Copilot
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  gemini-2.5-flash
                </span>
              </div>
            </div>
          </div>

          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-2.5 bg-[#0A0A0B] border-b border-[#222224] flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-gray-400 font-medium shrink-0 ml-1">Quick Tasks:</span>
          {[
            'Diagnose recent terminal error',
            'Find 10 largest files consuming disk',
            'Generate hardened Nginx SSL reverse proxy',
            'Audit open listening ports and processes',
          ].map((quick) => (
            <button
              key={quick}
              onClick={() => handleSend(quick)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-md bg-[#1C1C1E] border border-[#222224] hover:bg-[#252528] text-gray-300 hover:text-white whitespace-nowrap transition-colors shrink-0"
            >
              {quick}
            </button>
          ))}
        </div>

        {/* Chat Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-[#0A0A0B]">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-xl p-3.5 leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-[#111112] border border-[#222224] text-gray-200 shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans text-xs">{msg.text}</div>

                {/* Suggested executable commands */}
                {msg.suggestedCommands && msg.suggestedCommands.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#222224] space-y-2">
                    <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Suggested Terminal Commands:</span>
                    </div>

                    {msg.suggestedCommands.map((cmd, cIdx) => {
                      const risk = analyzeCommandRisk(cmd);
                      return (
                        <div
                          key={cIdx}
                          className="p-2 rounded-md bg-[#0A0A0B] border border-[#222224] flex items-center justify-between gap-3 font-mono text-xs"
                        >
                          <span className="text-emerald-400 truncate flex-1">{cmd}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-bold ${
                                risk.riskLevel === 'CRITICAL'
                                  ? 'bg-red-950 text-red-300 border border-red-800'
                                  : risk.riskLevel === 'HIGH'
                                  ? 'bg-orange-950 text-orange-300 border border-orange-800'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}
                            >
                              {risk.riskLevel}
                            </span>
                            <button
                              onClick={() => handleCopy(cmd)}
                              className="p-1 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-300 border border-[#222224]"
                              title="Copy command"
                            >
                              {copiedCmd === cmd ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                onExecuteCommand(cmd);
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-sans text-[10px] font-bold flex items-center gap-1 shadow-xs"
                              title="Execute on active terminal"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>Run</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400 text-xs italic">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>Analyzing infrastructure query with Gemini...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 bg-[#0A0A0B] border-t border-[#222224] flex items-center gap-2"
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask AI to troubleshoot, write a script, or diagnose system state..."
            disabled={isLoading}
            className="flex-1 px-3.5 py-2 rounded-md bg-[#1C1C1E] border border-[#222224] text-gray-100 text-xs placeholder-gray-500 focus:outline-hidden focus:border-emerald-500 font-sans"
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-40 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
