import React, { useEffect, useState } from 'react';
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
  ChevronLeft,
  CheckCircle2,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../services/authService';

export const LoginView: React.FC = () => {
  const { isLight } = useTheme();
  const { authConfigStatus, login } = useAuth();

  // Login form state
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [captchaChallengeId, setCaptchaChallengeId] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

  // "Create New User" workflow state
  const [isCreateMode, setIsCreateMode] = useState<boolean>(false);
  const [createStep, setCreateStep] = useState<'master_auth' | 'user_details'>('master_auth');
  
  // Master credentials for authorization
  const [masterOfficerId, setMasterOfficerId] = useState<string>('');
  const [masterPassword, setMasterPassword] = useState<string>('');
  const [showMasterPassword, setShowMasterPassword] = useState<boolean>(false);

  // New member fields
  const [newOfficerId, setNewOfficerId] = useState<string>('');
  const [newDisplayName, setNewDisplayName] = useState<string>('');
  const [newMemberPassword, setNewMemberPassword] = useState<string>('');
  const [showMemberPassword, setShowMemberPassword] = useState<boolean>(false);
  const [newRole, setNewRole] = useState<string>('Operational Auditor');

  const [createSuccessMsg, setCreateSuccessMsg] = useState<string | null>(null);

  const isUnreachable = authConfigStatus.reachable === false;
  const isUnconfigured = authConfigStatus.configured === false;

  const refreshCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const challenge = await authService.getCaptcha();
      setCaptchaChallengeId(challenge.challenge_id);
      setCaptchaImage(challenge.image);
      setCaptchaAnswer('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to load CAPTCHA challenge.');
    } finally { setCaptchaLoading(false); }
  };

  useEffect(() => {
    if (!isCreateMode) void refreshCaptcha();
  }, [isCreateMode]);

  const resetCreateState = () => {
    setIsCreateMode(false);
    setCreateStep('master_auth');
    setMasterOfficerId('');
    setMasterPassword('');
    setNewOfficerId('');
    setNewDisplayName('');
    setNewMemberPassword('');
    setNewRole('Operational Auditor');
    setErrorMessage(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMessage('Please enter Officer ID / Username.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }
    if (!captchaAnswer.trim()) {
      setErrorMessage('Please enter the CAPTCHA code.');
      return;
    }

    setIsLoading(true);
    try {
      await login({
        username: cleanUsername,
        password: password.trim(),
        captcha_challenge_id: captchaChallengeId,
        captcha_answer: captchaAnswer,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify your credentials.');
      void refreshCaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  const handleMasterAuthStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!masterOfficerId.trim()) {
      setErrorMessage('Please enter the Master Officer ID.');
      return;
    }
    if (!masterPassword.trim()) {
      setErrorMessage('Please enter the Master Enclave Password.');
      return;
    }
    // Proceed to details step where master credentials will be transmitted together securely
    setCreateStep('user_details');
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newOfficerId.trim()) {
      setErrorMessage('Please enter Member Officer ID / Username.');
      return;
    }
    if (newMemberPassword.trim().length < 4) {
      setErrorMessage('Member password must be at least 4 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.createUser({
        master_officer_id: masterOfficerId.trim(),
        master_password: masterPassword.trim(),
        officer_id: newOfficerId.trim(),
        password: newMemberPassword.trim(),
        display_name: newDisplayName.trim() || newOfficerId.trim(),
        role: newRole,
      });

      setCreateSuccessMsg(res.message || `Member '${newOfficerId}' successfully created.`);
      // Pre-fill login username
      setUsername(newOfficerId.trim());
      setPassword('');
      resetCreateState();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create member account.');
    } finally {
      setIsLoading(false);
    }
  };

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
          {/* Card Header */}
          {!isCreateMode ? (
            <div className="mb-6">
              <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-500" />
                <span>Sign In to MineIntel</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Enter your authorized credentials to access the sovereign intelligence platform.
              </p>
            </div>
          ) : (
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-500" />
                  <span>Create New User</span>
                </h1>
                <button
                  type="button"
                  onClick={resetCreateState}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {createStep === 'master_auth'
                  ? 'Master Officer credentials are required to authorize user provisioning.'
                  : 'Specify account parameters and access role for the new member.'}
              </p>
            </div>
          )}

          {/* Backend Service Unreachable Notice */}
          {isUnreachable && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2 animate-fadeIn">
              <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Backend Service Unreachable</div>
                <div className="mt-0.5 text-[11px] opacity-90">
                  Unable to connect to the MineIntel backend server. Please verify the backend is running.
                </div>
              </div>
            </div>
          )}

          {/* Success Notification */}
          {createSuccessMsg && (
            <div className="mb-5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{createSuccessMsg}</span>
            </div>
          )}

          {/* Dynamic Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* MAIN LOGIN FORM */}
          {!isCreateMode && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Officer ID / Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter Officer ID or Username"
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
                  Enclave Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Enclave Password"
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

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">CAPTCHA CHALLENGE</label>
                <div className="flex items-center gap-2">
                  {captchaImage ? <img src={captchaImage} alt="CAPTCHA challenge" className="h-[52px] w-[166px] rounded border border-slate-600 bg-slate-100" /> : <div className="h-[52px] w-[166px] rounded border border-slate-700 flex items-center justify-center text-[10px] text-slate-500">Loading challenge…</div>}
                  <button type="button" onClick={() => void refreshCaptcha()} disabled={captchaLoading || isLoading} aria-label="Refresh CAPTCHA" className="p-2 rounded border border-slate-700 text-slate-400 hover:text-blue-400 hover:border-blue-500 disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${captchaLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <input type="text" required maxLength={6} value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value.slice(0, 6).toUpperCase())} placeholder="Enter the characters shown" disabled={isLoading || captchaLoading} autoComplete="off" aria-label="CAPTCHA input" className={`mt-2 w-full px-3 py-2 rounded-lg text-xs font-mono border transition outline-none focus:ring-2 focus:ring-blue-500/40 ${isLight ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' : 'bg-[#182133] border-[#25324a] text-slate-100 focus:border-blue-500/60'}`} />
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
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Create New User Prompt */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateMode(true);
                    setCreateSuccessMsg(null);
                    setErrorMessage(null);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium transition cursor-pointer"
                >
                  Create New User
                </button>
              </div>
            </form>
          )}

          {/* CREATE NEW USER FLOW: STEP 1 - MASTER AUTHENTICATION */}
          {isCreateMode && createStep === 'master_auth' && (
            <form onSubmit={handleMasterAuthStep} className="space-y-4">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Only authorized Master Officers can provision new accounts.</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Master Officer ID
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={masterOfficerId}
                    onChange={(e) => setMasterOfficerId(e.target.value)}
                    placeholder="Enter Master Officer ID"
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
                  Master Enclave Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showMasterPassword ? 'text' : 'password'}
                    required
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Enter Master Password"
                    className={`w-full pl-9 pr-10 py-2 rounded-lg text-xs font-mono border transition outline-none focus:ring-2 focus:ring-blue-500/40 ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                        : 'bg-[#182133] border-[#25324a] text-slate-100 focus:border-blue-500/60'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowMasterPassword(!showMasterPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showMasterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 px-4 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20"
              >
                <span>Authorize & Proceed</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* CREATE NEW USER FLOW: STEP 2 - MEMBER DETAILS */}
          {isCreateMode && createStep === 'user_details' && (
            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  New Officer ID / Username
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newOfficerId}
                  onChange={(e) => setNewOfficerId(e.target.value)}
                  placeholder="e.g. analyst_roy or MOC-1042"
                  disabled={isLoading}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-mono border transition outline-none focus:ring-2 focus:ring-blue-500/40 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                      : 'bg-[#182133] border-[#25324a] text-slate-100 focus:border-blue-500/60'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Full Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Inspector R. Sharma"
                  disabled={isLoading}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-mono border transition outline-none focus:ring-2 focus:ring-blue-500/40 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                      : 'bg-[#182133] border-[#25324a] text-slate-100 focus:border-blue-500/60'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Initial Password
                </label>
                <div className="relative">
                  <input
                    type={showMemberPassword ? 'text' : 'password'}
                    required
                    value={newMemberPassword}
                    onChange={(e) => setNewMemberPassword(e.target.value)}
                    placeholder="Minimum 4 characters"
                    disabled={isLoading}
                    className={`w-full pl-3 pr-10 py-2 rounded-lg text-xs font-mono border transition outline-none focus:ring-2 focus:ring-blue-500/40 ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                        : 'bg-[#182133] border-[#25324a] text-slate-100 focus:border-blue-500/60'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowMemberPassword(!showMemberPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showMemberPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Assigned Enclave Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  disabled={isLoading}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-mono border transition outline-none focus:ring-2 focus:ring-blue-500/40 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900'
                      : 'bg-[#182133] border-[#25324a] text-slate-100'
                  }`}
                >
                  <option value="Operational Auditor">Operational Auditor (Standard)</option>
                  <option value="Senior Compliance Analyst">Senior Compliance Analyst</option>
                  <option value="Field Inspector">Field Inspector</option>
                  <option value="Enclave Viewer">Enclave Viewer</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateStep('master_auth')}
                  disabled={isLoading}
                  className="w-1/3 py-2.5 px-3 rounded-lg font-medium text-xs border border-slate-700 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-2/3 py-2.5 px-4 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <span>Provision Account</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
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
