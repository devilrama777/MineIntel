import React, { useEffect, useState } from 'react';
import {
  Lock,
  User,
  AlertCircle,
  Loader2,
  ArrowRight,
  KeyRound,
  WifiOff,
  UserPlus,
  ChevronLeft,
  CheckCircle2,
  ShieldAlert,
  RefreshCw,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../services/authService';
import { MineIntelLogo } from '../auth/MineIntelLogo';
import { AuthInput } from '../auth/AuthInput';
import { ParticleBackground } from '../auth/ParticleBackground';
import { AnimatedCursor } from '../auth/AnimatedCursor';

export const LoginView: React.FC = () => {
  const { isLight, toggleTheme } = useTheme();
  const { authConfigStatus, login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [captchaChallengeId, setCaptchaChallengeId] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const [isCreateMode, setIsCreateMode] = useState(false);
  const [createStep, setCreateStep] = useState<'master_auth' | 'user_details'>('master_auth');
  const [masterOfficerId, setMasterOfficerId] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [newOfficerId, setNewOfficerId] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [newRole, setNewRole] = useState('Operational Auditor');
  const [createSuccessMsg, setCreateSuccessMsg] = useState<string | null>(null);

  const isUnreachable = authConfigStatus?.reachable === false;

  const refreshCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const challenge = await authService.getCaptcha();
      setCaptchaChallengeId(challenge.challenge_id);
      setCaptchaImage(challenge.image);
      setCaptchaAnswer('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to load CAPTCHA challenge.');
    } finally {
      setCaptchaLoading(false);
    }
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
    if (!cleanUsername) return setErrorMessage('Please enter Officer ID / Username.');
    if (!password) return setErrorMessage('Please enter your password.');
    if (!captchaAnswer.trim()) return setErrorMessage('Please enter the CAPTCHA code.');
    if (!captchaChallengeId) return setErrorMessage('CAPTCHA is still loading. Please try again.');

    setIsLoading(true);
    try {
      await login({
        username: cleanUsername,
        password: password.trim(),
        captcha_challenge_id: captchaChallengeId,
        captcha_answer: captchaAnswer.slice(0, 6).toUpperCase(),
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
    if (!masterOfficerId.trim()) return setErrorMessage('Please enter the Master Officer ID.');
    if (!masterPassword.trim()) return setErrorMessage('Please enter the Master Enclave Password.');
    setCreateStep('user_details');
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!newOfficerId.trim()) return setErrorMessage('Please enter Member Officer ID / Username.');
    if (newMemberPassword.trim().length < 4) return setErrorMessage('Member password must be at least 4 characters.');

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
      setUsername(newOfficerId.trim());
      setPassword('');
      resetCreateState();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create member account.');
    } finally {
      setIsLoading(false);
    }
  };

  const fieldClass = `w-full rounded-xl border px-4 py-3 text-sm font-medium outline-none transition focus:ring-2 focus:ring-blue-500/25 ${
    isLight
      ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 shadow-xs'
      : 'border-slate-800 bg-[#0c1424] text-slate-100 placeholder:text-slate-500 focus:border-blue-500/60'
  }`;

  return (
    <div
      id="mineintel-login-page"
      className={`relative flex min-h-screen w-full flex-col overflow-hidden transition-colors duration-500 ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#060a12] text-slate-100'
      }`}
    >
      <AnimatedCursor isDark={!isLight} />
      <ParticleBackground isDark={!isLight} />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="animate-float-slow absolute -left-20 -top-32 h-[550px] w-[550px] rounded-full bg-gradient-to-br from-cyan-500/15 to-blue-600/10 blur-3xl" />
        <div className="animate-float-reverse absolute -bottom-32 -right-20 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-amber-500/10 to-indigo-600/15 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 pt-8 sm:pt-12">
        <div className="hidden h-10 w-10 sm:block" />
        <div className="flex flex-1 justify-center"><MineIntelLogo size="md" /></div>
        <button
          type="button"
          onClick={toggleTheme}
          title={isLight ? 'Switch to Dark mode' : 'Switch to Light mode'}
          aria-label={isLight ? 'Switch to Dark mode' : 'Switch to Light mode'}
          className="rounded-2xl border border-slate-300/80 bg-white/90 p-2.5 text-slate-700 shadow-sm backdrop-blur-md transition hover:border-blue-400 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:text-cyan-400"
        >
          {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
        </button>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:py-10">
        <div className="w-full max-w-[460px] animate-fadeIn">
          <div className="group relative">
            <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-cyan-500/30 via-blue-500/20 to-amber-500/30 opacity-60 dark:opacity-70 blur-sm transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 p-7 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#0c1424]/95 dark:shadow-2xl dark:shadow-black/70 sm:p-9">
              {isLoading && <div className="animate-auth-progress absolute left-0 right-0 top-0 z-20 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400" role="progressbar" aria-label="Authenticating credentials" aria-busy="true" />}

              <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                  <div className="mb-1.5 flex items-center gap-3">
                    {isCreateMode ? <UserPlus className="h-5 w-5 text-blue-600 dark:text-cyan-400" /> : <KeyRound className="h-5 w-5 text-blue-600 dark:text-cyan-400" />}
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">{isCreateMode ? 'Create New User' : 'Sign In to MineIntel'}</h1>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">
                    {isCreateMode
                      ? createStep === 'master_auth' ? 'Master Officer authorization is required to provision a new account.' : 'Specify account parameters and access role for the new member.'
                      : 'Enter your authorized credentials to access the MineIntel report generator.'}
                  </p>
                </div>
                {isCreateMode && (
                  <button type="button" onClick={resetCreateState} className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-600 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-cyan-400">
                    <ChevronLeft className="h-3.5 w-3.5" /> Back
                  </button>
                )}
              </div>

              {isUnreachable && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-400 animate-fadeIn" role="alert">
                  <WifiOff className="mt-0.5 h-4 w-4 shrink-0" /><span>Unable to connect to the MineIntel backend server.</span>
                </div>
              )}
              {createSuccessMsg && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-400 animate-fadeIn" role="status">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{createSuccessMsg}</span>
                </div>
              )}
              {errorMessage && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-700 dark:text-red-400 animate-fadeIn" role="alert">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{errorMessage}</span>
                </div>
              )}

              {!isCreateMode && (
                <form onSubmit={handleLoginSubmit} className="space-y-4" id="signin-form">
                  <AuthInput id="officer-id-input" label="Officer ID / Username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username or officer ID" icon={<User className="h-4 w-4" />} autoComplete="username" autoFocus required />
                  <AuthInput id="enclave-password-input" label="Enclave Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter enclave password" icon={<Lock className="h-4 w-4" />} autoComplete="current-password" required />

                  <div className="space-y-2 pt-1" id="captcha-challenge-section">
                    <div className="flex items-center justify-between">
                      <label htmlFor="captcha-input" className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">CAPTCHA Challenge</label>
                      <button type="button" onClick={() => void refreshCaptcha()} disabled={captchaLoading || isLoading} aria-label="Refresh CAPTCHA" className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-blue-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-cyan-400"><RefreshCw className={`h-4 w-4 ${captchaLoading ? 'animate-spin' : ''}`} /></button>
                    </div>
                    <div className="flex h-14 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-300 bg-slate-100/90 shadow-inner dark:border-slate-800 dark:bg-slate-900/90">
                      {captchaImage ? (
                        <img
                          src={captchaImage}
                          alt="CAPTCHA challenge"
                          className="h-8 max-w-[60%] object-contain select-none transition-transform duration-200"
                        />
                      ) : (
                        <div className="flex h-14 items-center justify-center text-xs text-slate-500 dark:text-slate-400">Loading challenge…</div>
                      )}
                    </div>
                    <input id="captcha-input" type="text" required maxLength={6} value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value.toUpperCase().slice(0, 6))} placeholder="Enter the 6 characters shown" disabled={isLoading || captchaLoading} autoComplete="off" spellCheck={false} aria-label="CAPTCHA input" className={`${fieldClass} font-mono uppercase tracking-[0.3em] text-center`} />
                  </div>

                  <button type="submit" disabled={isLoading || isUnreachable} className="group relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:from-blue-500 hover:to-cyan-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70">
                    {!isLoading && <span className="animate-shimmer pointer-events-none absolute inset-0 h-full w-1/2 skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent" />}
                    {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : <>Sign In <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>}
                  </button>
                </form>
              )}

              {isCreateMode && createStep === 'master_auth' && (
                <form onSubmit={handleMasterAuthStep} className="space-y-4" id="master-auth-form">
                  <div className="flex items-start gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3.5 text-xs text-blue-700 dark:text-cyan-400"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>Only authorized Master Officers can provision new accounts.</span></div>
                  <AuthInput id="master-officer-id" label="Master Officer ID" value={masterOfficerId} onChange={(e) => setMasterOfficerId(e.target.value)} placeholder="Enter Master Officer ID" icon={<User className="h-4 w-4" />} autoFocus required />
                  <AuthInput id="master-password" label="Master Enclave Password" type="password" value={masterPassword} onChange={(e) => setMasterPassword(e.target.value)} placeholder="Enter Master Password" icon={<Lock className="h-4 w-4" />} required />
                  <button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:from-blue-500 hover:to-cyan-500">Authorize &amp; Proceed <ArrowRight className="h-4 w-4" /></button>
                </form>
              )}

              {isCreateMode && createStep === 'user_details' && (
                <form onSubmit={handleCreateUserSubmit} className="space-y-4" id="create-user-form">
                  <AuthInput id="new-officer-id" label="New Officer ID / Username" value={newOfficerId} onChange={(e) => setNewOfficerId(e.target.value)} placeholder="e.g. analyst_roy or MOC-1042" required />
                  <AuthInput id="new-display-name" label="Full Display Name (Optional)" value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} placeholder="e.g. Inspector R. Sharma" />
                  <AuthInput id="new-member-password" label="Initial Password" type="password" value={newMemberPassword} onChange={(e) => setNewMemberPassword(e.target.value)} placeholder="Minimum 4 characters" required />
                  <div className="space-y-1.5"><label htmlFor="new-role" className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">Assigned Enclave Role</label><select id="new-role" value={newRole} onChange={(e) => setNewRole(e.target.value)} className={fieldClass}><option value="Operational Auditor">Operational Auditor (Standard)</option><option value="Senior Compliance Analyst">Senior Compliance Analyst</option><option value="Field Inspector">Field Inspector</option><option value="Enclave Viewer">Enclave Viewer</option></select></div>
                  <div className="flex gap-3 pt-2"><button type="button" onClick={() => setCreateStep('master_auth')} disabled={isLoading} className="h-12 w-1/3 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-400 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800/50">Back</button><button type="submit" disabled={isLoading} className="flex h-12 w-2/3 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:from-blue-500 hover:to-cyan-500 disabled:opacity-60">{isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : <>Provision Account <CheckCircle2 className="h-4 w-4" /></>}</button></div>
                </form>
              )}

              {!isCreateMode && <div className="pt-2 text-center"><button type="button" onClick={() => { setIsCreateMode(true); setCreateSuccessMsg(null); setErrorMessage(null); }} className="group inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-blue-500/10 hover:text-blue-600 dark:text-slate-400 dark:hover:text-cyan-400">Create New User <Sparkles className="h-3.5 w-3.5 text-blue-600 transition group-hover:rotate-12 dark:text-cyan-400" /></button></div>}
            </div>
          </div>
        </div>
      </main>
      <footer className="relative z-10 h-4" />
    </div>
  );
};
