/**
 * Audio Manager for Rocket to Heaven
 * Handles music playback with crossfading and SFX with throttling/pitch modulation
 */

export type MusicTrack = "menu" | "gameplay" | "death" | "victory";
export type SFXType =
  | "jump"
  | "double-jump"
  | "death"
  | "victory"
  | "grace"
  | "block-hit"
  | "block-destroy"
  | "dash"
  | "ui-click"
  | "ui-hover";

interface SFXOptions {
  throttleMs?: number;
  pitchVariation?: number; // 0-1, e.g., 0.2 means +/- 20%
  volume?: number; // 0-1
}

const SFX_PATHS: Record<SFXType, string> = {
  jump: "/sfx/rocket-to-heaven/jump.mp3",
  "double-jump": "/sfx/rocket-to-heaven/double-jump.mp3",
  death: "/sfx/rocket-to-heaven/death.mp3",
  victory: "/sfx/rocket-to-heaven/victory.mp3",
  grace: "/sfx/rocket-to-heaven/grace.mp3",
  "block-hit": "/sfx/rocket-to-heaven/block-hit.mp3",
  "block-destroy": "/sfx/rocket-to-heaven/block-destroy.mp3",
  dash: "/sfx/rocket-to-heaven/dash.mp3",
  "ui-click": "/sfx/ui-click.mp3",
  "ui-hover": "/sfx/ui-hover.mp3",
};

const MUSIC_PATHS: Record<MusicTrack, string> = {
  menu: "/music/rocket-to-heaven/menu.mp3",
  gameplay: "/music/rocket-to-heaven/gameplay.mp3",
  death: "/music/rocket-to-heaven/death.mp3",
  victory: "/music/rocket-to-heaven/victory.mp3",
};

// Default SFX configurations
// Jump sounds have pitch variation for variety (like hexii)
// All volumes reduced by 40% from original values, then jump sounds reduced by another 50%
const SFX_DEFAULTS: Record<SFXType, SFXOptions> = {
  jump: { throttleMs: 100, pitchVariation: 0.2, volume: 0.18 },
  "double-jump": { throttleMs: 100, pitchVariation: 0.15, volume: 0.21 },
  death: { throttleMs: 0, pitchVariation: 0, volume: 0.48 },
  victory: { throttleMs: 0, pitchVariation: 0, volume: 0.54 },
  grace: { throttleMs: 50, pitchVariation: 0.1, volume: 0.36 },
  "block-hit": { throttleMs: 100, pitchVariation: 0.15, volume: 0.3 },
  "block-destroy": { throttleMs: 0, pitchVariation: 0.1, volume: 0.4 },
  dash: { throttleMs: 50, pitchVariation: 0.1, volume: 0.25 },
  "ui-click": { throttleMs: 50, pitchVariation: 0, volume: 0.7 },
  "ui-hover": { throttleMs: 100, pitchVariation: 0.1, volume: 0.05 },
};

class AudioManagerClass {
  private currentMusic: HTMLAudioElement | null = null;
  private currentMusicTrack: MusicTrack | null = null;
  private musicVolume: number = 0.4;
  private masterVolume: number = 1.0;
  private isMuted: boolean = false;
  private hasUserInteracted: boolean = false;
  private pendingTrack: MusicTrack | null = null;

  // SFX pooling and throttling
  private sfxPool: Map<SFXType, HTMLAudioElement[]> = new Map();
  private sfxLastPlayed: Map<SFXType, number> = new Map();
  private readonly POOL_SIZE = 5;

  // Fade animation
  private fadeInterval: number | null = null;

  constructor() {
    // Pre-load SFX pools
    this.initializeSFXPools();
    this.setupUserInteractionHandler();
  }

  private initializeSFXPools(): void {
    // Only initialize in browser environment
    if (typeof window === "undefined") return;

    (Object.keys(SFX_PATHS) as SFXType[]).forEach((sfx) => {
      const pool: HTMLAudioElement[] = [];
      for (let i = 0; i < this.POOL_SIZE; i++) {
        const audio = new Audio(SFX_PATHS[sfx]);
        audio.preload = "auto";
        pool.push(audio);
      }
      this.sfxPool.set(sfx, pool);
      this.sfxLastPlayed.set(sfx, 0);
    });
  }

  /**
   * Setup handler to detect first user interaction (needed for autoplay)
   */
  private setupUserInteractionHandler(): void {
    if (typeof window === "undefined") return;

    const handleInteraction = () => {
      if (!this.hasUserInteracted) {
        this.hasUserInteracted = true;
        // If there's a pending track, play it now
        if (this.pendingTrack) {
          this.playMusic(this.pendingTrack);
          this.pendingTrack = null;
        }
      }
    };

    // Listen for various user interactions
    window.addEventListener("click", handleInteraction, { once: false });
    window.addEventListener("keydown", handleInteraction, { once: false });
    window.addEventListener("touchstart", handleInteraction, { once: false });
  }

  /**
   * Play a music track with optional fade-in
   */
  playMusic(track: MusicTrack, fadeIn: boolean = true): void {
    if (typeof window === "undefined") return;
    if (this.currentMusicTrack === track && this.currentMusic) return;

    // If no user interaction yet, save the track and wait
    if (!this.hasUserInteracted) {
      this.pendingTrack = track;
      return;
    }

    // Stop current music
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic = null;
    }

