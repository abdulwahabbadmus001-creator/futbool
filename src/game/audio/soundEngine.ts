import { MatchImportance } from '../../types/football';
import { SimSoundEvent } from '../engine/Simulation';

class SoundEngine {
  private ctx: AudioContext | null = null;
  public sfxVolume = 0.75;
  public crowdVolume = 0.55;
  public muted = false;

  // Dynamic stadium atmosphere bed nodes
  private crowdSource: AudioBufferSourceNode | null = null;
  private crowdGain: GainNode | null = null;
  private chantOsc: OscillatorNode | null = null;
  private chantGain: GainNode | null = null;
  private lastAnnounceAt = 0;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      try {
        this.ctx = new Ctx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setVolumes(sfx: number, crowd: number): void {
    this.sfxVolume = sfx;
    this.crowdVolume = crowd;
  }

  public playMenuClick(pitch = 660): void {
    const ctx = this.ensureContext();
    if (!ctx || this.sfxVolume <= 0.01) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.35, now + 0.045);
    gain.gain.setValueAtTime(0.08 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playBroadcastChime(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.sfxVolume <= 0.01) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.001, now + i * 0.07);
      gain.gain.linearRampToValueAtTime(0.065 * this.sfxVolume, now + i * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.27);
    });
  }

  public announceEvent(event: 'goal' | 'halftime' | 'fulltime' | string, detail?: string): void {
    if (this.muted || this.sfxVolume <= 0.05) return;
    const now = performance.now();
    if (now - this.lastAnnounceAt < 2500) return;
    this.lastAnnounceAt = now;
    this.playBroadcastChime();
    const text =
      event === 'goal'
        ? `Goal! ${detail ?? ''}`.trim()
        : event === 'halftime'
          ? 'Half time whistle!'
          : event === 'fulltime'
            ? 'Full time! Match complete.'
            : detail
              ? `${event} ${detail}`
              : event;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const utter = new SpeechSynthesisUtterance(text);
        utter.volume = Math.min(0.85, this.sfxVolume * 0.75);
        utter.rate = 1.06;
        utter.pitch = 0.96;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      } catch {
        // Safe fallback when headless browser blocks speechSynthesis
      }
    }
  }

  public updateCrowdBed(
    intensity: number,
    importance: MatchImportance = 'friendly',
    isPaused = false
  ): void {
    if (this.muted || isPaused || this.crowdVolume <= 0.02) {
      this.stopCrowdBed();
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (!this.crowdSource || !this.crowdGain) {
      try {
        const sampleRate = ctx.sampleRate;
        const length = sampleRate * 2;
        const buffer = ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        let smooth = 0;
        for (let i = 0; i < length; i++) {
          smooth = smooth * 0.92 + (Math.random() * 2 - 1) * 0.08;
          data[i] = smooth * 2.4;
        }
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 460;
        filter.Q.value = 0.7;

        const gain = ctx.createGain();
        gain.gain.value = 0.01;

        src.connect(filter).connect(gain).connect(ctx.destination);
        src.start();

        const chant = ctx.createOscillator();
        chant.type = 'sawtooth';
        chant.frequency.value = 118;
        const chantFilter = ctx.createBiquadFilter();
        chantFilter.type = 'lowpass';
        chantFilter.frequency.value = 240;
        const chantGain = ctx.createGain();
        chantGain.gain.value = 0.002;
        chant.connect(chantFilter).connect(chantGain).connect(ctx.destination);
        chant.start();

        this.crowdSource = src;
        this.crowdGain = gain;
        this.chantOsc = chant;
        this.chantGain = chantGain;
      } catch {
        return;
      }
    }

    const impScale =
      importance === 'final' ? 1.4 : importance === 'derby' ? 1.3 : importance === 'cup' ? 1.18 : 1.0;
    const baseLevel = Math.min(0.14, (0.018 + intensity * 0.075) * this.crowdVolume * impScale);
    const chantPulse = 0.5 + 0.5 * Math.sin(ctx.currentTime * (2.2 + intensity * 2.5));
    const chantLevel = baseLevel * 0.28 * chantPulse;

    this.crowdGain.gain.setTargetAtTime(baseLevel, ctx.currentTime, 0.15);
    if (this.chantGain) {
      this.chantGain.gain.setTargetAtTime(chantLevel, ctx.currentTime, 0.15);
    }
  }

  public stopCrowdBed(): void {
    try {
      this.crowdSource?.stop();
      this.crowdSource?.disconnect();
    } catch {
      // ignore
    }
    try {
      this.chantOsc?.stop();
      this.chantOsc?.disconnect();
    } catch {
      // ignore
    }
    this.crowdSource = null;
    this.crowdGain = null;
    this.chantOsc = null;
    this.chantGain = null;
  }

  public playSimEvent(event: SimSoundEvent): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    switch (event) {
      case 'kick':
        this.playThump(130, 48, 0.14, 0.32 * this.sfxVolume);
        break;
      case 'pass':
        this.playThump(170, 68, 0.09, 0.2 * this.sfxVolume);
        break;
      case 'tackle':
        this.playNoiseBurst(0.11, 600, 0.18 * this.sfxVolume);
        break;
      case 'post':
        this.playMetallicClang();
        break;
      case 'save':
        this.playThump(150, 55, 0.12, 0.25 * this.sfxVolume);
        this.playNoiseBurst(0.28, 1200, 0.14 * this.crowdVolume);
        break;
      case 'whistle-start':
        this.playWhistle(0.45);
        break;
      case 'whistle-short':
        this.playWhistle(0.22);
        break;
      case 'whistle-full':
        this.playWhistle(0.24);
        setTimeout(() => this.playWhistle(0.24), 290);
        setTimeout(() => this.playWhistle(0.55), 580);
        break;
      case 'goal':
        this.playWhistle(0.3);
        this.playNoiseBurst(1.6, 900, 0.35 * this.crowdVolume);
        break;
      case 'crowd-ooh':
        this.playNoiseBurst(0.6, 700, 0.16 * this.crowdVolume);
        break;
    }
  }

  private playThump(startFreq: number, endFreq: number, duration: number, vol: number): void {
    if (!this.ctx || vol <= 0.005) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const jitter = 0.94 + Math.random() * 0.12;
    osc.frequency.setValueAtTime(startFreq * jitter, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  private playWhistle(duration: number): void {
    if (!this.ctx || this.sfxVolume <= 0.01) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(2850, now);
    osc2.frequency.setValueAtTime(2980, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11 * this.sfxVolume, now + 0.02);
    gain.gain.setValueAtTime(0.11 * this.sfxVolume, now + duration - 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.02);
    osc2.stop(now + duration + 0.02);
  }

  private playMetallicClang(): void {
    if (!this.ctx || this.sfxVolume <= 0.01) return;
    const now = this.ctx.currentTime;
    [420, 760, 1180].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime((0.14 / (idx + 1)) * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    });
  }

  private playNoiseBurst(duration: number, cutoffHz: number, vol: number): void {
    if (!this.ctx || vol <= 0.005) return;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.7;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = cutoffHz;
    filter.Q.value = 0.8;

    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(filter).connect(gain).connect(this.ctx.destination);
    source.start(now);
  }
}

export const soundEngine = new SoundEngine();
