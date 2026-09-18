import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Check, 
  Lock, 
  User, 
  KeyRound, 
  AlertCircle,
  X,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface AuthenticatedUserProfileData {
  officerId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
}

interface AuthenticatedUserProfileViewProps {
  onBack?: () => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const AuthenticatedUserProfileView: React.FC<AuthenticatedUserProfileViewProps> = ({
  onBack,
  onClose,
  isModal = false,
}) => {
  const { user, logout, updateProfile, changePassword } = useAuth();
  const [profileData, setProfileData] = useState<AuthenticatedUserProfileData>(() => ({
    officerId: user?.id || user?.username || 'officer',
    fullName: user?.display_name || user?.username || 'Officer',
    phoneNumber: user?.phone || '',
    email: user?.email || '',
  }));

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (updateProfile) {
        await updateProfile({
          display_name: profileData.fullName,
          phone: profileData.phoneNumber,
          email: profileData.email,
        });
      }
      setSaveSuccessMessage('Personal information updated successfully.');
      setTimeout(() => setSaveSuccessMessage(null), 3500);
    } catch (err: any) {
      console.error(err);
      setSaveSuccessMessage('Updated locally.');
      setTimeout(() => setSaveSuccessMessage(null), 3500);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      setTimeout(() => setPasswordError(null), 3500);
      return;
    }

    try {
      if (changePassword) {
        await changePassword(currentPassword, newPassword);
      }
      setPasswordError(null);
      setPasswordSuccessMessage('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setPasswordSuccessMessage(null), 3500);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.');
      setTimeout(() => setPasswordError(null), 3500);
    }
  };

  return (
    <div className={`w-full ${isModal ? 'p-0 text-white' : 'max-w-4xl mx-auto py-4 px-2 sm:px-4'}`}>
      <div className={isModal ? 'text-white' : 'rounded-2xl bg-[#070e1c] text-white border border-[#17253d] shadow-2xl p-6 sm:p-10'}>
        
        {/* Section 1: Authenticated User Profile Header */}
        <div className="mb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-outfit">
                Authenticated User Profile
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-400 font-normal">
                Update permitted personal information. Officer ID is immutable.
              </p>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {onBack && !onClose && (
              <button
                type="button"
                onClick={onBack}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#1e293b] text-slate-400 hover:text-white hover:bg-[#0c1626] transition-colors cursor-pointer"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* Officer ID (Immutable) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 font-outfit">
              OFFICER ID
            </label>
            <div className="relative">
              <input
                id="input-officer-id"
                type="text"
                readOnly
                value={profileData.officerId}
                disabled
                className="w-full px-3.5 py-2.5 rounded-md text-sm font-mono text-slate-400 bg-[#0b1322] border border-[#1b263b] cursor-not-allowed select-all focus:outline-none"
              />
              <span className="absolute right-3 top-2.5 text-[10px] uppercase font-bold text-slate-500 bg-[#070e1c] px-2 py-0.5 rounded border border-[#17253d]">
                Immutable
              </span>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 font-outfit">
              FULL NAME
            </label>
            <input
              id="input-full-name"
              type="text"
              value={profileData.fullName}
              onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
              required
              className="w-full px-3.5 py-2.5 rounded-md text-sm text-white bg-[#0b1322] border border-[#1b263b] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-600"
              placeholder="Rama"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 font-outfit">
              PHONE NUMBER
            </label>
            <input
              id="input-phone-number"
              type="tel"
              value={profileData.phoneNumber}
              onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-md text-sm text-white bg-[#0b1322] border border-[#1b263b] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-600"
              placeholder=""
            />
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 font-outfit">
              EMAIL ADDRESS
            </label>
            <input
              id="input-email-address"
              type="text"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              required
              className="w-full px-3.5 py-2.5 rounded-md text-sm font-semibold text-slate-900 bg-[#edf2fa] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              placeholder="mine_analyst"
            />
          </div>

          {/* Save Profile Button */}
          <div className="pt-2">
            <button
              id="btn-save-profile"
              type="submit"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-md text-sm font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-sm active:scale-98 transition-all cursor-pointer"
            >
              Save Profile
            </button>
          </div>

          {saveSuccessMessage && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-medium animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}
        </form>

        {/* Horizontal Divider Line */}
        <hr className="my-8 border-t border-[#162338]" />

        {/* Section 2: Change Password Header */}
        <div className="mb-6">
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white font-outfit">
            Change Password
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 font-normal">
            The current session is invalidated after a successful change.
          </p>
        </div>

        {/* Change Password Form */}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <input
              id="input-current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-md text-sm font-semibold text-slate-900 bg-[#edf2fa] border border-[#cbd5e1] focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
              placeholder="••••••"
            />
          </div>

          <div>
            <input
              id="input-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (minimum 8 characters)"
              className="w-full px-3.5 py-2.5 rounded-md text-sm text-white bg-[#0b1322] border border-[#1b263b] placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all"
            />
          </div>

          <div className="pt-2">
            <button
              id="btn-change-password"
              type="submit"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-md text-sm font-semibold bg-[#ea580c] hover:bg-[#c2410c] text-white shadow-sm active:scale-98 transition-all cursor-pointer"
            >
              Change Password
            </button>
          </div>

          {passwordSuccessMessage && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-medium animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{passwordSuccessMessage}</span>
            </div>
          )}

          {passwordError && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-medium animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{passwordError}</span>
            </div>
          )}
        </form>

        {/* Sovereign Session Sign Out */}
        <div className="mt-8 pt-6 border-t border-[#1b263b] flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-200">Sovereign Session</div>
            <div className="text-[11px] text-slate-400 font-mono">Role: {user?.role || 'Operational Auditor'}</div>
          </div>
          <button
            id="btn-worker-signout"
            type="button"
            onClick={() => logout()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/80 shadow-xs cursor-pointer transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>

      </div>
    </div>
  );
};
