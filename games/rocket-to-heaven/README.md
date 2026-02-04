# Ascension: The Weight of Grace

A vertical-climb "infinite-jumper" game where players control a rocket-strapped wheelchair, turning life's metaphorical burdens into stepping stones to reach Heaven.

## Game Overview

**Goal:** Reach 10,000 feet altitude to enter Heaven.

**Core Mechanic:** Use falling blocks labeled with life's burdens (DEBT, GRIEF, STRESS, etc.) as platforms to escape the rising lava of "Despair."

## Controls

### Desktop

- **A/D or ←/→**: Move left/right
- **Space or W**: Jump/Rocket hop
- **ESC**: Pause menu

### Mobile

- **Left half of screen**: Virtual joystick for movement
- **Right half of screen**: Tap to jump

## Game Mechanics

### Movement

- **Rocket Hop**: Fixed-force upward impulse
- **Wall Slide**: Holding against a wall slows your fall
- **Wall Jump**: Jump off walls for extra height
- **Air Control**: Slightly reduced control while airborne

### Special Mechanics

- **Near Miss Boost**: Passing within 15 pixels of a block without collision grants +20% thrust for 1.5 seconds
- **Grace Orbs**: Collect golden orbs to gain double jump charges (max 3)
- **Rising Abyss**: The lava rises faster over time, increasing difficulty

### Visual Feedback

- Background transitions from dark/hellish to golden/heavenly as you climb
- Light rays appear near Heaven
- Particle effects for jumps, near misses, and grace collection

## Files Structure

```
games/rocket-to-heaven/
├── components/         # React UI components
│   ├── Game.tsx       # Main game wrapper
│   ├── HUD.tsx        # Altitude, grace orbs display
│   ├── Joystick.tsx   # Mobile movement control
│   ├── JumpButton.tsx # Mobile jump control
│   ├── PauseMenu.tsx
│   ├── DeathScreen.tsx
│   └── VictoryScreen.tsx
├── game/              # Phaser game logic
│   ├── config.ts      # Game configuration
│   ├── scenes/
│   │   └── MainScene.ts
│   ├── entities/
│   │   ├── Player.ts
│   │   ├── Block.ts
│   │   ├── GraceOrb.ts
│   │   └── Abyss.ts
│   └── utils/
│       └── BlockManager.ts
└── store/
    └── gameStore.ts   # Zustand state management
```

## Design Philosophy

The game transforms the "crushing weight" of life—finances, loss, and stress—into the very steps required to reach "Heaven." This metaphor gives the game soulful depth that balances the chaotic gameplay.

Players won't just wait for platforms; they'll "mid-air hop" off a falling "DEBT" block to escape the rising lava. Collecting "Grace" orbs allows double jumps, encouraging risk-taking to move toward falling objects.
