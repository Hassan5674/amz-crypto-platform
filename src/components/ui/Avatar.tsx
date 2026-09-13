import React from 'react';

export interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [src]);

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const getInitials = (n: string) => {
    if (!n) return 'U';
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden bg-indigo-600 dark:bg-indigo-600 text-white font-bold select-none shrink-0 border border-indigo-400 dark:border-indigo-500 shadow-sm ${sizeClasses[size]} ${className}`}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{getInitials(name || 'User')}</span>
      )}
    </div>
  );
};
