import React, { useState } from 'react';
import {
  Lock,
  User,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowRight,
  UserPlus,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export const LoginView: React.FC = () => {
  const { isLight } = useTheme();
  const { requiresSetup, login, firstRunSetup } = useAuth();

  const [isSetupMode, setIsSetupMode] = useState<boolean>(requiresSetup);
  const [username, setUsername] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync mode if requiresSetup changes
  React.useEffect(() => {
    if (requiresSetup) {
      setIsSetupMode(true);
    }
  }, [requiresSetup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMessage('Please enter a username.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter a password.');
      return;
    }

    if (isSetupMode) {
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }
      const cleanDisplay = displayName.trim() || cleanUsername.charAt(0).toUpperCase() + cleanUsername.slice(1);

      setIsLoading(true);
      try {
        await firstRunSetup({
          username: cleanUsername,
          display_name: cleanDisplay,
          password,
        });
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to initialize account.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
      try {
        await login({
          username: cleanUsername,
          password,
        });
      } catch (err: any) {
        setErrorMessage(err.message || 'Invalid username or password.');
      } finally {
        setIsLoading(false);
      }
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
                AIR-GAP LOCAL
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
          {/* Card Title */}
          <div className="mb-6">
            <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
              {isSetupMode ? (
                <>
                  <UserPlus className="w-5 h-5 text-amber-500" />
                  <span>First-Run Account Setup</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-5 h-5 text-blue-500" />
                  <span>Sign In to MineIntel</span>
                </>
              )}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {isSetupMode
                ? 'Create the primary local administrator account to initialize your air-gapped repository.'
                : 'Enter your credentials to access your local workspace and intelligence models.'}
            </p>
          </div>

          {/* Error Banner */}
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
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. mine_analyst"
                  disabled={isLoading}
                  className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs font-mono border transition outline-none focus:ring-2 focus:ring-blue-500/40 ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                      : 'bg-[#182133] border-[#25324a] text-slate-100 focus:border-blue-500/60'
                  }`}
                />
              </div>
            </div>

            {isSetupMode && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Display Name / Title
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Sharma (Director - Operations)"
                    disabled={isLoading}
                    className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs border transition outline-none focus:ring-2 focus:ring-blue-500/40 ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                        : 'bg-[#182133] border-[#25324a] text-slate-100 focus:border-blue-500/60'
                    }`}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSetupMode ? 'Min 6 characters' : 'Enter password'}
                  disabled={isLoading}
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

            {isSetupMode && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    disabled={isLoading}
                    className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs font-mono border transition outline-none focus:ring-2 focus:ring-blue-500/40 ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                        : 'bg-[#182133] border-[#25324a] text-slate-100 focus:border-blue-500/60'
                    }`}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full mt-2 py-2.5 px-4 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md ${
                isSetupMode
                  ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold shadow-amber-600/20'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isSetupMode ? 'Initializing Account...' : 'Authenticating...'}</span>
                </>
              ) : (
                <>
                  <span>{isSetupMode ? 'Create Account & Sign In' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle between Login and Setup (if permitted) */}
          {!requiresSetup && (
            <div className="mt-5 pt-4 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSetupMode(!isSetupMode);
                  setErrorMessage(null);
                }}
                className="text-[11px] text-blue-400 hover:text-blue-300 transition cursor-pointer"
              >
                {isSetupMode
                  ? 'Already have an account? Sign In'
                  : 'Need to add a new local profile? Setup New Account'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Security Badges */}
      <div className="py-4 text-center text-[11px] text-slate-500 font-mono flex items-center justify-center gap-6">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          PBKDF2-HMAC-SHA256 Encrypted
        </span>
        <span>•</span>
        <span>Local OS Loopback (127.0.0.1:8765)</span>
        <span>•</span>
        <span>Zero Cloud Telemetry</span>
      </div>
    </div>
  );
};
