import React from 'react';
import { Card } from './Card.js';
import { Badge } from './Badge.js';

export interface StatCardProps {
  label?: string;
  title?: string;
  value: string | number;
  subtext?: string;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  icon?: React.ReactNode;
  isDemo?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  title,
  value,
  subtext,
  subtitle,
  trend,
  icon,
  isDemo = false,
}) => {
  const displayLabel = title || label || '';
  const displaySubtext = subtitle || subtext;

  return (
    <Card className="relative overflow-hidden text-left">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {displayLabel}
            </span>
            {isDemo && (
              <Badge variant="warning" size="sm" className="text-[10px] py-0 px-1.5 font-bold tracking-tight">
                DEMO
              </Badge>
            )}
          </div>
          <div className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value}
          </div>
        </div>
        {icon && (
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
            {icon}
          </div>
        )}
      </div>

      {(displaySubtext || trend) && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          {displaySubtext && <span>{displaySubtext}</span>}
          {trend && (
            <span
              className={`font-semibold ${
                trend.isPositive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </Card>
  );
};
