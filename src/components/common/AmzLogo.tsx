import React from 'react';

export interface AmzLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'compact';
  invert?: boolean;
  className?: string;
  onClick?: () => void;
}

export const AmzLogo: React.FC<AmzLogoProps> = ({
  size = 'md',
  variant = 'full',
  invert = false,
  className = '',
  onClick
}) => {
  // Dimensions for the icon
  const iconDimensions = {
    sm: { w: 26, h: 26, textClass: 'text-sm' },
    md: { w: 34, h: 34, textClass: 'text-base' },
    lg: { w: 42, h: 42, textClass: 'text-xl' },
    xl: { w: 56, h: 56, textClass: 'text-2xl' }
  }[size];

  return (
    <div
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      id="amz-brand-logo"
    >
      {/* Original AMZDistributor Geometric Nexus Vector Icon */}
      <div
        className="relative shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 p-0.5 shadow-sm"
        style={{ width: iconDimensions.w, height: iconDimensions.h }}
      >
        <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center overflow-hidden p-1">
          <svg
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <defs>
              <linearGradient id="amzGradPrimary" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366F1" />
                <stop offset="0.5" stopColor="#3B82F6" />
                <stop offset="1" stopColor="#06B6D4" />
              </linearGradient>
              <linearGradient id="amzGradAccent" x1="10" y1="30" x2="30" y2="10" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38BDF8" />
                <stop offset="1" stopColor="#818CF8" />
              </linearGradient>
            </defs>
            {/* Outer Hex Prism Wings */}
            <path
              d="M20 4L34 12V28L20 36L6 28V12L20 4Z"
              stroke="url(#amzGradPrimary)"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Distribution Chevron & Vault Node */}
            <path
              d="M13 16L20 21L27 16"
              stroke="url(#amzGradAccent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13 23L20 28L27 23"
              stroke="url(#amzGradPrimary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Center Dynamic Core */}
            <circle cx="20" cy="20" r="2.5" fill="#38BDF8" />
          </svg>
        </div>
      </div>

      {/* Wordmark */}
      {variant !== 'icon' && (
        <div className="flex flex-col justify-center leading-tight">
          <div className="flex items-baseline">
            <span
              className={`font-black tracking-tight ${iconDimensions.textClass} ${
                invert ? 'text-white' : 'text-slate-900 dark:text-white'
              }`}
            >
              AMZ
            </span>
            <span
              className={`font-bold tracking-tight ${iconDimensions.textClass} text-indigo-600 dark:text-indigo-400 ml-0.5`}
            >
              Distributor
            </span>
          </div>
          {variant === 'full' && (
            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Enterprise Commerce
            </span>
          )}
        </div>
      )}
    </div>
  );
};
