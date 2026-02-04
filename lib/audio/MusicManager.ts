/**
 * Music Manager
 * Handles music playback across the entire app with automatic crossfading
 * Any component can play music through this manager
 */

class MusicManagerClass {
  private currentMusic: HTMLAudioElement | null = null;
  private currentTrack: string | null = null;
  private musicVolume: number = 0.4;
  private masterVolume: number = 1.0;
  private isMuted: boolean = false;
  private hasUserInteracted: boolean = false;
  private pendingTrack: string | null = null;

  // Fade animation
  private fadeInterval: number | null = null;
  private fadeOutInterval: number | null = null;
  private fadeOutTarget: HTMLAudioElement | null = null;

  constructor() {
    console.log("[MusicManager] Initializing MusicManager");
    this.setupUserInteractionHandler();
    this.loadSettings();
    console.log("[MusicManager] MusicManager initialized:", {
      masterVolume: this.masterVolume,
      musicVolume: this.musicVolume,
      hasUserInteracted: this.hasUserInteracted,
    });
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    if (typeof window === "undefined") return;

    const savedMaster = localStorage.getItem("music-manager-master-volume");
    const savedMusic = localStorage.getItem("music-manager-music-volume");

    if (savedMaster) {
      this.masterVolume = parseInt(savedMaster, 10) / 100;
    }
    if (savedMusic) {
      this.musicVolume = parseInt(savedMusic, 10) / 100;
    }
  }

  /**
   * Setup handler to detect first user interaction (needed for autoplay)
   */
  private setupUserInteractionHandler(): void {
    if (typeof window === "undefined") return;

    const handleInteraction = () => {
      const wasFirstInteraction = !this.hasUserInteracted;
      this.hasUserInteracted = true;

      console.log("[MusicManager] User interaction detected:", {
        wasFirstInteraction,
        pendingTrack: this.pendingTrack,
      });

      // If there's a pending track, play it now (on any interaction, not just first)
      if (this.pendingTrack) {
        const track = this.pendingTrack;
        this.pendingTrack = null;
        console.log(
          "[MusicManager] Playing pending track after interaction:",
          track,
        );
        // Use setTimeout to ensure this happens after the current event
        setTimeout(() => {
          this.play(track);
        }, 0);
      }
    };

    // Listen for various user interactions
    window.addEventListener("click", handleInteraction, { once: false });
    window.addEventListener("keydown", handleInteraction, { once: false });
    window.addEventListener("touchstart", handleInteraction, { once: false });
  }

