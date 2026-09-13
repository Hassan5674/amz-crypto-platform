import React from 'react';

export const LoadingSkeleton: React.FC<{
  rows?: number;
  className?: string;
}> = ({ rows = 3, className = '' }) => {
  return (
    <div className={`w-full space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-9 bg-slate-200 dark:bg-slate-800 rounded-lg w-full"
          style={{ width: `${100 - (i % 3) * 12}%` }}
        />
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 animate-pulse space-y-4">
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-sm w-1/3" />
      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-md w-2/3" />
      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-sm w-1/2" />
    </div>
  );
};
