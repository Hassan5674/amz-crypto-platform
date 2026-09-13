import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverEffect = false,
  ...props
}) => {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 md:p-6 shadow-sm ${
        hoverEffect ? 'hover:border-slate-300 dark:hover:border-slate-700 transition-colors' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, className = '' }) => {
  return (
    <div className={`flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-5 ${className}`}>
      <div>
        <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
