import React from 'react';
import { Check } from 'lucide-react';

interface RememberMeCheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  subLabel?: string;
}

export const RememberMeCheckbox: React.FC<RememberMeCheckboxProps> = ({
  id = 'remember-me-checkbox',
  checked,
  onChange,
  label = 'Remember me',
  subLabel,
}) => {
  return (
    <div className="flex items-center justify-between pt-0.5" id={`container-${id}`}>
      <label
        htmlFor={id}
        className="group inline-flex items-center gap-2.5 cursor-pointer select-none text-left"
      >
        {/* Hidden accessible input */}
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />

        {/* Custom styled checkbox box */}
        <div
          className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/50 peer-focus-visible:ring-offset-1 dark:peer-focus-visible:ring-offset-slate-900 ${
            checked
              ? 'bg-blue-600 border-blue-600 text-white shadow-xs shadow-blue-500/30'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/80 group-hover:border-slate-400 dark:group-hover:border-slate-600'
          }`}
        >
          <Check
            className={`w-3.5 h-3.5 stroke-[2.5] transition-transform duration-150 ${
              checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            }`}
          />
        </div>

        {/* Label text */}
        <div className="flex flex-col">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            {label}
          </span>
          {subLabel && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {subLabel}
            </span>
          )}
        </div>
      </label>
    </div>
  );
};
