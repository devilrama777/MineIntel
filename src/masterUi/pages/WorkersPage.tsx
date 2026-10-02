import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  UserCheck,
  RefreshCw,
  X,
  AlertTriangle,
  Loader2,
  HardHat,
  BadgeCheck,
  CheckCircle2,
  Trash2,
  Power,
} from 'lucide-react';
import { getApiBaseUrl } from '../../shared/services/config';
import { authService } from '../../shared/services/authService';

const API_BASE = getApiBaseUrl();

interface WorkerUser {
  officer_id: string;
  display_name?: string;
  name?: string;
  role: string;
  is_active?: boolean;
  status?: string;
  created_at?: number | string;
  last_login_at?: number | string;
}

export const WorkersPage: React.FC = () => {
  const [workers, setWorkers] = useState<WorkerUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [officerId, setOfficerId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Worker' | 'Senior Officer'>('Worker');
  const [masterPassword, setMasterPassword] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const currentUser = authService.getCurrentUser();
  const masterOfficerId = currentUser?.id || currentUser?.username || 'OFFICER-HQ-01';

  const fetchWorkers = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/users?role=Worker`, {
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeader(),
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server returned ${res.status}`);
      }
      const data = await res.json();
      setWorkers(data.users || []);
    } catch (err: any) {
      setError(err.message || 'Could not load worker accounts');
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  const handleToggle = async (officerId: string, isActive: boolean) => {
    try {
      const masterUser = authService.getCurrentUser();
      if (!masterUser) return;
      const res = await fetch(`${API_BASE}/api/auth/users/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeader(),
        },
        body: JSON.stringify({
          master_officer_id: masterUser.username || masterOfficerId,
          master_password: '', // backend checks require_auth session for this
          target_officer_id: officerId,
          is_active: !isActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Status toggle failed');
      }
      await fetchWorkers(true);
    } catch (err: any) {
      console.warn('Toggle failed:', err);
      alert(err.message || 'Toggle failed');
    }
  };

  const handleDelete = async (officerId: string) => {
    if (!confirm(`Delete worker ${officerId}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${encodeURIComponent(officerId)}`, {
        method: 'DELETE',
        headers: authService.getAuthHeader(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Delete failed');
      }
      await fetchWorkers(true);
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerId.trim() || !password.trim()) {
      setModalError('Officer ID and Password are required.');
      return;
    }
    if (!masterPassword.trim()) {
      setModalError('Master Password is required to authorize account creation.');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      const payload = {
        master_officer_id: masterOfficerId,
        master_password: masterPassword.trim(),
        officer_id: officerId.trim(),
        password: password.trim(),
        display_name: displayName.trim() || officerId.trim(),
        role: role,
      };

      const res = await fetch(`${API_BASE}/api/auth/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeader(),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create worker account');
      }

      const data = await res.json();
      setIsModalOpen(false);
      setOfficerId('');
      setDisplayName('');
      setPassword('');
      setMasterPassword('');
      setSuccessToast(data.message || `Worker ${officerId} provisioned successfully.`);
      setTimeout(() => setSuccessToast(null), 5000);
      await fetchWorkers();
    } catch (err: any) {
      setModalError(err.message || 'Failed to provision worker');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <HardHat className="w-6 h-6 text-[#00D9FF]" />
              Field Personnel & Workers
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              {workers.length} Personnel
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Provision, manage, and audit field worker credentials across sovereign mining zones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchWorkers()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700/80 hover:bg-slate-800 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#00D9FF]' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => {
              setModalError(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-slate-950 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,217,255,0.25)]"
          >
            <UserPlus className="w-4 h-4" />
            Add Worker
          </button>
        </div>
      </div>

      {/* Success banner */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Workers Grid */}
      {isLoading && workers.length === 0 ? (
        <div className="mine-card p-12 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#00D9FF] animate-spin mb-3" />
          <p className="text-xs font-mono text-slate-400">Loading worker directory...</p>
        </div>
      ) : workers.length === 0 ? (
        <div className="mine-card p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00D9FF] mb-4 shadow-[0_0_20px_rgba(0,217,255,0.15)]">
            <Users className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-semibold text-white">No workers yet. Add one to begin.</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Create field worker credentials so officers can ingest raw logs, generate draft reports, and submit them for review.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-slate-950 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Provision First Worker
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers.map((worker) => {
            const name = worker.display_name || worker.name || worker.officer_id;
            const isActive = worker.is_active !== false && worker.status !== 'Disabled';

            return (
              <div
                key={worker.officer_id}
                className="mine-card p-5 border border-slate-800/80 hover:border-[#00D9FF]/30 transition-all relative group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold font-mono text-sm group-hover:border-[#00D9FF]/50 transition-colors">
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                        isActive
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                          : 'bg-red-500/10 border border-red-500/30 text-red-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      {isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-white group-hover:text-[#00D9FF] transition-colors truncate">
                    {name}
                  </h3>
                  <div className="font-mono text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-500" />
                    <span>ID: {worker.officer_id}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="inline-flex items-center gap-1 text-cyan-300 font-semibold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                    <BadgeCheck className="w-3 h-3 text-[#00D9FF]" />
                    {worker.role || 'Worker'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggle(worker.officer_id, isActive)}
                      className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                        isActive
                          ? 'border-amber-500/30 text-amber-400 hover:bg-amber-950/30'
                          : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/30'
                      }`}
                      title={isActive ? 'Disable Worker' : 'Activate Worker'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(worker.officer_id)}
                      className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-950/30 text-xs transition-colors cursor-pointer"
                      title="Delete Worker"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Worker Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#070b14] border border-slate-800 rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#00D9FF]" />
                <h3 className="font-bold text-base text-white">Provision New Worker</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateWorker} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Officer ID <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WORKER-ECL-04"
                  value={officerId}
                  onChange={(e) => setOfficerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00D9FF] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Kumar"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00D9FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Worker Password <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Set worker login password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00D9FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assigned Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00D9FF]"
                >
                  <option value="Worker">Worker (Field Operations)</option>
                  <option value="Senior Officer">Senior Officer (Master Console)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  Master Authorization Password <span className="text-red-400">*</span>
                </label>
                <p className="text-[11px] text-slate-400 mb-1.5">
                  Authorizing as: <span className="font-mono text-cyan-300">{masterOfficerId}</span>
                </p>
                <input
                  type="password"
                  required
                  placeholder="Enter your Master Enclave Password"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-amber-500/40 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-slate-950 transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5" />
                  )}
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
