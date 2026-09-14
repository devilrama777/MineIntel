import React, { useState, useEffect, useCallback } from 'react';
import {
  Key,
  User,
  Lock,
  ArrowRight,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { MineIntelLogo } from './components/MineIntelLogo';
import { AuthInput } from './components/AuthInput';
import { CaptchaBox } from './components/CaptchaBox';
import { RegisterForm } from './components/RegisterForm';
import { ForgotPasswordModal } from './components/ForgotPasswordModal';
import { ParticleBackground } from './components/ParticleBackground';
import { AnimatedCursor } from './components/AnimatedCursor';
import { ConfettiEffect } from './components/ConfettiEffect';
import { RememberMeCheckbox } from './components/RememberMeCheckbox';
import { AuthSuccessToast } from './components/AuthSuccessToast';

export default function App() {
  // Theme state: dark / light
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mineintel-theme');
      if (saved) return saved === 'dark';
    }
    return true;
  });

  // Apply dark class to html document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('mineintel-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('mineintel-theme', 'light');
    }
  }, [isDark]);

  // Form input state
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mineintel-remember-me');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const [officerId, setOfficerId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mineintel-saved-officer');
      if (saved) return saved;
    }
    return 'mine_analyst2';
  });
  const [password, setPassword] = useState('Enclave#Secure2026');
  const [captchaInput, setCaptchaInput] = useState('');
  const [currentCaptchaCode, setCurrentCaptchaCode] = useState('');

  // UI state
  const [view, setView] = useState<'signin' | 'register'>('signin');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [authStatus, setAuthStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });

  // CAPTCHA verification
  const isCaptchaMatch =
    captchaInput.trim().toUpperCase() === currentCaptchaCode.trim().toUpperCase() &&
    currentCaptchaCode.length > 0;

  const handleCaptchaGenerated = useCallback((code: string) => {
    setCurrentCaptchaCode(code);
    setCaptchaInput('');
    setAuthStatus({ type: 'idle' });
  }, []);

  // Global keyboard shortcuts: Esc to close modal, dismiss errors, or return to sign-in view
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isForgotModalOpen) {
          e.preventDefault();
          setIsForgotModalOpen(false);
        } else if (view === 'register') {
          e.preventDefault();
          setView('signin');
        } else if (authStatus.type !== 'idle') {
          setAuthStatus({ type: 'idle' });
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isForgotModalOpen, view, authStatus.type]);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthStatus({ type: 'idle' });

    if (!officerId.trim()) {
      setAuthStatus({
        type: 'error',
        message: 'Please enter your Officer ID / Username.',
      });
      return;
    }

    if (!password.trim()) {
      setAuthStatus({
        type: 'error',
        message: 'Please enter your Enclave Password.',
      });
      return;
    }

    if (!captchaInput.trim()) {
      setAuthStatus({
        type: 'error',
        message: 'Please enter the CAPTCHA characters.',
      });
      return;
    }

    if (!isCaptchaMatch) {
      setAuthStatus({
        type: 'error',
        message: 'Incorrect CAPTCHA challenge. Please try again.',
      });
      return;
    }

    setIsLoading(true);
    setShowConfetti(false);
    setShowToast(false);

    if (rememberMe) {
      localStorage.setItem('mineintel-remember-me', 'true');
      localStorage.setItem('mineintel-saved-officer', officerId);
    } else {
      localStorage.setItem('mineintel-remember-me', 'false');
      localStorage.removeItem('mineintel-saved-officer');
    }

    setTimeout(() => {
      setIsLoading(false);
      setAuthStatus({
        type: 'success',
        message: 'Credentials verified. Access granted.',
      });
      setShowConfetti(true);
      setShowToast(true);
    }, 1000);
  };

  return (
    <div
      className="min-h-screen w-full bg-slate-50 dark:bg-[#060a12] text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-blue-500/20 selection:text-blue-600 transition-colors duration-500 relative font-sans overflow-hidden"
      id="mineintel-login-page"
    >
      {/* High-tech animated cursor theme */}
      <AnimatedCursor isDark={isDark} />

      {/* Subtle particle confetti on successful login */}
      <ConfettiEffect active={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Interactive animated constellation / particle canvas */}
      <ParticleBackground isDark={isDark} />

      {/* Floating ambient colored gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-20 w-[550px] h-[550px] bg-gradient-to-br from-cyan-500/15 to-blue-600/10 dark:from-cyan-500/10 dark:to-blue-600/15 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute -bottom-32 -right-20 w-[500px] h-[500px] bg-gradient-to-tr from-amber-500/10 to-indigo-600/15 dark:from-amber-500/10 dark:to-blue-700/15 rounded-full blur-3xl animate-float-reverse" />
      </div>

      {/* Top Bar: Brand Logo Centered + Light/Dark Mode Switch in Corner */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-8 sm:pt-12 flex items-center justify-between">
        {/* Invisible spacer to keep logo perfectly centered */}
        <div className="w-10 h-10 hidden sm:block" />

        {/* Logo and Name placed upper side as requested */}
        <div className="flex-1 flex justify-center">
          <MineIntelLogo size="md" />
        </div>

        {/* Theme Toggle (Working Light & Dark mode) */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            id="btn-toggle-theme"
            title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
            className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400 shadow-sm hover:shadow transition-all duration-200 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-10">
        <div className="w-full max-w-[460px] mx-auto animate-fadeIn">
          {/* Outer glowing border wrapper for modern look */}
          <div className="relative group">
            <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-cyan-500/30 via-blue-500/20 to-amber-500/30 opacity-70 blur-xs transition-all duration-500 group-hover:opacity-100" />

            <div
              className="relative rounded-3xl bg-white/95 dark:bg-[#0c1424]/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl shadow-slate-900/10 dark:shadow-black/70 p-7 sm:p-9 transition-colors duration-300 overflow-hidden"
              id="auth-card"
            >
              {/* Subtle animated horizontal progress bar at very top during authentication delay */}
              {isLoading && (
                <div
                  className="absolute top-0 left-0 right-0 h-1 bg-slate-200/50 dark:bg-slate-800/60 overflow-hidden z-20"
                  id="auth-progress-bar"
                  role="progressbar"
                  aria-label="Authenticating credentials"
                  aria-busy="true"
                >
                  <div className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 shadow-[0_0_12px_rgba(56,189,248,0.7)] animate-auth-progress relative">
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/75 blur-[0.5px]" />
                  </div>
                </div>
              )}

              {view === 'register' ? (
                <RegisterForm onBackToSignIn={() => setView('signin')} isDark={isDark} />
              ) : (
                <div className="space-y-6" id="signin-view">
                  {/* Header matching original text & key icon */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/15 to-cyan-500/15 dark:from-blue-500/20 dark:to-cyan-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-cyan-400 shrink-0 shadow-xs"
                        id="card-header-icon"
                      >
                        <Key className="w-5 h-5" />
                      </div>
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Sign In to MineIntel
                      </h1>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed pt-0.5">
                      Enter your authorized credentials to access the MineIntel report generator.
                    </p>
                  </div>

                  {/* Status feedback */}
                  {authStatus.type === 'error' && (
                    <div
                      className="p-3.5 rounded-xl bg-red-50/90 dark:bg-red-950/50 border border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5 animate-fadeIn shadow-xs"
                      role="alert"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-500 dark:text-red-400" />
                      <span>{authStatus.message}</span>
                    </div>
                  )}

                  {authStatus.type === 'success' && (
                    <div
                      className="p-3.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn shadow-xs"
                      role="status"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>{authStatus.message}</span>
                    </div>
                  )}

                  {/* Form fields */}
                  <form onSubmit={handleSignIn} className="space-y-4" id="signin-form">
                    <AuthInput
                      id="officer-id-input"
                      label="Officer ID / Username"
                      type="text"
                      value={officerId}
                      onChange={(e) => setOfficerId(e.target.value)}
                      placeholder="Enter username or officer ID"
                      icon={<User className="w-4 h-4" />}
                      autoComplete="username"
                      required
                    />

                    <AuthInput
                      id="enclave-password-input"
                      label="Enclave Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      icon={<Lock className="w-4 h-4" />}
                      rightLink={{
                        text: 'Forgot password?',
                        onClick: () => setIsForgotModalOpen(true),
                      }}
                      autoComplete="current-password"
                      required
                    />

                    <CaptchaBox
                      value={captchaInput}
                      onChange={(val) => {
                        setCaptchaInput(val);
                        if (authStatus.type === 'error') setAuthStatus({ type: 'idle' });
                      }}
                      onCodeGenerated={handleCaptchaGenerated}
                      isValid={isCaptchaMatch ? true : null}
                      isDark={isDark}
                    />

                    {/* Remember Me Checkbox - Placed below Captcha */}
                    <RememberMeCheckbox
                      id="remember-me-checkbox"
                      checked={rememberMe}
                      onChange={setRememberMe}
                      label="Remember me"
                    />

                    {/* Animated High-Craft Sign In Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      id="btn-signin-submit"
                      className={`relative w-full h-12 mt-2 rounded-xl text-white font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-70 focus:outline-none focus:ring-2 overflow-hidden ${
                        authStatus.type === 'success'
                          ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/35 ring-2 ring-emerald-400/60 animate-success-pulse'
                          : 'bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 active:scale-[0.99] shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 focus:ring-blue-500/50'
                      }`}
                    >
                      {/* Animated light shimmer beam */}
                      {!isLoading && authStatus.type !== 'success' && (
                        <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-shimmer pointer-events-none" />
                      )}

                      {isLoading ? (
                        <span className="inline-flex items-center gap-2 relative z-10">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Signing in...</span>
                        </span>
                      ) : authStatus.type === 'success' ? (
                        <span className="inline-flex items-center gap-2 relative z-10">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>Access Granted</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 relative z-10">
                          <span>Sign In</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      )}
                    </button>
                  </form>

                  {/* Create New User */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setView('register')}
                      id="btn-goto-create-user"
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-cyan-400 transition-colors py-1.5 px-3 rounded-xl hover:bg-blue-500/10 cursor-pointer group"
                    >
                      <span>Create New User</span>
                      <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-cyan-400 group-hover:rotate-12 transition-transform" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Clean bottom space without extra footer lines as requested */}
      <footer className="relative z-10 w-full py-4 text-center">
        {/* Kept empty and clean as requested */}
      </footer>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        defaultOfficerId={officerId}
      />

      {/* Slide-in Top-Right Notification Toast on Successful Authentication */}
      <AuthSuccessToast
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        officerId={officerId}
      />
    </div>
  );
}
