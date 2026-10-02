import React, { useState } from 'react';
import {
  User,
  Shield,
  KeyRound,
  Mail,
  Phone,
  Building,
  MapPin,
  Save,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Profile: React.FC = () => {
  const { user, updateProfile, changePassword, showToast } = useApp();

  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone,
    designation: user.designation,
    region: user.region,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(formData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('Validation Error', 'New passwords do not match', 'error');
      return;
    }
    const success = changePassword(
      passwordForm.currentPassword,
      passwordForm.newPassword
    );
    if (success) {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <span className="text-[11px] font-mono font-bold tracking-widest text-[#00D9FF] uppercase">
          PERSONNEL CREDENTIALS
        </span>
        <h2 className="text-2xl font-semibold text-white tracking-tight mt-1">
          Field Officer Profile
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Authorized Field Inspector details registered with CMPDI Regional Institute II.
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="mine-card p-8 relative overflow-hidden">
        {/* Officer Avatar + Officer ID */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b border-[#00D9FF]/12">
          {/* 80px gradient circle avatar */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#00D9FF] via-cyan-500 to-[#FFA726] p-[2px] shadow-[0_0_20px_rgba(0,217,255,0.3)] shrink-0">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center font-mono text-2xl font-bold text-white">
              {user.avatarInitials}
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h3 className="text-xl font-bold text-white">{user.name}</h3>
              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#00D9FF]/15 text-[#00D9FF] border border-[#00D9FF]/30">
                ACTIVE DUTY
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">{user.designation}</div>

            <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-cyan-400" />
                <span>{user.subsidiary}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>{user.region}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form: Profile fields */}
        <form onSubmit={handleProfileSave} className="mt-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Officer ID (read-only, mono) */}
            <div>
              <label className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase block mb-2">
                OFFICER IDENTIFIER (GOVERNMENT ID)
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={user.officerId}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 font-mono text-sm text-[#00D9FF] font-semibold cursor-not-allowed select-all"
                />
                <Shield className="w-4 h-4 text-[#00D9FF] absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                Assigned by Ministry of Coal personnel directory.
              </span>
            </div>

            {/* Display Name */}
            <div>
              <label className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase block mb-2">
                FULL DISPLAY NAME
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-white focus:outline-none focus:border-[#00D9FF]/50"
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase block mb-2">
                INSTITUTIONAL EMAIL
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-white focus:outline-none focus:border-[#00D9FF]/50"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Phone Field */}
            <div>
              <label className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase block mb-2">
                COMMUNICATION CONTACT
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-[#00D9FF]/50"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="btn-action shine-sweep px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00D9FF] to-blue-600 text-slate-950 font-semibold text-xs shadow-[0_0_15px_rgba(0,217,255,0.25)] flex items-center gap-2 hover:brightness-110"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CHANGE PASSWORD SECTION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="mine-card p-8">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <KeyRound className="w-5 h-5 text-[#FFA726]" />
          <div>
            <h3 className="text-base font-semibold text-white">Change Security Password</h3>
            <p className="text-xs text-slate-400">
              Update authentication credentials for the field station terminal.
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4 max-w-xl">
          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1.5">
              CURRENT PASSWORD
            </label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
              }
              className="w-full px-4 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-white focus:outline-none focus:border-[#FFA726]/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1.5">
                NEW PASSWORD
              </label>
              <input
                type="password"
                placeholder="Min. 8 characters"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                }
                className="w-full px-4 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-white focus:outline-none focus:border-[#FFA726]/50"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1.5">
                CONFIRM NEW PASSWORD
              </label>
              <input
                type="password"
                placeholder="Repeat new password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                }
                className="w-full px-4 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-white focus:outline-none focus:border-[#FFA726]/50"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="btn-action px-5 py-2.5 rounded-xl bg-slate-900 border border-amber-500/30 text-[#FFA726] hover:bg-[#FFA726]/10 text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Update Password</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
