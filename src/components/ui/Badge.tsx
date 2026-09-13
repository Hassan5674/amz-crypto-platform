import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  const variantClasses = {
    primary: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60',
    success: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60',
    warning: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60',
    danger: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60',
    info: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60',
    neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full whitespace-nowrap ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
