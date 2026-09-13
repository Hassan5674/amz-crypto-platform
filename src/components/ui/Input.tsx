import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {label}
            {props.required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && <div className="absolute left-3 text-slate-400 pointer-events-none">{leftIcon}</div>}
          <input
            ref={ref}
            id={inputId}
            className={`w-full bg-white dark:bg-slate-900 border ${
              error
                ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500'
                : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500'
            } rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
              leftIcon ? 'pl-10' : ''
            } ${rightIcon ? 'pr-10' : ''} ${className}`}
            {...props}
          />
          {rightIcon && <div className="absolute right-3 text-slate-400">{rightIcon}</div>}
        </div>
        {error && <span className="text-xs text-rose-500 font-medium">{error}</span>}
        {helperText && !error && <span className="text-xs text-slate-500 dark:text-slate-400">{helperText}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
