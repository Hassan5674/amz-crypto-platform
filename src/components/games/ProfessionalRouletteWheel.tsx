import React, { useEffect, useRef, useState } from 'react';
import { EUROPEAN_WHEEL_NUMBERS, RED_POCKET_NUMBERS, RoulettePhase, RouletteOutcome } from '../../context/RouletteContext';

interface ProfessionalRouletteWheelProps {
  phase: RoulettePhase;
  winningNumber: number | null;
  spinDurationSec?: number;
  lastOutcome: RouletteOutcome | null;
  onSpinComplete?: () => void;
}

export const ProfessionalRouletteWheel: React.FC<ProfessionalRouletteWheelProps> = ({
  phase,
  winningNumber,
  spinDurationSec = 10,
  lastOutcome,
  onSpinComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Wheel physics state
  const wheelAngleRef = useRef<number>(0); // Radians
  const ballAngleRef = useRef<number>(0);  // Radians
  const ballRadiusRef = useRef<number>(0.82); // Normalized radius (0 to 1 relative to wheel size)
  const spinStartTimeRef = useRef<number | null>(null);

  // Sound synthesis ref
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playFretClick = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400 + Math.random() * 400, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.025);
    } catch {
      // Ignore audio context errors
    }
  };

  const playBallLandingThud = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Ignore
    }
  };

  // 60FPS Physics Engine & Realistic 3D Wheel Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    let lastTime = performance.now();
    let lastFretSoundAngle = 0;

    const totalPockets = 37;
    const anglePerPocket = (Math.PI * 2) / totalPockets;

    const render = (now: number) => {
      if (!isRunning) return;

      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // Ensure crisp high-DPI scaling
      const width = canvas.width;
      const height = canvas.height;
      const size = Math.min(width, height);
      const centerX = width / 2;
      const centerY = height / 2;
      const outerRadius = size * 0.46;

      ctx.clearRect(0, 0, width, height);

      // Handle Spin Animation Timing & Ball Physics
      if (phase === 'SPINNING') {
        if (spinStartTimeRef.current === null) {
          spinStartTimeRef.current = now;
        }

        const elapsed = (now - spinStartTimeRef.current) / 1000;
        const duration = spinDurationSec;
        const progress = Math.min(1, Math.max(0, elapsed / duration));

        // 1. Wheel Rotation Physics (Counter-clockwise smooth deceleration)
        // Easing curve for wheel deceleration: starts at high speed, gently coasting to stop
        const wheelSpeed = 4 * Math.pow(1 - progress * 0.7, 2);
        wheelAngleRef.current = (wheelAngleRef.current - wheelSpeed * delta) % (Math.PI * 2);

        // 2. Ball Physics (Clockwise launch around outer track -> spiral down -> bounce into target pocket)
        // Determine target pocket index
        const targetNum = winningNumber !== null ? winningNumber : 0;
        const targetPocketIdx = EUROPEAN_WHEEL_NUMBERS.indexOf(targetNum);
        
        // Calculate the exact wheel angle where target pocket is at the top (Pointer at angle -PI/2)
        // Pointer is at 12 o'clock (-Math.PI / 2)
        const targetPocketLocalAngle = targetPocketIdx * anglePerPocket;

        if (progress < 0.6) {
          // PHASE 1: Outer Rim High Velocity Orbit (radius 0.86)
          const ballSpeed = 12 * Math.pow(1 - progress * 0.5, 1.8);
          ballAngleRef.current = (ballAngleRef.current + ballSpeed * delta) % (Math.PI * 2);
          ballRadiusRef.current = 0.86;
        } else if (progress < 0.85) {
          // PHASE 2: Centripetal Decay & Spiral Down into Pocket Cone (radius 0.86 down to 0.66)
          const spiralProgress = (progress - 0.6) / 0.25;
          ballRadiusRef.current = 0.86 - spiralProgress * 0.20;
          const ballSpeed = 6 * (1 - spiralProgress * 0.6);
          ballAngleRef.current = (ballAngleRef.current + ballSpeed * delta) % (Math.PI * 2);

          // Play fret sound as ball crosses pocket dividers
          if (Math.abs(ballAngleRef.current - lastFretSoundAngle) > anglePerPocket) {
            playFretClick();
            lastFretSoundAngle = ballAngleRef.current;
          }
        } else {
          // PHASE 3: Micro Bounce & Lock into Target Pocket
          const lockProgress = (progress - 0.85) / 0.15;
          ballRadiusRef.current = 0.66;

          // Align ball position with the moving wheel's target pocket
          // Ball absolute angle = wheelAngle + targetPocketLocalAngle + microBounce
          const bounceOffset = Math.sin(lockProgress * Math.PI * 6) * (1 - lockProgress) * 0.08;
          const finalBallAngle = wheelAngleRef.current + targetPocketLocalAngle - Math.PI / 2 + bounceOffset;
          
          ballAngleRef.current = finalBallAngle;

          if (lockProgress > 0.95 && spinStartTimeRef.current !== null) {
            playBallLandingThud();
          }
        }
      } else {
        // Idle/Settled Phase
        spinStartTimeRef.current = null;
        // Slowly idle rotate wheel when in betting phase
        if (phase === 'BETTING') {
          wheelAngleRef.current = (wheelAngleRef.current - 0.2 * delta) % (Math.PI * 2);
        }

        // Lock ball into winning pocket if settled
        if (phase === 'SETTLED' && lastOutcome) {
          const targetPocketIdx = EUROPEAN_WHEEL_NUMBERS.indexOf(lastOutcome.number);
          const targetPocketLocalAngle = targetPocketIdx * anglePerPocket;
          ballAngleRef.current = wheelAngleRef.current + targetPocketLocalAngle - Math.PI / 2;
          ballRadiusRef.current = 0.66;
        }
      }

      ctx.save();
      ctx.translate(centerX, centerY);

      // --- 1. OUTER POLISHED MAHOGANY WOOD BOWL ---
      const woodGrad = ctx.createRadialGradient(0, 0, outerRadius * 0.7, 0, 0, outerRadius);
      woodGrad.addColorStop(0, '#581c87'); // Deep luxury tone
      woodGrad.addColorStop(0.1, '#78350f'); // Rich mahogany
      woodGrad.addColorStop(0.5, '#451a03');
      woodGrad.addColorStop(0.85, '#270e02');
      woodGrad.addColorStop(1, '#0f0501');

      ctx.beginPath();
      ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
      ctx.fillStyle = woodGrad;
      ctx.fill();

      // Outer brass rivet ring
      ctx.beginPath();
      ctx.arc(0, 0, outerRadius * 0.98, 0, Math.PI * 2);
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 3;
      ctx.stroke();

      // --- 2. METALLIC BALL TRACK RING ---
      const trackRadius = outerRadius * 0.88;
      const trackGrad = ctx.createRadialGradient(0, 0, trackRadius * 0.9, 0, 0, trackRadius);
      trackGrad.addColorStop(0, '#1e293b');
      trackGrad.addColorStop(0.5, '#334155');
      trackGrad.addColorStop(0.8, '#0f172a');
      trackGrad.addColorStop(1, '#475569');

      ctx.beginPath();
      ctx.arc(0, 0, trackRadius, 0, Math.PI * 2);
      ctx.fillStyle = trackGrad;
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Track metallic brass bevels
      ctx.beginPath();
      ctx.arc(0, 0, trackRadius * 0.92, 0, Math.PI * 2);
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // --- 3. ROTATING WHEEL BOWL & POCKETS RING ---
      ctx.save();
      ctx.rotate(wheelAngleRef.current);

      const pocketOuterR = trackRadius * 0.85;
      const pocketInnerR = trackRadius * 0.52;

      // Draw 37 European Pockets
      for (let i = 0; i < totalPockets; i++) {
        const pocketNum = EUROPEAN_WHEEL_NUMBERS[i];
        const startAngle = i * anglePerPocket - anglePerPocket / 2;
        const endAngle = startAngle + anglePerPocket;

        const isZero = pocketNum === 0;
        const isRed = RED_POCKET_NUMBERS.includes(pocketNum);

        // Pocket Background Color
        ctx.beginPath();
        ctx.arc(0, 0, pocketOuterR, startAngle, endAngle);
        ctx.arc(0, 0, pocketInnerR, endAngle, startAngle, true);
        ctx.closePath();

        if (isZero) {
          ctx.fillStyle = '#16a34a'; // Emerald Green
        } else if (isRed) {
          ctx.fillStyle = '#dc2626'; // Deep Red
        } else {
          ctx.fillStyle = '#111827'; // Dark Slate/Black
        }
        ctx.fill();

        // Metallic Divider Frets
        ctx.beginPath();
        ctx.moveTo(pocketInnerR * Math.cos(startAngle), pocketInnerR * Math.sin(startAngle));
        ctx.lineTo(pocketOuterR * Math.cos(startAngle), pocketOuterR * Math.sin(startAngle));
        ctx.strokeStyle = '#fbbf24'; // Brass/gold fret
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Number Labels inside Pockets
        ctx.save();
        const midAngle = i * anglePerPocket;
        const textR = (pocketOuterR + pocketInnerR) / 2;
        ctx.translate(textR * Math.cos(midAngle), textR * Math.sin(midAngle));
        ctx.rotate(midAngle + Math.PI / 2); // Orient numbers outwards

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pocketNum.toString(), 0, 0);
        ctx.restore();
      }

      // --- 4. CENTRAL MULTI-TIER BRASS SPINDLE & TURRET ---
      const spindleR = pocketInnerR;
      const brassGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, spindleR);
      brassGrad.addColorStop(0, '#fef08a');
      brassGrad.addColorStop(0.3, '#eab308');
      brassGrad.addColorStop(0.7, '#ca8a04');
      brassGrad.addColorStop(1, '#854d0e');

      ctx.beginPath();
      ctx.arc(0, 0, spindleR, 0, Math.PI * 2);
      ctx.fillStyle = brassGrad;
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner Hub Ring
      ctx.beginPath();
      ctx.arc(0, 0, spindleR * 0.65, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Gold Core Cone
      ctx.beginPath();
      ctx.arc(0, 0, spindleR * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = brassGrad;
      ctx.fill();

      // Center Emblem Text
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('EUROPEAN', 0, -4);
      ctx.fillText('GRAND', 0, 6);

      ctx.restore(); // Restore wheel rotation transform

      // --- 5. IVORY ROULETTE BALL WITH GLOW & SPECULAR HIGHLIGHTS ---
      const bRadPixels = trackRadius * ballRadiusRef.current;
      const ballX = bRadPixels * Math.cos(ballAngleRef.current);
      const ballY = bRadPixels * Math.sin(ballAngleRef.current);

      // Ball shadow on wood/track
      ctx.beginPath();
      ctx.arc(ballX + 2, ballY + 3, size * 0.018, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fill();

      // Ivory Ball
      const ballSize = size * 0.016;
      const ballGrad = ctx.createRadialGradient(
        ballX - ballSize * 0.3,
        ballY - ballSize * 0.3,
        0,
        ballX,
        ballY,
        ballSize
      );
      ballGrad.addColorStop(0, '#ffffff');
      ballGrad.addColorStop(0.7, '#f1f5f9');
      ballGrad.addColorStop(1, '#cbd5e1');

      ctx.beginPath();
      ctx.arc(ballX, ballY, ballSize, 0, Math.PI * 2);
      ctx.fillStyle = ballGrad;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // --- 6. TOP GOLD LANDING POINTER PIN (Fixed at 12 o'clock -Math.PI / 2) ---
      ctx.beginPath();
      ctx.moveTo(0, -outerRadius * 0.99);
      ctx.lineTo(-8, -outerRadius * 0.88);
      ctx.lineTo(8, -outerRadius * 0.88);
      ctx.closePath();
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [phase, winningNumber, spinDurationSec, lastOutcome]);

  return (
    <div className="relative w-full aspect-square max-w-[340px] sm:max-w-[380px] mx-auto flex items-center justify-center p-2 bg-slate-950 rounded-full border-4 border-amber-600/30 shadow-[0_0_50px_rgba(0,0,0,0.9),inset_0_2px_15px_rgba(251,191,36,0.2)]">
      <canvas
        ref={canvasRef}
        width={480}
        height={480}
        className="w-full h-full rounded-full drop-shadow-2xl"
      />
    </div>
  );
};
