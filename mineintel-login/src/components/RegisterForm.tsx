import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, ShieldAlert, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AuthInput } from './AuthInput';

interface RegisterFormProps {
  onBackToSignIn: () => void;
  isDark?: boolean;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onBackToSignIn }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    officerId: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onBackToSignIn();
      } else if (e.key === 'Enter' && submitted) {
        e.preventDefault();
        onBackToSignIn();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitted, onBackToSignIn]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.officerId.trim() || !formData.password.trim() || !formData.email.trim()) {
      setError('All fields are required.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <div className="w-full" id="register-officer-section">
      <div className="mb-6">
        <button
          type="button"
          onClick={onBackToSignIn}
          id="btn-back-to-signin"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-cyan-400 transition-colors mb-3 group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Sign In</span>
        </button>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <span>Create New User</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          Create credentials to access the MineIntel platform.
        </p>
      </div>

      {submitted ? (
        <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 text-center space-y-4 animate-fadeIn">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">User Created</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Officer ID <span className="font-mono font-semibold text-blue-600 dark:text-cyan-400">{formData.officerId}</span> has been set up successfully.
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToSignIn}
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all duration-200 cursor-pointer shadow-sm"
          >
            Return to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" id="form-register">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-500 dark:text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <AuthInput
            id="register-fullname"
            label="Full Name"
            placeholder="e.g., Marcus Vance"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            icon={<User className="w-4 h-4" />}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <AuthInput
              id="register-officer-id"
              label="Officer ID / Username"
              placeholder="e.g., mine_analyst3"
              value={formData.officerId}
              onChange={(e) => setFormData({ ...formData, officerId: e.target.value })}
              icon={<User className="w-4 h-4" />}
              required
            />
            <AuthInput
              id="register-email"
              type="email"
              label="Email Address"
              placeholder="officer@mineintel.org"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              icon={<Mail className="w-4 h-4" />}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <AuthInput
              id="register-password"
              type="password"
              label="Password"
              placeholder="Create password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              icon={<Lock className="w-4 h-4" />}
              required
            />
            <AuthInput
              id="register-confirm-password"
              type="password"
              label="Confirm Password"
              placeholder="Repeat password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              icon={<Lock className="w-4 h-4" />}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            id="btn-submit-registration"
            className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-sm transition-all duration-200 shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 flex items-center justify-center gap-2 group active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Creating User...</span>
              </span>
            ) : (
              <>
                <span>Create User</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
