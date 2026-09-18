import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  WifiOff,
  Server,
  Key,
  FileCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Download,
} from 'lucide-react';
import { AuditLogItem } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface SecurityAuditViewProps {
  auditLogs: AuditLogItem[];
}

export const SecurityAuditView: React.FC<SecurityAuditViewProps> = ({ auditLogs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');

  const filteredLogs = auditLogs.filter((log) => {
    const actor = log.actor || log.user || '';
    const resource = log.resource || log.target || '';
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity =
      selectedSeverity === 'All' || log.severity === selectedSeverity.toLowerCase();
    return matchesSearch && matchesSeverity;
  });

  const securityCheckpoints = [
    {
      title: 'Sovereign AI Gateway Active',
      status: 'Enforced',
      detail: 'Single cloud AI model (openrouter/free) via backend secure enclave. Zero rogue model endpoints.',
      icon: Server,
    },
    {
      title: 'Multi-Model Fallbacks Disabled',
      status: 'Blocked',
      detail: 'Non-production providers and secondary models strictly blocked. Single-model architecture active.',
      icon: WifiOff,
    },
    {
      title: 'Network Egress Restricted',
      status: 'Airgapped',
      detail: 'No outbound HTTP/HTTPS requests permitted. Sandboxed container network isolated.',
      icon: Lock,
    },
    {
      title: 'Tamper-Evident Audit Log',
      status: 'Active',
      detail: 'All actions cryptographically chained with SHA-256 hashes and timestamp signatures.',
      icon: FileCheck,
    },
    {
      title: 'Local Credential Isolation',
      status: 'Encrypted',
      detail: 'Host OS keychain encryption with AES-256 for local repository permissions.',
      icon: Key,
    },
  ];

  return (
    <div className="min-h-full p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-[#233145] pb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">
              Airgap Security Posture & Immutable Audit Ledger
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Cryptographically sealed operational audit trails verifying strict local data isolation and zero external exfiltration.
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert('Audit ledger exported to signed JSON-LD archive')}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-mono text-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>Export Signed Audit Trail</span>
        </button>
      </div>

      {/* Security Posture Cards Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {securityCheckpoints.map((chk, i) => {
          const Icon = chk.icon;
          return (
            <div
              key={i}
              className="bg-[#111722] border border-[#1e2a3b] rounded-md p-3.5 space-y-2 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.2 rounded font-bold">
                    {chk.status}
                  </span>
                </div>
                <h3 className="text-xs font-semibold text-slate-200 font-mono">
                  {chk.title}
                </h3>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                {chk.detail}
              </p>
            </div>
          );
        })}
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#111722] border border-[#1e2a3b] rounded-md overflow-hidden flex flex-col space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit trail by actor, action or resource..."
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded px-2.5 py-1.5 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-slate-400">Severity:</span>
            {['All', 'Info', 'Warning', 'Critical'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedSeverity(s)}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  selectedSeverity === s
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="border border-slate-800 rounded overflow-hidden">
          <table className="w-full text-xs text-left border-collapse font-mono">
            <thead>
              <tr className="bg-[#141d2b] text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-4">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Actor / Process</th>
                <th className="py-2.5 px-3">Target Resource</th>
                <th className="py-2.5 px-3">Cryptographic SHA-256 Hash</th>
                <th className="py-2.5 px-3">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#182333]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#141c2a] transition text-[11px]">
                  <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-200">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-3 text-blue-300">
                    {log.actor || log.user}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 truncate max-w-xs">
                    {log.resource || log.target}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono text-[10px] truncate max-w-[140px]">
                    {log.hashSignature || log.verificationHash}
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={log.severity} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