    const audio = new Audio(MUSIC_PATHS[track]);
    audio.loop = true;
    audio.volume = fadeIn ? 0 : this.getEffectiveMusicVolume();

    this.currentMusic = audio;
    this.currentMusicTrack = track;

    audio.play().catch((e) => console.warn("Music playback failed:", e));

    if (fadeIn) {
      this.fadeIn(audio, this.getEffectiveMusicVolume(), 1500);
    }
  }

  /**
   * Crossfade to a new music track
   */
  crossfadeTo(track: MusicTrack, duration: number = 1500): void {
    if (typeof window === "undefined") return;
    if (this.currentMusicTrack === track) return;

    // If no user interaction yet, just queue the track
    if (!this.hasUserInteracted) {
      this.pendingTrack = track;
      return;
    }

    const oldMusic = this.currentMusic;
    const newMusic = new Audio(MUSIC_PATHS[track]);
    newMusic.loop = true;
    newMusic.volume = 0;

    this.currentMusic = newMusic;
    this.currentMusicTrack = track;

    newMusic.play().catch((e) => console.warn("Music playback failed:", e));

    // Crossfade
    const steps = 30;
    const stepDuration = duration / steps;
    const targetVolume = this.getEffectiveMusicVolume();
    let step = 0;

    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }

    this.fadeInterval = window.setInterval(() => {
      step++;
      const progress = step / steps;

      // Fade out old music
      if (oldMusic) {
        oldMusic.volume = Math.max(0, targetVolume * (1 - progress));
      }

      // Fade in new music
      newMusic.volume = Math.min(targetVolume, targetVolume * progress);

      if (step >= steps) {
        if (this.fadeInterval) {
          clearInterval(this.fadeInterval);
          this.fadeInterval = null;
        }
        if (oldMusic) {
          oldMusic.pause();
        }
      }
    }, stepDuration);
  }

  /**
   * Stop music with optional fade-out
   */
  stopMusic(fadeOut: boolean = true): void {
    if (!this.currentMusic) return;

    if (fadeOut) {
      this.fadeOut(this.currentMusic, 1000, () => {
        this.currentMusic?.pause();
        this.currentMusic = null;
        this.currentMusicTrack = null;
      });
    } else {
      this.currentMusic.pause();
      this.currentMusic = null;
      this.currentMusicTrack = null;
    }
  }

  /**
   * Play a sound effect with throttling and pitch modulation
   */
  playSFX(sfx: SFXType, options?: Partial<SFXOptions>): void {
    if (typeof window === "undefined") return;
    if (this.isMuted) return;

    const defaults = SFX_DEFAULTS[sfx];
    const opts = { ...defaults, ...options };

    // Check throttling
    const now = Date.now();
    const lastPlayed = this.sfxLastPlayed.get(sfx) || 0;
    if (opts.throttleMs && now - lastPlayed < opts.throttleMs) {
      return;
    }
    this.sfxLastPlayed.set(sfx, now);

    // Get available audio from pool
    const pool = this.sfxPool.get(sfx);
    if (!pool) return;

    // Find an audio element that's not playing or use the first one
    let audio = pool.find((a) => a.paused || a.ended);
    if (!audio) {
      audio = pool[0];
      audio.currentTime = 0;
    }

    // Apply volume
    audio.volume = (opts.volume || 1) * this.masterVolume;

    // Apply pitch variation using playbackRate (like hexii)
    if (opts.pitchVariation && opts.pitchVariation > 0) {
      const variation = (Math.random() * 2 - 1) * opts.pitchVariation;
      audio.playbackRate = 1 + variation;
    } else {
      audio.playbackRate = 1;
    }

    audio.currentTime = 0;
    audio.play().catch((e) => console.warn("SFX playback failed:", e));
  }

  /**
   * Set master volume (affects everything)
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.currentMusic) {
      this.currentMusic.volume = this.getEffectiveMusicVolume();
    }
  }

  /**
   * Set music volume
   */
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.currentMusic) {
      this.currentMusic.volume = this.getEffectiveMusicVolume();
    }
  }

  /**
   * Toggle mute
   */
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.currentMusic) {
      this.currentMusic.volume = this.isMuted
        ? 0
        : this.getEffectiveMusicVolume();
    }
    return this.isMuted;
  }

  /**
   * Get mute state
   */
  getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Get current music track
   */
  getCurrentTrack(): MusicTrack | null {
    return this.currentMusicTrack;
  }

  private getEffectiveMusicVolume(): number {
    return this.isMuted ? 0 : this.musicVolume * this.masterVolume;
  }

  private fadeIn(
    audio: HTMLAudioElement,
    targetVolume: number,
    duration: number,
  ): void {
    const steps = 30;
    const stepDuration = duration / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      audio.volume = Math.min(targetVolume, (step / steps) * targetVolume);

      if (step >= steps) {
        clearInterval(interval);
      }
    }, stepDuration);
  }

  private fadeOut(
    audio: HTMLAudioElement,
    duration: number,
    onComplete?: () => void,
  ): void {
    const startVolume = audio.volume;
    const steps = 30;
    const stepDuration = duration / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      audio.volume = Math.max(0, startVolume * (1 - step / steps));

      if (step >= steps) {
        clearInterval(interval);
        onComplete?.();
      }
    }, stepDuration);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopMusic(false);
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }
    this.sfxPool.clear();
    this.sfxLastPlayed.clear();
  }
}

// Singleton instance
export const audioManager = new AudioManagerClass();
