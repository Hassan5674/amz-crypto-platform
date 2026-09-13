// Audio Engine - Web Audio API based sound system with synthesizer oscillators & anti-distortion compressor

export class AudioEngine {
  private context: AudioContext | null = null;
  private masterVolume: number = 0.35;
  private enabled: boolean = true;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    this.context = null;
    this.masterVolume = 0.35;
    this.enabled = true;
    this.compressor = null;
    this.masterGain = null;
  }

  public init(): void {
    if (this.context) {
      if (this.context.state === 'suspended') {
        this.context.resume().catch(() => {});
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.context = new AudioCtx();
      
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.masterVolume;
      
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -24;
      this.compressor.knee.value = 30;
      this.compressor.ratio.value = 12;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.25;

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.context.destination);
    } catch (e) {
      console.warn('AudioContext not supported or blocked:', e);
      this.enabled = false;
    }
  }

  public setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.context) {
      try {
        this.masterGain.gain.setValueAtTime(this.masterVolume, this.context.currentTime);
      } catch {
        this.masterGain.gain.value = this.masterVolume;
      }
    }
  }

  public getVolume(): number {
    return this.masterVolume;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 1): void {
    if (!this.enabled) return;
    this.init();
    if (!this.context || !this.masterGain) return;

    try {
      if (this.context.state === 'suspended') {
        this.context.resume().catch(() => {});
      }
      const oscillator = this.context.createOscillator();
      const gainNode = this.context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      
      const now = this.context.currentTime;
      const vol = Math.min(volume * 0.4, 0.35);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(vol, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration + 0.01);
    } catch {
      // Silently fail on restricted autoplay
    }
  }

  // Sound effects
  public playClick(): void {
    this.playTone(800, 0.04, 'sine', 0.2);
  }

  public playBet(): void {
    this.playTone(400, 0.08, 'sine', 0.25);
    setTimeout(() => this.playTone(500, 0.08, 'sine', 0.2), 50);
  }

  public playWin(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.15, 'sine', 0.3), i * 100);
    });
  }

  public playBigWin(): void {
    const notes = [523, 659, 784, 880, 1047, 1175, 1319, 1568];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.35), i * 80);
    });
  }

  public playLose(): void {
    this.playTone(200, 0.25, 'sine', 0.2);
    setTimeout(() => this.playTone(150, 0.3, 'sine', 0.15), 150);
  }

  public playTick(): void {
    this.playTone(1000, 0.02, 'sine', 0.1);
  }

  public playCrashTick(): void {
    this.playTone(600 + Math.random() * 100, 0.02, 'sine', 0.1);
  }

  public playCrash(): void {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        this.playTone(100 + Math.random() * 30, 0.15, 'sine', 0.2 - i * 0.04);
      }, i * 50);
    }
  }

  public playBounce(): void {
    this.playTone(300 + Math.random() * 100, 0.04, 'sine', 0.15);
  }

  public playFlip(): void {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => this.playTone(400 + i * 40, 0.02, 'sine', 0.1), i * 30);
    }
  }

  public playWheelTick(): void {
    this.playTone(800 + Math.random() * 200, 0.015, 'sine', 0.1);
  }

  public playWheelStop(): void {
    this.playTone(600, 0.08, 'sine', 0.25);
    setTimeout(() => this.playTone(800, 0.1, 'sine', 0.3), 100);
  }

  public playCardDeal(): void {
    this.playTone(300, 0.04, 'sine', 0.15);
    this.playTone(1500, 0.02, 'sine', 0.08);
  }

  public playCardFlip(): void {
    this.playTone(600, 0.04, 'sine', 0.15);
    setTimeout(() => this.playTone(900, 0.04, 'sine', 0.2), 30);
  }

  public playSlotSpin(): void {
    this.playTone(200, 0.08, 'sine', 0.15);
  }

  public playSlotStop(): void {
    this.playTone(400, 0.06, 'sine', 0.2);
  }

  public playSelect(): void {
    this.playTone(600, 0.04, 'sine', 0.2);
  }

  public playDeselect(): void {
    this.playTone(400, 0.04, 'sine', 0.15);
  }

  public playReveal(): void {
    this.playTone(800, 0.08, 'sine', 0.2);
    setTimeout(() => this.playTone(1200, 0.08, 'sine', 0.18), 50);
  }

  public playExplosion(): void {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.playTone(80 + Math.random() * 40, 0.12, 'sine', 0.25 - i * 0.04);
      }, i * 40);
    }
  }

  public playRouletteBall(): void {
    this.playTone(1200, 0.015, 'sine', 0.12);
  }

  public playRouletteDrop(): void {
    this.playTone(300, 0.1, 'sine', 0.25);
    setTimeout(() => this.playTone(250, 0.15, 'sine', 0.2), 100);
  }

  public playCashout(): void {
    const notes = [400, 500, 600, 800, 1000];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.1, 'sine', 0.25), i * 60);
    });
  }

  public playCard(): void {
    this.playTone(600, 0.03, 'sine', 0.15);
    setTimeout(() => this.playTone(800, 0.025, 'sine', 0.12), 20);
  }

  public playDiceRoll(): void {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.playTone(200 + Math.random() * 200, 0.03, 'sine', 0.12);
      }, i * 50);
    }
  }

  public playMineReveal(): void {
    this.playTone(700, 0.06, 'sine', 0.2);
    setTimeout(() => this.playTone(900, 0.06, 'sine', 0.18), 40);
  }

  public playMineExplode(): void {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.playTone(60 + Math.random() * 50, 0.1, 'sine', 0.3 - i * 0.04);
      }, i * 30);
    }
  }

  public playTowerClimb(): void {
    this.playTone(500, 0.08, 'sine', 0.2);
    setTimeout(() => this.playTone(700, 0.08, 'sine', 0.22), 80);
  }

  public playKenoHit(): void {
    this.playTone(800, 0.06, 'sine', 0.22);
    setTimeout(() => this.playTone(1000, 0.06, 'sine', 0.2), 50);
  }
}

export const audio = new AudioEngine();
export default audio;
