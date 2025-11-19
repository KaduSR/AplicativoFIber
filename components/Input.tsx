import React, { ReactNode } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  rightElement?: ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, rightElement, className = '', ...props }) => {
  return (
    <div className="w-full mb-4">
      {label && <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">{label}</label>}
      <div className={`relative flex items-center bg-zinc-800/50 border rounded-xl transition-all custom-input-shadow ${
        error ? 'border-red-500/50' : 'border-zinc-700/50 focus-within:border-blue-500'
      }`}>
        {icon && (
          <div className="pl-4 text-zinc-500">
            {icon}
          </div>
        )}
        <input
          className={`w-full bg-transparent border-none text-white placeholder-zinc-600 px-4 py-3.5 outline-none text-base ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="pr-4">
            {rightElement}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-400 ml-1">{error}</p>}
    </div>
  );
};