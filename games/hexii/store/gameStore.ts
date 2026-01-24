import { create } from 'zustand';
import type { RingOfPerfectionType } from '../game/utils/SynergyCalculator';
import { BASE_HEX_STATS } from '../game/config/SynergyConfig';
import type { BossShape } from '../game/data/BossDialogues';

export type HexColor = 'RED' | 'GREEN' | 'YELLOW' | 'BLUE' | 'CYAN' | 'ORANGE';
export type HexType = 'CORE' | 'MODULE';

export interface HexModule {
  type: HexType;
  color: HexColor;
  health: number;
}

export interface GameState {
  // Ship state - stored as Map with "q,r" keys
  ship: Record<string, HexModule>;
  
  // Player stats
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  level: number;
  exp: number;
  expToNextLevel: number;
  pickupRadiusBonus: number; // Extra pickup radius from CYAN hexes
  damageReduction: number; // From ORANGE hexes
  shieldRegenRate: number; // Calculated from synergies (per second)
  hpRegenRate: number; // Calculated from synergies (per second)
  activeUltimates: RingOfPerfectionType[]; // Ring of Perfection effects
  
  // Game state
  isConstructionMode: boolean;
  pendingHex: HexModule | null;
  pendingHexChoices: HexModule[] | null; // For level up: 3 choices
  isPaused: boolean;
  showPauseMenu: boolean; // Show pause menu overlay
  isDead: boolean; // Player is dead
  showWaveAnnouncement: boolean; // Show wave announcement overlay
  score: number;
  wave: number;
  
  // Boss state
  bossHp: number | null;
  bossMaxHp: number | null;
  bossNumber: number; // 1-5, cycles after 5
  bossesDefeated: number; // Total bosses killed (for scaling)
  showBossDialogue: boolean;
  bossDialoguePhase: 'pan_to_boss' | 'boss_talking' | 'pan_to_player' | 'player_talking' | null;
  currentBossType: BossShape | null;
  bossPosition: { x: number; y: number } | null; // For camera panning
  showWinScreen: boolean;
  hasWon: boolean; // True after first septagon defeat
  
  // Actions
  initializeShip: (coreColor: HexColor) => void;
  attachHex: (key: string, hex: HexModule) => void;
  setConstructionMode: (isOpen: boolean, hex?: HexModule) => void;
  setConstructionModeWithChoices: (choices: HexModule[]) => void;
  selectHexChoice: (index: number) => void;
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;
  regenShield: (amount: number) => void;
  setPaused: (paused: boolean) => void;
  togglePauseMenu: () => void;
  closePauseMenu: () => void;
  addScore: (points: number) => void;
  addExp: (amount: number) => void;
  levelUp: () => void;
  nextWave: () => void;
  setBossHealth: (hp: number | null, maxHp: number | null) => void;
  setDead: (dead: boolean) => void;
  setWaveAnnouncement: (show: boolean) => void;
  setBossDialogue: (show: boolean, bossType?: BossShape, bossPos?: { x: number; y: number }) => void;
  setBossDialoguePhase: (phase: 'pan_to_boss' | 'boss_talking' | 'pan_to_player' | 'player_talking' | null) => void;
  defeatBoss: (bossType?: string) => void;
  setWinScreen: (show: boolean) => void;
  reset: () => void;
}

// Calculate base stats (without synergies - synergies calculated in game code)
const calculateBaseStats = (ship: Record<string, HexModule>) => {
  let maxHp = 100; // Base HP
  let maxShield = 0;
  let pickupRadiusBonus = 0;
  let damageReduction = 0;
  
  // Base stats from hexes (using config values)
  Object.values(ship).forEach((hex) => {
    if (hex.color === 'GREEN') maxHp += BASE_HEX_STATS.GREEN.hpPerHex;
    if (hex.color === 'BLUE') maxShield += BASE_HEX_STATS.BLUE.shieldPerHex;
    if (hex.color === 'CYAN') pickupRadiusBonus += BASE_HEX_STATS.CYAN.pickupRadiusPerHex;
    if (hex.color === 'ORANGE') damageReduction += BASE_HEX_STATS.ORANGE.damageReductionPerHex;
  });
  
  return { 
    maxHp, 
    maxShield, 
    pickupRadiusBonus, 
    damageReduction,
  };
};

// Calculate stats with synergies (called from game code, not during SSR)
const calculateStats = (ship: Record<string, HexModule>) => {
  const baseStats = calculateBaseStats(ship);
  let shieldRegenRate = 0;
  let hpRegenRate = 0;
  const activeUltimates: RingOfPerfectionType[] = [];
  
  // Synergy calculations happen in MainScene/Player where we're guaranteed to be in browser
  // For now, return base stats - MainScene will update regen rates
  
  return { 
    ...baseStats,
    shieldRegenRate,
    hpRegenRate,
    activeUltimates,
  };
};

