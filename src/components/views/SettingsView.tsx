import React, { useState } from 'react';
import {
  User as UserIcon,
  CheckCircle2,
} from 'lucide-react';
import { SystemHealthComponent } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface SettingsViewProps {
  healthComponents: SystemHealthComponent[];
  aiProvider?: string;
  aiModel?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = () => {
  const { user, updateProfile, changePassword } = useAuth();

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const saveProfile = async () => {
    setProfileError('');
    setProfileMessage('');
    setIsSaving(true);
    try {
      await updateProfile({ display_name: displayName, phone, email });
      setProfileMessage('Profile saved successfully.');
    } catch (err: any) {
      setProfileError(err.message || 'Unable to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const savePassword = async () => {
    setProfileError('');
    setProfileMessage('');
    if (newPassword.length < 8) {
      setProfileError('New password must be at least 8 characters.');
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setProfileMessage('Password changed successfully. Please sign in again.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setProfileError(err.message || 'Unable to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col p-6 space-y-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#233145] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserIcon className="w-5 h-5 text-blue-400" />
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">
              Officer Profile &amp; Account Settings
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Manage authenticated officer credentials, personal contact details, and account security.
          </p>
        </div>
      </div>

      {/* Main Profile Form */}
      <div className="w-full bg-[#111722] border border-[#1e2a3b] rounded-lg p-6 space-y-6 font-mono text-xs shadow-md">
        <div className="space-y-5 max-w-2xl">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 font-sans">
              Authenticated User Profile
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              Update permitted personal information. Officer ID is immutable.
            </p>
          </div>

          {profileMessage && (
            <div className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{profileMessage}</span>
            </div>
          )}

          {profileError && (
            <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/50 p-2.5 rounded">
              {profileError}
            </div>
          )}

          <label className="block text-slate-300">
            OFFICER ID
            <input
              value={user?.username || ''}
              readOnly
              className="mt-1 w-full bg-[#0e1521] border border-slate-700 rounded px-3 py-2 text-slate-500 cursor-not-allowed"
            />
          </label>

          <label className="block text-slate-300">
            FULL NAME
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full bg-[#182333] border border-slate-700 rounded px-3 py-2 text-slate-100"
            />
          </label>

          <label className="block text-slate-300">
            PHONE NUMBER
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full bg-[#182333] border border-slate-700 rounded px-3 py-2 text-slate-100"
            />
          </label>

          <label className="block text-slate-300">
            EMAIL ADDRESS
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-[#182333] border border-slate-700 rounded px-3 py-2 text-slate-100"
            />
          </label>

          <button
            type="button"
            onClick={saveProfile}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xs transition cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'Saving Profile...' : 'Save Profile'}
          </button>

          <div className="border-t border-[#233145] pt-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-100 font-sans">Change Password</h3>
            <p className="text-xs text-slate-400 font-sans">The current session is invalidated after a successful change.</p>
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-[#182333] border border-slate-700 rounded px-3 py-2 text-slate-100"
            />
            <input
              type="password"
              placeholder="New password (minimum 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-[#182333] border border-slate-700 rounded px-3 py-2 text-slate-100"
            />
            <button
              type="button"
              onClick={savePassword}
              disabled={isChangingPassword}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-xs transition cursor-pointer disabled:opacity-50"
            >
              {isChangingPassword ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
