import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ActiveCoinAnimation {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

interface CoinAnimationContextType {
  triggerCoins: (startX: number, startY: number, count?: number) => void;
  animations: ActiveCoinAnimation[];
}

const CoinAnimationContext = createContext<CoinAnimationContextType | undefined>(undefined);

export const CoinAnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [animations, setAnimations] = useState<ActiveCoinAnimation[]>([]);

  const triggerCoins = useCallback((startX: number, startY: number, count = 12) => {
    const targetEl = document.getElementById('wallet-balance-header');
    const targetRect = targetEl ? targetEl.getBoundingClientRect() : { x: window.innerWidth - 180, y: 35, width: 120, height: 40 };
    const targetX = targetRect.x + targetRect.width / 2;
    const targetY = targetRect.y + targetRect.height / 2;

    const animId = Math.random().toString(36).substring(2, 9);
    
    const newAnims: ActiveCoinAnimation[] = [];
    for (let i = 0; i < count; i++) {
      newAnims.push({
        id: `${animId}-${i}`,
        startX: startX + (Math.random() - 0.5) * 50,
        startY: startY + (Math.random() - 0.5) * 50,
        targetX,
        targetY
      });
    }

    setAnimations(prev => [...prev, ...newAnims]);

    setTimeout(() => {
      setAnimations(prev => prev.filter(a => !a.id.startsWith(animId)));
    }, 1200);
  }, []);

  return (
    <CoinAnimationContext.Provider value={{ triggerCoins, animations }}>
      {children}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {animations.map(anim => {
          const xOffsetMid = (anim.targetX - anim.startX) * 0.5 + (Math.random() - 0.5) * 60;
          const yOffsetMid = (anim.targetY - anim.startY) * 0.5 - 130;
          const xOffsetEnd = anim.targetX - anim.startX;
          const yOffsetEnd = anim.targetY - anim.startY;

          return (
            <div
              key={anim.id}
              className="absolute w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 border-2 border-yellow-200 shadow-2xl flex items-center justify-center text-sm font-bold text-slate-950 animate-fly-coin"
              style={
                {
                  left: `${anim.startX}px`,
                  top: `${anim.startY}px`,
                  animationDuration: '0.9s',
                  animationTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
                  '--fly-x-mid': `${xOffsetMid}px`,
                  '--fly-y-mid': `${yOffsetMid}px`,
                  '--fly-x-end': `${xOffsetEnd}px`,
                  '--fly-y-end': `${yOffsetEnd}px`,
                } as React.CSSProperties
              }
            >
              🪙
            </div>
          );
        })}
      </div>
    </CoinAnimationContext.Provider>
  );
};

export const useCoinAnimation = () => {
  const context = useContext(CoinAnimationContext);
  if (!context) {
    throw new Error('useCoinAnimation must be used within a CoinAnimationProvider');
  }
  return context;
};