// Calculate exp needed for next level
const calculateExpToNextLevel = (level: number): number => {
  return 10 + (level * 5); // Base 10, +5 per level
};

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  ship: {},
  hp: 100,
  maxHp: 100,
  shield: 0,
  maxShield: 0,
  level: 1,
  exp: 0,
  expToNextLevel: 10,
  pickupRadiusBonus: 0,
  damageReduction: 0,
  shieldRegenRate: 0,
  hpRegenRate: 0,
  activeUltimates: [],
  isConstructionMode: false,
  pendingHex: null,
  pendingHexChoices: null,
  isPaused: false,
  showPauseMenu: false,
  isDead: false,
  showWaveAnnouncement: false,
  score: 0,
  wave: 1,
  bossHp: null,
  bossMaxHp: null,
  bossNumber: 1,
  bossesDefeated: 0,
  showBossDialogue: false,
  bossDialoguePhase: null,
  currentBossType: null,
  bossPosition: null,
  showWinScreen: false,
  hasWon: false,
  
  // Initialize ship with core
  initializeShip: (coreColor: HexColor) => {
    const ship: Record<string, HexModule> = {
      '0,0': { type: 'CORE', color: coreColor, health: 100 },
    };
    const stats = calculateStats(ship);
    
    set({
      ship,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      shield: stats.maxShield,
      maxShield: stats.maxShield,
      pickupRadiusBonus: stats.pickupRadiusBonus,
      damageReduction: stats.damageReduction,
      shieldRegenRate: stats.shieldRegenRate,
      hpRegenRate: stats.hpRegenRate,
      activeUltimates: stats.activeUltimates,
      score: 0,
      wave: 1,
      level: 1,
      exp: 0,
      expToNextLevel: calculateExpToNextLevel(1),
      bossNumber: 1,
      bossesDefeated: 0,
      showBossDialogue: false,
      bossDialoguePhase: null,
      currentBossType: null,
      bossPosition: null,
      showWinScreen: false,
      hasWon: false,
    });
  },
  
  // Attach a new hex to the ship
  attachHex: (key: string, hex: HexModule) => {
    const newShip = { ...get().ship, [key]: hex };
    const stats = calculateStats(newShip);
    
    // Heal for the HP difference when adding GREEN
    const hpDiff = stats.maxHp - get().maxHp;
    
    // Auto-fill shield when adding BLUE hex (+10 shield)
    let newShield = get().shield;
    if (hex.color === 'BLUE') {
      newShield = Math.min(get().shield + 10, stats.maxShield);
    } else {
      newShield = Math.min(get().shield, stats.maxShield);
    }
    
    set({
      ship: newShip,
      maxHp: stats.maxHp,
      maxShield: stats.maxShield,
      pickupRadiusBonus: stats.pickupRadiusBonus,
      damageReduction: stats.damageReduction,
      shieldRegenRate: stats.shieldRegenRate,
      hpRegenRate: stats.hpRegenRate,
      activeUltimates: stats.activeUltimates,
      hp: Math.min(get().hp + hpDiff, stats.maxHp),
      shield: newShield,
      isConstructionMode: false,
      pendingHex: null,
      pendingHexChoices: null,
      isPaused: false, // Explicitly unpause when attaching hex
    });
  },
  
  // Enter/exit construction mode (for boss drops - single hex, no choice)
  setConstructionMode: (isOpen: boolean, hex?: HexModule) => {
    set({
      isConstructionMode: isOpen,
      pendingHex: hex || null,
      pendingHexChoices: null,
      isPaused: isOpen,
    });
  },
  
  // Enter construction mode with choices (for level up)
  setConstructionModeWithChoices: (choices: HexModule[]) => {
    set({
      isConstructionMode: true,
      pendingHex: null,
      pendingHexChoices: choices,
      isPaused: true,
    });
  },
  
  // Select a hex from the choices
  selectHexChoice: (index: number) => {
    const choices = get().pendingHexChoices;
    if (choices && choices[index]) {
      set({
        pendingHex: choices[index],
        pendingHexChoices: null,
      });
    }
  },
  
  // Take damage (shield first, then HP, with damage reduction only on HP)
  takeDamage: (amount: number) => {
    const { shield, hp, damageReduction } = get();
    
    // Shield takes full damage (no reduction)
    if (shield >= amount) {
      set({ shield: shield - amount });
    } else {
      const remaining = amount - shield;
      // Apply damage reduction only to HP damage
      const reducedHpDamage = Math.max(1, remaining - damageReduction);
      set({
        shield: 0,
        hp: Math.max(0, hp - reducedHpDamage),
      });
    }
  },
  
  // Heal HP
  heal: (amount: number) => {
    const { hp, maxHp } = get();
    set({ hp: Math.min(hp + amount, maxHp) });
  },
  
  // Regenerate shield
  regenShield: (amount: number) => {
    const { shield, maxShield } = get();
    set({ shield: Math.min(shield + amount, maxShield) });
  },
  
  // Pause/unpause
  setPaused: (paused: boolean) => set({ isPaused: paused }),
  
  // Toggle pause menu (ESC key)
  togglePauseMenu: () => {
    const { showPauseMenu, isConstructionMode } = get();
    // Don't toggle if in construction mode
    if (isConstructionMode) return;
    
    const newShowPauseMenu = !showPauseMenu;
    set({
      showPauseMenu: newShowPauseMenu,
      isPaused: newShowPauseMenu,
    });
  },
  
  // Close pause menu (resume game)
  closePauseMenu: () => set({ showPauseMenu: false, isPaused: false }),
  
  // Add score
  addScore: (points: number) => set({ score: get().score + points }),
  
  // Add experience
  addExp: (amount: number) => {
    const { exp, expToNextLevel, level } = get();
    const newExp = exp + amount;
    
    if (newExp >= expToNextLevel) {
      // Level up!
      const remainingExp = newExp - expToNextLevel;
      const newLevel = level + 1;
      set({
        exp: remainingExp,
        level: newLevel,
        expToNextLevel: calculateExpToNextLevel(newLevel),
      });
      // Trigger level up (will open construction mode)
      get().levelUp();
    } else {
      set({ exp: newExp });
    }
  },
  
  // Level up - generate 3 random hex choices for player to pick from
  levelUp: () => {
    const colors: HexColor[] = ['RED', 'GREEN', 'YELLOW', 'BLUE', 'CYAN', 'ORANGE'];
    
    // Generate 3 unique random colors
    const shuffled = [...colors].sort(() => Math.random() - 0.5);
    const choices: HexModule[] = shuffled.slice(0, 3).map((color) => ({
      type: 'MODULE' as HexType,
      color,
      health: 100,
    }));
    
    get().setConstructionModeWithChoices(choices);
  },
  
  // Next wave
  nextWave: () => set({ wave: get().wave + 1 }),
  
  // Set boss health (null to hide)
  setBossHealth: (hp: number | null, maxHp: number | null) => set({ bossHp: hp, bossMaxHp: maxHp }),
  
  // Set dead state
  setDead: (dead: boolean) => set({ isDead: dead }),
  
  // Set wave announcement visibility
  setWaveAnnouncement: (show: boolean) => set({ showWaveAnnouncement: show }),
  
  // Set boss dialogue visibility
  setBossDialogue: (show: boolean, bossType?: BossShape, bossPos?: { x: number; y: number }) => {
    set({
      showBossDialogue: show,
      bossDialoguePhase: show ? 'pan_to_boss' : null,
      currentBossType: bossType || null,
      bossPosition: bossPos || null,
      isPaused: show,
    });
  },
  
  // Set boss dialogue phase
  setBossDialoguePhase: (phase: 'pan_to_boss' | 'boss_talking' | 'pan_to_player' | 'player_talking' | null) => {
    set({ bossDialoguePhase: phase });
    if (phase === null) {
      set({ showBossDialogue: false, isPaused: false });
    }
  },
  
  // Called when a boss is defeated
  defeatBoss: (bossType?: string) => {
    const { bossNumber, hasWon } = get();
    const newBossesDefeated = get().bossesDefeated + 1;
    
    // Check if this is the final boss (septagon, boss #5)
    // Require both bossNumber === 5 AND bossType === 'BOSS_SEPTAGON' for extra safety
    const isFinalBoss = bossType === 'BOSS_SEPTAGON';
    const shouldShowWin = isFinalBoss && !hasWon;
    
    // Cycle boss number (1-5)
    const newBossNumber = (bossNumber % 5) + 1;
    
    set({
      bossesDefeated: newBossesDefeated,
      bossNumber: newBossNumber,
      bossHp: null,
      bossMaxHp: null,
      showWinScreen: shouldShowWin,
      hasWon: shouldShowWin ? true : hasWon,
      isPaused: shouldShowWin,
    });
  },
  
  // Set win screen visibility
  setWinScreen: (show: boolean) => set({ 
    showWinScreen: show, 
    isPaused: show,
  }),
  
  // Reset game
  reset: () => set({
    ship: {},
    hp: 100,
    maxHp: 100,
    shield: 0,
    maxShield: 0,
    level: 1,
    exp: 0,
    expToNextLevel: calculateExpToNextLevel(1),
    pickupRadiusBonus: 0,
    damageReduction: 0,
    shieldRegenRate: 0,
    hpRegenRate: 0,
    activeUltimates: [],
    isConstructionMode: false,
    pendingHex: null,
    pendingHexChoices: null,
    isPaused: false,
    showPauseMenu: false,
    isDead: false,
    showWaveAnnouncement: false,
    score: 0,
    wave: 1,
    bossHp: null,
    bossMaxHp: null,
    bossNumber: 1,
    bossesDefeated: 0,
    showBossDialogue: false,
    bossDialoguePhase: null,
    currentBossType: null,
    bossPosition: null,
    showWinScreen: false,
    hasWon: false,
  }),
}));
