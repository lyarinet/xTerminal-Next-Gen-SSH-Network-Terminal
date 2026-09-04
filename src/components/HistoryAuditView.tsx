import React, { useState } from 'react';
import {
  Clock,
  Search,
  Download,
  Filter,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Server,
  User,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';
import { AuditEvent } from '../types';

interface HistoryAuditViewProps {
  auditEvents: AuditEvent[];
  onClearHistory?: () => void;
}

export const HistoryAuditView: React.FC<HistoryAuditViewProps> = ({ auditEvents, onClearHistory }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const filtered = auditEvents.filter((ev) => {
    if (selectedType && ev.type !== selectedType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        ev.description.toLowerCase().includes(q) ||
        (ev.command && ev.command.toLowerCase().includes(q)) ||
        (ev.hostName && ev.hostName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(auditEvents, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexusterm-audit-log-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0B] text-[#E0E0E0] p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Security &amp; Command Audit Trail</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              IMMUTABLE RECORD
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Cryptographically timestamped session histories, executed commands, and infrastructure actions.
          </p>
        </div>

        <button
          onClick={handleExportJson}
          className="px-3.5 py-2 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-200 text-xs font-medium transition-colors flex items-center gap-1.5 border border-[#222224] shadow-sm shrink-0"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Export Audit Log (JSON)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111112] p-3 rounded-xl border border-[#222224]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search commands, target hosts, or events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-xs text-gray-200 placeholder-gray-500 focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs overflow-x-auto">
          <button
            onClick={() => setSelectedType(null)}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              selectedType === null
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All Events ({auditEvents.length})
          </button>
          {['COMMAND_EXEC', 'SESSION_START', 'KEY_TRUSTED', 'VAULT_UNLOCKED', 'PORT_FORWARD'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedType === t
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Events Table */}
      <div className="flex-1 overflow-y-auto bg-[#111112] border border-[#222224] rounded-xl p-4">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-[#222224] text-gray-500 text-[11px]">
              <th className="pb-3 font-medium">Timestamp</th>
              <th className="pb-3 font-medium">Event Type</th>
              <th className="pb-3 font-medium">Target Host</th>
              <th className="pb-3 font-medium">Description / Command</th>
              <th className="pb-3 font-medium">Risk Level</th>
              <th className="pb-3 text-right">Exit / Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222224]">
            {filtered.map((ev) => (
              <tr key={ev.id} className="hover:bg-[#1C1C1E] transition-colors">
                <td className="py-3 text-gray-500 whitespace-nowrap text-[11px]">
                  {new Date(ev.timestamp).toLocaleDateString()}{' '}
                  {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td className="py-3 font-semibold text-gray-200">
                  <span className="px-2 py-0.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-[10px] text-emerald-400">
                    {ev.type}
                  </span>
                </td>
                <td className="py-3 text-gray-300">
                  {ev.hostName ? (
                    <span className="flex items-center gap-1.5 text-gray-200">
                      <Server className="w-3.5 h-3.5 text-gray-500" />
                      {ev.hostName}
                    </span>
                  ) : (
                    <span className="text-gray-600">-</span>
                  )}
                </td>
                <td className="py-3 text-gray-300 max-w-md">
                  <div className="text-gray-300 line-clamp-1">{ev.description}</div>
                  {ev.command && (
                    <div className="text-[11px] text-emerald-400 font-mono line-clamp-1 bg-[#0A0A0B] border border-[#222224] px-1.5 py-0.5 rounded mt-0.5">
                      {ev.command}
                    </div>
                  )}
                </td>
                <td className="py-3">
                  {ev.riskLevel ? (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold ${
                        ev.riskLevel === 'CRITICAL'
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : ev.riskLevel === 'HIGH'
                          ? 'bg-orange-950 text-orange-300 border border-orange-800'
                          : ev.riskLevel === 'MEDIUM'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {ev.riskLevel}
                    </span>
                  ) : (
                    <span className="text-gray-600">-</span>
                  )}
                </td>
                <td className="py-3 text-right">
                  {ev.exitCode !== undefined ? (
                    <span
                      className={`text-[11px] font-bold ${
                        ev.exitCode === 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      exit: {ev.exitCode}
                    </span>
                  ) : (
                    <span className="text-gray-500 text-[11px]">OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
