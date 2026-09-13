import React from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  helperText?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full bg-white dark:bg-slate-900 border ${
          error
            ? 'border-rose-500 focus:ring-rose-500'
            : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500 focus:border-indigo-500'
        } rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-rose-500 font-medium">{error}</span>}
      {helperText && !error && <span className="text-xs text-slate-500">{helperText}</span>}
    </div>
  );
};
