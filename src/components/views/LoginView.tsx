import React, { useState } from 'react';
import {
  Lock,
  User,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
  KeyRound,
  Eye,
  EyeOff,
  WifiOff,
  UserPlus,
  ShieldAlert,
  Users,
  UserCheck,
  ChevronLeft,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export type AuthRole = 'MASTER_ADMIN' | 'NORMAL_USER';

export const LoginView: React.FC = () => {
  const { isLight } = useTheme();
  const { authConfigStatus, login } = useAuth();

  const [selectedRole, setSelectedRole] = useState<AuthRole>('MASTER_ADMIN');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // "Create New User" workflow state
  const [isCreateUserFlow, setIsCreateUserFlow] = useState<boolean>(false);
  const [masterAuthSuccess, setMasterAuthSuccess] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('Operational Auditor');
  const [newPassword, setNewPassword] = useState<string>('');
  const [createUserNotice, setCreateUserNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMessage(
        selectedRole === 'MASTER_ADMIN'
          ? 'Please enter Master Officer ID.'
          : 'Please enter your assigned Username.'
      );
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      if (selectedRole === 'NORMAL_USER') {
        // Attempt login via existing backend endpoint
        try {
          await login({
            username: cleanUsername,
            password,
          });
        } catch (err: any) {
          // Truthful response: backend does not yet have persistent multi-user database
          setErrorMessage(
            err.message ||
              'Normal User authentication rejected: Dedicated member accounts require the backend persistent user database. Please sign in using Master / Admin credentials.'
          );
        }
      } else {
        // Master / Admin login using existing backend API
        await login({
          username: cleanUsername,
          password,
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMasterAuthForCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    try {
      // Authenticate master officer against existing backend API
      await login({
        username: username.trim(),
        password,
      });
      setMasterAuthSuccess(true);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Master authorization failed: Invalid Officer ID or Enclave Password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUserAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    // Do NOT invent frontend-only user creation. Report truthful backend status.
    setCreateUserNotice(
      'Backend User Management Service Required: Persistent user tables, password hashing, and role assignment endpoints are not yet implemented in backend/. In accordance with strict immutability, client-side mock databases (localStorage) are prohibited.'
    );
  };

  const isUnconfigured = authConfigStatus?.configured === false;
  const isUnreachable = authConfigStatus?.reachable === false;

  return (
    <div
      className={`min-h-screen w-full flex flex-col justify-between select-none transition-colors ${
        isLight ? 'bg-slate-100 text-slate-800' : 'bg-[#0a0e17] text-slate-100'
      }`}
    >
      {/* Top Brand Banner */}
      <div className="pt-8 pb-4 flex flex-col items-center justify-center">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center p-1.5 shadow-lg border ${
              isLight
                ? 'bg-white border-slate-200 shadow-slate-200/50'
                : 'bg-[#111726] border-[#233145] shadow-black/40'
            }`}
          >
            <img src="/logo.png" alt="MineIntel" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight">MineIntel</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                ENTERPRISE ENCLAVE
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Enterprise Statutory Report Intelligence
            </div>
          </div>
        </div>
      </div>

      {/* Center Auth Card */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div
          className={`w-full max-w-md rounded-2xl border p-7 shadow-2xl transition-colors ${
            isLight
              ? 'bg-white border-slate-200 shadow-slate-200/50'
              : 'bg-[#111726] border-[#1e293b] shadow-black/40'
          }`}
        >
          {!isCreateUserFlow ? (
            <>
              {/* Card Title & Role Selector */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-blue-500" />
                    <span>Sign In to MineIntel</span>
                  </h1>
                </div>

                {/* Role Switcher */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-black/20 border border-slate-700/50 rounded-lg mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('MASTER_ADMIN');
                      setErrorMessage(null);
                    }}
                    className={`py-1.5 px-3 rounded-md text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      selectedRole === 'MASTER_ADMIN'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>MASTER / ADMIN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('NORMAL_USER');
                      setErrorMessage(null);
                    }}
                    className={`py-1.5 px-3 rounded-md text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      selectedRole === 'NORMAL_USER'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>NORMAL USER</span>
                  </button>
                </div>

                <p className="text-xs text-slate-400">
                  {selectedRole === 'MASTER_ADMIN'
                    ? 'Authenticate using sovereign officer credentials provisioned via MINEINTEL_OFFICER_ID and MINEINTEL_AUTH_PASSWORD.'
                    : 'Sign in with assigned analyst or auditor member profile credentials.'}
                </p>
              </div>

              {/* Backend Connectivity Notice */}
              {isUnreachable && (
                <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2 animate-fadeIn">
                  <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Backend Service Unreachable</div>
                    <div className="mt-0.5 text-[11px] opacity-90">
                      Unable to connect to the MineIntel backend server. Please ensure the backend is running and accessible.
                    </div>
                  </div>
                </div>
              )}

              {/* Unconfigured Configuration Notice */}
              {isUnconfigured && !isUnreachable && (
                <div className="mb-5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-start gap-2 animate-fadeIn">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Authentication Not Configured</div>
                    <div className="mt-0.5 text-[11px] opacity-90">
                      Master officer credentials must be configured in the host environment via{' '}
                      <code className="px-1 py-0.5 rounded bg-black/30 font-mono text-[10px]">MINEINTEL_OFFICER_ID</code>{' '}
                      and{' '}
                      <code className="px-1 py-0.5 rounded bg-black/30 font-mono text-[10px]">MINEINTEL_AUTH_PASSWORD</code>{' '}
                      environment variables.
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Error Banner */}
              {errorMessage && (
                <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    {selectedRole === 'MASTER_ADMIN' ? 'Master Officer ID' : 'Username'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      autoFocus
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={
                        selectedRole === 'MASTER_ADMIN'
                          ? 'Enter Officer Employee ID'
                          : 'Enter assigned username'
                      }
                      disabled={isLoading}
                      autoComplete="username"
                      className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs font-mono border transition outline-none focus:ring-2 focus:ring-blue-500/40 ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                          : 'bg-[#182133] border-[#25324a] text-slate-100 focus:border-blue-500/60'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    {selectedRole === 'MASTER_ADMIN' ? 'Enclave Password' : 'Password'}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter Password"
                      disabled={isLoading}
                      autoComplete="current-password"
                      className={`w-full pl-9 pr-10 py-2 rounded-lg text-xs font-mono border transition outline-none focus:ring-2 focus:ring-blue-500/40 ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                          : 'bg-[#182133] border-[#25324a] text-slate-100 focus:border-blue-500/60'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isUnreachable}
                  className="w-full mt-2 py-2.5 px-4 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>{selectedRole === 'MASTER_ADMIN' ? 'Sign In as Master' : 'Sign In as Normal User'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Create New User Entrypoint */}
              <div className="mt-5 pt-4 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateUserFlow(true);
                    setErrorMessage(null);
                    setCreateUserNotice(null);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 transition cursor-pointer flex items-center justify-center gap-1.5 mx-auto font-mono"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create New User (Master Required)</span>
                </button>
              </div>
            </>
          ) : (
            /* Create New User & Member Management Preparation View */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateUserFlow(false);
                    setErrorMessage(null);
                    setCreateUserNotice(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer font-mono"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded">
                  Member Management Gate
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-400" />
                  <span>Create New User</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Master Administrator authorization is required to provision, assign roles, or manage member profiles.
                </p>
              </div>

              {/* Workflow Representation */}
              <div className="p-2.5 bg-black/25 border border-slate-800 rounded text-[10px] font-mono text-slate-400 space-y-1">
                <div className="text-slate-300 font-semibold">Intended Architecture:</div>
                <div className="text-blue-400">
                  Login Screen → Create New User → Master Auth → Member Management → Create Normal User → Assign Role → Secure User Storage
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {createUserNotice && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{createUserNotice}</span>
                </div>
              )}

              {!masterAuthSuccess ? (
                /* Step 1: Master Authentication Gate */
                <form onSubmit={handleMasterAuthForCreateUser} className="space-y-3">
                  <div className="text-xs text-slate-300 font-medium">
                    Step 1: Authenticate with Master Credentials
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Master Officer ID
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter Master Officer ID"
                      disabled={isLoading}
                      className="w-full px-3 py-1.5 rounded text-xs font-mono border bg-[#182133] border-[#25324a] text-slate-100 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Master Enclave Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter Enclave Password"
                      disabled={isLoading}
                      className="w-full px-3 py-1.5 rounded text-xs font-mono border bg-[#182133] border-[#25324a] text-slate-100 outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2 px-4 rounded text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>Verify Master Authorization</span>
                  </button>
                </form>
              ) : (
                /* Step 2: Member Creation Form (Truthfully reports backend capability gap upon submit) */
                <form onSubmit={handleCreateUserAttempt} className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Master Authorization Verified</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      New Username
                    </label>
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="e.g. analyst_john"
                      className="w-full px-3 py-1.5 rounded text-xs font-mono border bg-[#182133] border-[#25324a] text-slate-100 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Assign Role
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="w-full px-3 py-1.5 rounded text-xs font-mono border bg-[#182133] border-[#25324a] text-slate-100 outline-none focus:border-blue-500"
                    >
                      <option value="Operational Auditor">Operational Auditor (Read / Audit / Export)</option>
                      <option value="Mining Analyst">Mining Analyst (Full Synthesis / Upload / Edit)</option>
                      <option value="Inspector General">Inspector General (Compliance Sign-off)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Initial Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full px-3 py-1.5 rounded text-xs font-mono border bg-[#182133] border-[#25324a] text-slate-100 outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 px-4 rounded text-xs font-medium bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create Normal User</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Security Badges */}
      <div className="py-4 text-center text-[11px] text-slate-500 font-mono flex items-center justify-center gap-6">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          PBKDF2-HMAC-SHA256 Encrypted Session
        </span>
        <span>•</span>
        <span>Sovereign Enclave Active</span>
        <span>•</span>
        <span>Statutory Intelligence Engine</span>
      </div>
    </div>
  );
};
