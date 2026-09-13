import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  onDismiss,
  onClose,
  className = '',
}) => {
  const handleDismiss = onDismiss || onClose;
  const icons = {
    info: <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />,
  };

  const containerStyles = {
    info: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60 text-sky-900 dark:text-sky-200',
    success: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200',
    warning: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200',
    error: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200',
  };

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${containerStyles[type]} ${className}`}
    >
      {icons[type]}
      <div className="flex-1 text-left">
        {title && <h4 className="font-semibold text-sm mb-1">{title}</h4>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
      {handleDismiss && (
        <button
          onClick={handleDismiss}
          className="p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
