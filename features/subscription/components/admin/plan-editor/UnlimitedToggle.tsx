import React from 'react';
import { Infinity } from 'lucide-react';

interface UnlimitedToggleProps {
  isUnlimited: boolean;
  onChange: (unlimited: boolean) => void;
}

export const UnlimitedToggle: React.FC<UnlimitedToggleProps> = ({ isUnlimited, onChange }) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!isUnlimited)}
      className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${
        isUnlimited ? 'bg-indigo-600' : 'bg-slate-200'
      }`}
    >
      <span className="sr-only">Toggle unlimited</span>
      <span
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
          isUnlimited ? 'translate-x-3' : '-translate-x-3'
        }`}
      >
        {isUnlimited && <Infinity className="w-3.5 h-3.5 text-indigo-600" />}
      </span>
    </button>
  );
};