  /**
   * Play a music track with crossfade transition
   * @param trackPath - Path to the music file (e.g., "/music/rocket-to-heaven/menu.mp3")
   * @param options - Optional settings for loop and fade duration
   */
  play(
    trackPath: string,
    options: { loop?: boolean; fadeDuration?: number } = {},
  ): void {
    if (typeof window === "undefined") return;

    const { loop = true, fadeDuration = 1000 } = options;

    console.log("[MusicManager] play() called:", {
      trackPath,
      currentTrack: this.currentTrack,
      hasUserInteracted: this.hasUserInteracted,
      pendingTrack: this.pendingTrack,
      isPlaying: this.isPlaying(),
    });

    // Cancel any ongoing fade-out when starting new music
    if (this.fadeOutInterval) {
      console.log("[MusicManager] Cancelling ongoing fade-out");
      clearInterval(this.fadeOutInterval);
      this.fadeOutInterval = null;
      this.fadeOutTarget = null;
    }

    // If same track is already playing, do nothing
    if (this.currentTrack === trackPath && this.currentMusic) {
      console.log(
        "[MusicManager] Same track already playing, skipping:",
        trackPath,
      );
      return;
    }

    // If user has already interacted and there's a pending track, clear it
    // (we're about to play a new track)
    if (this.hasUserInteracted && this.pendingTrack) {
      this.pendingTrack = null;
    }

    // Crossfade to new music
    const oldMusic = this.currentMusic;
    const newMusic = new Audio(trackPath);
    newMusic.loop = loop;
    newMusic.volume = 0;
    newMusic.preload = "auto";

    // Set current music immediately
    this.currentMusic = newMusic;
    this.currentTrack = trackPath;

    // Handle load errors
    newMusic.addEventListener(
      "error",
      (e) => {
        console.error("[MusicManager] ❌ Failed to load music:", trackPath, e);
        this.pendingTrack = trackPath;
        this.currentMusic = oldMusic;
        this.currentTrack = oldMusic ? this.currentTrack : null;
      },
      { once: true },
    );

    // Try to play immediately
    console.log("[MusicManager] Attempting to play audio:", trackPath);
    const playPromise = newMusic.play();

    // Handle the play promise
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Successfully started playing - mark as user interacted
          console.log(
            "[MusicManager] ✅ Playback started successfully:",
            trackPath,
          );
          this.hasUserInteracted = true;
          // If there was a pending track, clear it since we're playing now
          this.pendingTrack = null;

          // Start crossfade
          this.startCrossfade(oldMusic, newMusic, fadeDuration);
        })
        .catch((e) => {
          // Autoplay was blocked - queue this track
          console.warn(
            "[MusicManager] ❌ Autoplay blocked, queuing track:",
            trackPath,
            e,
          );
          this.pendingTrack = trackPath;
          // Reset current music since playback failed
          this.currentMusic = oldMusic;
          this.currentTrack = oldMusic ? this.currentTrack : null;
        });
    } else {
      // Older browser - play() doesn't return a promise, assume it worked
      console.log(
        "[MusicManager] ⚠️ Older browser detected, assuming playback succeeded:",
        trackPath,
      );
      this.hasUserInteracted = true;
      this.startCrossfade(oldMusic, newMusic, fadeDuration);
    }
  }

  /**
   * Start crossfade animation between old and new music
   */
  private startCrossfade(
    oldMusic: HTMLAudioElement | null,
    newMusic: HTMLAudioElement,
    fadeDuration: number,
  ): void {
    console.log("[MusicManager] Starting crossfade:", {
      hasOldMusic: oldMusic !== null,
      fadeDuration,
      targetVolume: this.getEffectiveMusicVolume(),
    });

    const steps = 30;
    const stepDuration = fadeDuration / steps;
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
      if (newMusic) {
        newMusic.volume = Math.min(targetVolume, targetVolume * progress);
      }

      if (step >= steps) {
        if (this.fadeInterval) {
          clearInterval(this.fadeInterval);
          this.fadeInterval = null;
        }
        if (oldMusic) {
          oldMusic.pause();
        }
        console.log("[MusicManager] Crossfade complete");
      }
    }, stepDuration);
  }

  /**
   * Stop music with optional fade-out
   */
  stop(fadeOut: boolean = true): void {
    console.log("[MusicManager] stop() called:", {
      fadeOut,
      currentTrack: this.currentTrack,
      hasMusic: this.currentMusic !== null,
    });

    if (!this.currentMusic) {
      console.log("[MusicManager] No music to stop");
      this.currentTrack = null;
      return;
    }

    // Cancel any ongoing fade-out before starting a new one
    if (this.fadeOutInterval) {
      clearInterval(this.fadeOutInterval);
      this.fadeOutInterval = null;
      this.fadeOutTarget = null;
    }

    if (fadeOut) {
      console.log("[MusicManager] Stopping with fade out");
      const musicToFade = this.currentMusic;
      this.fadeOutTarget = musicToFade;
      this.fadeOut(musicToFade, 1000, () => {
        // Only stop if this is still the current music (not replaced by new music)
        if (
          this.currentMusic === musicToFade &&
          this.fadeOutTarget === musicToFade
        ) {
          this.currentMusic?.pause();
          this.currentMusic = null;
          this.currentTrack = null;
          console.log("[MusicManager] Fade out complete, music stopped");
        } else {
          console.log("[MusicManager] Fade-out cancelled - music was replaced");
        }
        this.fadeOutInterval = null;
        this.fadeOutTarget = null;
      });
    } else {
      console.log("[MusicManager] Stopping immediately");
      this.currentMusic.pause();
      this.currentMusic = null;
      this.currentTrack = null;
      console.log("[MusicManager] Music stopped");
    }
  }

  /**
   * Get current track path
   */
  getCurrentTrack(): string | null {
    return this.currentTrack;
  }

  /**
   * Check if music is currently playing
   */
  isPlaying(): boolean {
    return this.currentMusic !== null && !this.currentMusic.paused;
  }

  /**
   * Set master volume (affects everything)
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.currentMusic) {
      this.currentMusic.volume = this.getEffectiveMusicVolume();
    }
    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "music-manager-master-volume",
        Math.round(volume * 100).toString(),
      );
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
    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "music-manager-music-volume",
        Math.round(volume * 100).toString(),
      );
    }
  }

  /**
   * Get master volume (0-1)
   */
  getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Get music volume (0-1)
   */
  getMusicVolume(): number {
    return this.musicVolume;
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

  private getEffectiveMusicVolume(): number {
    return this.isMuted ? 0 : this.musicVolume * this.masterVolume;
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

    // Store the interval so it can be cancelled
    this.fadeOutInterval = window.setInterval(() => {
      step++;
      // Only fade if this is still the target audio
      if (audio === this.fadeOutTarget) {
        audio.volume = Math.max(0, startVolume * (1 - step / steps));
      }

      if (step >= steps) {
        if (this.fadeOutInterval) {
          clearInterval(this.fadeOutInterval);
          this.fadeOutInterval = null;
        }
        onComplete?.();
      }
    }, stepDuration);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop(false);
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }
  }
}

// Singleton instance
export const musicManager = new MusicManagerClass();
