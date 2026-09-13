import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

export const Breadcrumb: React.FC<{
  items: BreadcrumbItem[];
  className?: string;
}> = ({ items, className = '' }) => {
  return (
    <nav className={`flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 ${className}`} aria-label="Breadcrumb">
      <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={items[0]?.onClick}>
        <Home className="w-3.5 h-3.5" />
      </div>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          {item.active ? (
            <span className="font-semibold text-slate-900 dark:text-white" aria-current="page">
              {item.label}
            </span>
          ) : (
            <button
              onClick={item.onClick}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {item.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
