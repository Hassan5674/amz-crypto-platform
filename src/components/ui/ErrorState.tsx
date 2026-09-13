import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import { Button } from './Button.js';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  code?: string | number;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'An unexpected error occurred',
  message = 'The system was unable to load this resource. Please try again or contact support if the issue persists.',
  onRetry,
  code,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl max-w-lg mx-auto my-6">
      <div className="p-3 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-2xl mb-3">
        <AlertOctagon className="w-8 h-8" />
      </div>
      {code && (
        <span className="text-xs font-mono font-bold tracking-wider text-rose-500 uppercase mb-1">
          Error {code}
        </span>
      )}
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 mb-5 max-w-sm leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button variant="primary" size="sm" onClick={onRetry} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Retry Request
        </Button>
      )}
    </div>
  );
};
