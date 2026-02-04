import { create } from "zustand";

export interface GameState {
  // Player state
  height: number; // Current altitude (0 to 10000)
  maxHeight: number; // Highest altitude reached
  graceOrbs: number; // Double jump charges
  isDead: boolean;
  hasWon: boolean;
  hasReachedHeaven: boolean; // Track if player has ever reached heaven (for block transformation)

  // Game state
  isPaused: boolean;
  showPauseMenu: boolean;
  gameStarted: boolean;
  playTimeSeconds: number; // Total play time in seconds
  gameStartTime: number; // Timestamp when game started
  deathCause: "lava" | "block" | null; // What killed the player
  killerBlockLabel: string | null; // Label of the block that killed the player

  // Boost state
  hasNearMissBoost: boolean;
  nearMissBoostEndTime: number;

  // Mobile input
  joystickInput: { x: number; y: number } | null;
  jumpPressed: boolean;

  // Auth modal
  showAuthModal: boolean;

  // Actions
  setHeight: (height: number) => void;
  updateMaxHeight: (height: number) => void;
  addGraceOrb: () => void;
  useGraceOrb: () => boolean;
  setDead: (
    dead: boolean,
    cause?: "lava" | "block",
    blockLabel?: string,
  ) => void;
  setWon: (won: boolean) => void;
  setReachedHeaven: (reached: boolean) => void;
  setPaused: (paused: boolean) => void;
  togglePauseMenu: () => void;
  setGameStarted: (started: boolean) => void;
  setNearMissBoost: (active: boolean) => void;
  setJoystickInput: (x: number, y: number) => void;
  clearJoystickInput: () => void;
  setJumpPressed: (pressed: boolean) => void;
  closePauseMenu: () => void;
  updatePlayTime: (deltaMs: number) => void;
  setAuthModal: (show: boolean) => void;
  reset: () => void;
}

const NEAR_MISS_BOOST_DURATION = 1500; // 1.5 seconds

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  height: 0,
  maxHeight: 0,
  graceOrbs: 0,
  isDead: false,
  hasWon: false,
  hasReachedHeaven: false,
  isPaused: false,
  showPauseMenu: false,
  gameStarted: false,
  playTimeSeconds: 0,
  gameStartTime: 0,
  deathCause: null,
  killerBlockLabel: null,
  hasNearMissBoost: false,
  nearMissBoostEndTime: 0,
  joystickInput: null,
  jumpPressed: false,
  showAuthModal: false,

  // Set current height
  setHeight: (height: number) => set({ height }),

  // Update max height if current is higher
  updateMaxHeight: (height: number) => {
    const { maxHeight } = get();
    if (height > maxHeight) {
      set({ maxHeight: height });
    }
  },

  // Add a grace orb (max 3)
  addGraceOrb: () => {
    const { graceOrbs } = get();
    if (graceOrbs < 3) {
      set({ graceOrbs: graceOrbs + 1 });
    }
  },

  // Use a grace orb for double jump
  useGraceOrb: () => {
    const { graceOrbs } = get();
    if (graceOrbs > 0) {
      set({ graceOrbs: graceOrbs - 1 });
      return true;
    }
    return false;
  },

  // Set dead state
  setDead: (dead: boolean, cause?: "lava" | "block", blockLabel?: string) =>
    set({
      isDead: dead,
      isPaused: dead,
      deathCause: dead ? cause || null : null,
      killerBlockLabel: dead ? blockLabel || null : null,
    }),

  // Set won state
  setWon: (won: boolean) => set({ hasWon: won, isPaused: won }),

  // Set reached heaven state
  setReachedHeaven: (reached: boolean) => set({ hasReachedHeaven: reached }),

  // Set paused
  setPaused: (paused: boolean) => set({ isPaused: paused }),

  // Toggle pause menu
  togglePauseMenu: () => {
    const { showPauseMenu, isDead, hasWon } = get();
    if (isDead || hasWon) return;

    const newShowPauseMenu = !showPauseMenu;
    set({
      showPauseMenu: newShowPauseMenu,
      isPaused: newShowPauseMenu,
    });
  },

  // Set game started
  setGameStarted: (started: boolean) => {
    if (started) {
      set({ gameStarted: true, gameStartTime: Date.now(), playTimeSeconds: 0 });
    } else {
      set({ gameStarted: false });
    }
  },

  // Update play time
  updatePlayTime: (deltaMs: number) => {
    const { playTimeSeconds } = get();
    set({ playTimeSeconds: playTimeSeconds + deltaMs / 1000 });
  },

  // Set auth modal visibility
  setAuthModal: (show: boolean) => {
    const state = get();
    set({
      showAuthModal: show,
      // Only update isPaused if we're not already paused for another reason
      isPaused: show
        ? true
        : state.showPauseMenu || state.isDead || state.hasWon,
    });
  },

  // Set near miss boost
  setNearMissBoost: (active: boolean) => {
    if (active) {
      set({
        hasNearMissBoost: true,
        nearMissBoostEndTime: Date.now() + NEAR_MISS_BOOST_DURATION,
      });
    } else {
      set({ hasNearMissBoost: false, nearMissBoostEndTime: 0 });
    }
  },

  // Mobile joystick input
  setJoystickInput: (x: number, y: number) => set({ joystickInput: { x, y } }),
  clearJoystickInput: () => set({ joystickInput: null }),

  // Jump button state
  setJumpPressed: (pressed: boolean) => set({ jumpPressed: pressed }),

  // Close pause menu
  closePauseMenu: () => set({ showPauseMenu: false, isPaused: false }),

  // Reset game
  reset: () =>
    set({
      height: 0,
      maxHeight: 0,
      graceOrbs: 0,
      isDead: false,
      hasWon: false,
      hasReachedHeaven: false,
      isPaused: false,
      showPauseMenu: false,
      gameStarted: false,
      playTimeSeconds: 0,
      gameStartTime: 0,
      deathCause: null,
      killerBlockLabel: null,
      hasNearMissBoost: false,
      nearMissBoostEndTime: 0,
      joystickInput: null,
      jumpPressed: false,
      showAuthModal: false,
    }),
}));
