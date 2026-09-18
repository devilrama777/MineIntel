import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronDown 
} from 'lucide-react';
import { AuthenticatedUserProfileView } from './AuthenticatedUserProfileView';

export interface UserProfileData {
  name: string;
  email: string;
  role: string;
  department: string;
  tier: string;
  joinedDate: string;
}

const DEFAULT_PROFILE: UserProfileData = {
  name: 'Rama',
  email: 'mine_analyst',
  role: 'mine_analyst',
  department: 'Operational Auditor',
  tier: 'Immutable Officer',
  joinedDate: 'September 2024'
};

import { useAuth } from '../../context/AuthContext';

export interface UserProfileProps {
  onOpenHistory?: () => void;
  onNavigateProfile?: () => void;
  historyCount?: number;
}

export const UserProfile: React.FC<UserProfileProps> = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const displayName = user?.display_name || user?.username || 'Operational Auditor';
  const roleName = user?.role || 'Operational Auditor';
  const avatarLetter = (displayName[0] || 'O').toUpperCase();

  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Trigger Button (Top Right Corner Icon) */}
      <button
        id="btn-user-profile"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl transition-all cursor-pointer border shadow-2xs active:scale-95 bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200/90 dark:bg-[#0b162a] dark:hover:bg-blue-950/60 dark:text-blue-100 dark:border-blue-900/60 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
        title="View Authenticated User Profile"
        aria-label="User Profile"
        aria-expanded={isOpen}
      >
        {/* Presentable Avatar Icon showing R (Rama) */}
        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs shadow-xs flex-shrink-0">
          {avatarLetter}
          {/* Active Status Badge */}
          <span 
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-[#0b162a] rounded-full ring-1 ring-emerald-400/40"
            title="Online & Active"
          />
        </div>

        {/* User Details label (Desktop) */}
        <div className="hidden lg:flex flex-col text-left leading-tight pr-0.5">
          <span className="font-bold text-xs text-neutral-900 dark:text-white truncate max-w-[105px]">
            {displayName}
          </span>
          <span className="text-[10px] text-neutral-500 dark:text-blue-300/80 font-mono font-medium truncate max-w-[105px]">
            {roleName}
          </span>
        </div>

        {/* Chevron toggle icon */}
        <ChevronDown 
          className={`w-3.5 h-3.5 text-neutral-400 dark:text-blue-400/80 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600 dark:text-amber-400' : ''
          }`} 
        />
      </button>

      {/* Authenticated User Profile Dropdown Card appearing directly under top right corner icon */}
      {isOpen && (
        <div 
          id="user-profile-dropdown"
          className="absolute right-0 mt-2.5 w-[360px] sm:w-[460px] max-h-[88vh] overflow-y-auto rounded-2xl border shadow-2xl z-50 animate-fade-in bg-[#070e1c] border-[#17253d] text-white p-5 sm:p-6"
        >
          <AuthenticatedUserProfileView 
            isModal={true}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
};
