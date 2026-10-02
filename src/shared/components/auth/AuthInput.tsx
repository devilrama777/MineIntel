import React, { useState } from 'react';
import { Eye, EyeOff, X, AlertCircle } from 'lucide-react';

interface AuthInputProps {
  id: string;
  label: string;
  type?: 'text' | 'password' | 'email';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  error?: string | null;
  rightLink?: {
    text: string;
    onClick: () => void;
  };
  autoComplete?: string;
  autoFocus?: boolean;
  required?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon,
  error,
  rightLink,
  autoComplete,
  autoFocus = false,
  required = false,
  onKeyDown,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isPassword = type === 'password';

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isPassword) {
      setIsCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const handleClear = () => {
    const syntheticEvent = {
      target: { value: '' },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
  };

  return (
    <div className="space-y-1.5 w-full" id={`field-container-${id}`}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-xs font-semibold tracking-wider text-slate-800 dark:text-slate-200 uppercase select-none flex items-center gap-1.5"
        >
          {label}
        </label>
        {rightLink && (
          <button
            type="button"
            onClick={rightLink.onClick}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors focus:outline-none focus:underline font-medium cursor-pointer"
          >
            {rightLink.text}
          </button>
        )}
      </div>

      {/* Input wrapper with interactive dynamic focus border gradient */}
      <div className="relative">
        {/* Subtle glowing aura behind field during focus */}
        <div
          className={`absolute -inset-0.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-amber-500 opacity-0 transition-opacity duration-400 blur-xs pointer-events-none ${
            isFocused && !error ? 'opacity-40 animate-border-gradient' : ''
          }`}
          aria-hidden="true"
        />

        <div
          className={`relative rounded-xl p-[1px] transition-all duration-300 ${
            error
              ? 'bg-red-500 shadow-md shadow-red-500/10'
              : isFocused
              ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 dark:from-cyan-400 dark:via-blue-500 dark:to-amber-400 animate-border-gradient shadow-md shadow-blue-500/20'
              : 'bg-slate-300 dark:bg-slate-800 hover:bg-slate-400 dark:hover:bg-slate-700'
          }`}
        >
          <div className="relative rounded-[11px] bg-white dark:bg-[#0c1424] flex items-center overflow-hidden">
          {/* Leading Icon */}
          {icon && (
            <div
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none ${
                isFocused
                  ? 'text-blue-600 dark:text-cyan-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {icon}
            </div>
          )}

          {/* Input */}
          <input
            id={id}
            type={isPassword ? (showPassword ? 'text' : 'password') : type}
            value={value}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyUp={handleKeyUp}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            autoComplete={autoComplete}
            autoFocus={autoFocus}
            required={required}
            className={`w-full h-12 text-sm font-medium bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-colors ${
              icon ? 'pl-11' : 'pl-4'
            } ${isPassword || value ? 'pr-11' : 'pr-4'}`}
          />

          {/* Action icons (Password Toggle or Clear) */}
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
            {isPassword ? (
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                onMouseDown={(e) => e.preventDefault()}
                id={`toggle-password-${id}`}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 focus:outline-none focus:text-blue-600 dark:focus:text-cyan-400 transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 pointer-events-none" />
                ) : (
                  <Eye className="w-4 h-4 pointer-events-none" />
                )}
              </button>
            ) : (
              value && (
                <button
                  type="button"
                  onClick={handleClear}
                  onMouseDown={(e) => e.preventDefault()}
                  id={`clear-input-${id}`}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 focus:outline-none focus:text-blue-600 dark:focus:text-cyan-400 transition-colors cursor-pointer"
                  title="Clear input"
                  aria-label="Clear input"
                  tabIndex={-1}
                >
                  <X className="w-3.5 h-3.5 pointer-events-none" />
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Caps Lock Alert */}
      {isCapsLockOn && isPassword && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400/90 pt-0.5 animate-fadeIn">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Caps Lock is ON</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1.5 pt-0.5 animate-fadeIn">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};
