import './polyfills.js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { appKit, initializeAppKit } from './lib/reown.js';

interface AppKitContextType {
  open: () => Promise<void>;
  getAddress: () => Promise<string | null>;
  getChainId: () => Promise<number>;
  isReady: boolean;
  initError: string | null;
}

const AppKitContext = createContext<AppKitContextType>({
  open: async () => {},
  getAddress: async () => null,
  getChainId: async () => 1,
  isReady: false,
  initError: null
});

export const AppKitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    initializeAppKit().catch(() => {});
  }, []);

  return (
    <AppKitContext.Provider value={{ ...appKit, isReady, initError }}>
      {children}
    </AppKitContext.Provider>
  );
};

export const useAppKit = () => useContext(AppKitContext);

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <AppKitProvider>
        <App />
      </AppKitProvider>
    </StrictMode>
  );
}
