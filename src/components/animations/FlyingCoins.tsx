import React, { useEffect, useState } from 'react';

export interface FlyingCoinParticle {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  midX: number;
  midY: number;
  delay: number;
}

interface FlyingCoinsProps {
  trigger: boolean;
  fromRect?: { x: number; y: number } | null;
  toElementId?: string;
  onComplete?: () => void;
}

export const FlyingCoins: React.FC<FlyingCoinsProps> = ({
  trigger,
  fromRect,
  toElementId = 'wallet-balance-header',
  onComplete
}) => {
  const [particles, setParticles] = useState<FlyingCoinParticle[]>([]);

  useEffect(() => {
    if (!trigger) return;

    const targetEl = document.getElementById(toElementId);
    const targetRect = targetEl ? targetEl.getBoundingClientRect() : { x: window.innerWidth - 180, y: 35, width: 100, height: 40 };
    const endX = targetRect.x + targetRect.width / 2;
    const endY = targetRect.y + targetRect.height / 2;

    const startX = fromRect ? fromRect.x : window.innerWidth / 2;
    const startY = fromRect ? fromRect.y : window.innerHeight / 2;

    const newParticles: FlyingCoinParticle[] = [];
    const count = 12; // 12 coins in the burst

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 0.8;
      const distance = 90 + Math.random() * 70;
      const midX = startX + Math.cos(angle) * distance;
      const midY = startY + Math.sin(angle) * distance - 120; // arc upwards

      newParticles.push({
        id: Date.now() + i,
        startX,
        startY,
        endX,
        endY,
        midX,
        midY,
        delay: i * 50 // staggered delay in ms
      });
    }

    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
      if (onComplete) onComplete();
    }, 1100);

    return () => clearTimeout(timer);
  }, [trigger, fromRect, toElementId, onComplete]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => {
        const xOffsetMid = p.midX - p.startX;
        const yOffsetMid = p.midY - p.startY;
        const xOffsetEnd = p.endX - p.startX;
        const yOffsetEnd = p.endY - p.startY;

        return (
          <div
            key={p.id}
            className="absolute w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 border-2 border-yellow-200 shadow-2xl flex items-center justify-center text-sm font-bold text-slate-950 animate-fly-coin"
            style={
              {
                left: `${p.startX}px`,
                top: `${p.startY}px`,
                animationDelay: `${p.delay}ms`,
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
  );
};
