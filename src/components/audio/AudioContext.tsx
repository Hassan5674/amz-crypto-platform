import React, { createContext, useContext, useState, useRef } from 'react';

interface AudioContextType {
  muted: boolean;
  toggleMute: () => void;
  playSpinSound: () => void;
  playWinSound: () => void;
  playLossSound: () => void;
  playDiceRollSound: () => void;
  playCoinFlipSound: () => void;
  playChipSound: () => void;
  playClickSound: () => void;
}

const AudioContext = createContext<AudioContextType>({
  muted: false,
  toggleMute: () => {},
  playSpinSound: () => {},
  playWinSound: () => {},
  playLossSound: () => {},
  playDiceRollSound: () => {},
  playCoinFlipSound: () => {},
  playChipSound: () => {},
  playClickSound: () => {},
});

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [muted, setMuted] = useState<boolean>(false);
  const audioCtxRef = useRef<InstanceType<typeof window.AudioContext> | null>(null);

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtxConstructor = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxConstructor) {
        audioCtxRef.current = new AudioCtxConstructor();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const toggleMute = () => {
    setMuted(prev => !prev);
  };

  const playClickSound = () => {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      // Ignore audio policy restrictions
    }
  };

  const playSpinSound = () => {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      // Play a rapid ticking sound sequence simulating ball spinning
      for (let i = 0; i < 15; i++) {
        setTimeout(() => {
          if (muted) return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime);
          gain.gain.setValueAtTime(0.05, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.03);
        }, i * 180);
      }
    } catch (e) {
      // Ignore
    }
  };

  const playWinSound = () => {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          if (muted) return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        }, idx * 120);
      });
    } catch (e) {
      // Ignore
    }
  };

  const playLossSound = () => {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Ignore
    }
  };

  const playDiceRollSound = () => {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      // Sequence of rapid shaker and dice tumble impulses
      const diceHits = [0, 40, 90, 150, 220, 310, 420];
      diceHits.forEach((delay) => {
        setTimeout(() => {
          if (muted) return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(300 + Math.random() * 500, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.04);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.04);
        }, delay);
      });
    } catch (e) {
      // Ignore
    }
  };

  const playCoinFlipSound = () => {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      // High-pitched metallic coin spin shimmer
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.2);
      osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      // Ignore
    }
  };

  const playChipSound = () => {
    if (muted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch (e) {
      // Ignore
    }
  };

  return (
    <AudioContext.Provider
      value={{
        muted,
        toggleMute,
        playSpinSound,
        playWinSound,
        playLossSound,
        playDiceRollSound,
        playCoinFlipSound,
        playChipSound,
        playClickSound
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => useContext(AudioContext);
