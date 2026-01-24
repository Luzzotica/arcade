import { create } from 'zustand';

export type HexColor = 'RED' | 'GREEN' | 'YELLOW' | 'BLUE' | 'CYAN';
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
  
  // Game state
  isConstructionMode: boolean;
  pendingHex: HexModule | null;
  pendingHexChoices: HexModule[] | null; // For level up: 3 choices
  isPaused: boolean;
  score: number;
  wave: number;
  
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
  addScore: (points: number) => void;
  addExp: (amount: number) => void;
  levelUp: () => void;
  nextWave: () => void;
  reset: () => void;
}

// Calculate stats based on ship composition
const calculateStats = (ship: Record<string, HexModule>) => {
  let maxHp = 100; // Base HP
  let maxShield = 0;
  let pickupRadiusBonus = 0;
  
  Object.values(ship).forEach((hex) => {
    if (hex.color === 'GREEN') maxHp += 10;
    if (hex.color === 'BLUE') maxShield += 10;
    if (hex.color === 'CYAN') pickupRadiusBonus += 50; // +50 pickup radius per cyan hex
  });
  
  return { maxHp, maxShield, pickupRadiusBonus };
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
  isConstructionMode: false,
  pendingHex: null,
  pendingHexChoices: null,
  isPaused: false,
  score: 0,
  wave: 1,
  
  // Initialize ship with core
  initializeShip: (coreColor: HexColor) => {
    const ship: Record<string, HexModule> = {
      '0,0': { type: 'CORE', color: coreColor, health: 100 },
    };
    const { maxHp, maxShield, pickupRadiusBonus } = calculateStats(ship);
    
    set({
      ship,
      hp: maxHp,
      maxHp,
      shield: maxShield,
      maxShield,
      pickupRadiusBonus,
      score: 0,
      wave: 1,
      level: 1,
      exp: 0,
      expToNextLevel: calculateExpToNextLevel(1),
    });
  },
  
  // Attach a new hex to the ship
  attachHex: (key: string, hex: HexModule) => {
    const newShip = { ...get().ship, [key]: hex };
    const { maxHp, maxShield, pickupRadiusBonus } = calculateStats(newShip);
    
    // Heal for the HP difference when adding GREEN
    const hpDiff = maxHp - get().maxHp;
    
    set({
      ship: newShip,
      maxHp,
      maxShield,
      pickupRadiusBonus,
      hp: Math.min(get().hp + hpDiff, maxHp),
      shield: Math.min(get().shield, maxShield),
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
  
  // Take damage (shield first, then HP)
  takeDamage: (amount: number) => {
    const { shield, hp } = get();
    
    if (shield >= amount) {
      set({ shield: shield - amount });
    } else {
      const remaining = amount - shield;
      set({
        shield: 0,
        hp: Math.max(0, hp - remaining),
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
    const colors: HexColor[] = ['RED', 'GREEN', 'YELLOW', 'BLUE', 'CYAN'];
    
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
    isConstructionMode: false,
    pendingHex: null,
    pendingHexChoices: null,
    isPaused: false,
    score: 0,
    wave: 1,
  }),
}));
