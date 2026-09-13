import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export const SessionAuthWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, isAuthenticated } = useAuth();

  useEffect(() => {
    const handleUnauthorized = (_event: CustomEvent<{ message?: string }>) => {
      if (isAuthenticated) {
        logout();
      }
    };

    window.addEventListener('auth:unauthorized' as any, handleUnauthorized as EventListener);

    return () => {
      window.removeEventListener('auth:unauthorized' as any, handleUnauthorized as EventListener);
    };
  }, [isAuthenticated, logout]);

  return <>{children}</>;
};

