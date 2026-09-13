import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap active:scale-[0.98]';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-sm border border-indigo-500/20',
    secondary:
      'bg-slate-800 text-slate-100 hover:bg-slate-700 focus:ring-slate-500 border border-slate-700',
    outline:
      'bg-transparent text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-slate-400',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-sm border border-rose-500/20',
    ghost:
      'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 focus:ring-slate-400',
    success:
      'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-sm border border-emerald-500/20',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
