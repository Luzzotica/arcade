import * as Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: typeof window !== 'undefined' ? window.innerWidth : 800,
  height: typeof window !== 'undefined' ? window.innerHeight : 600,
  backgroundColor: '#1a1a2e',
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [MainScene],
  pixelArt: false,
  antialias: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

// Color palette
export const COLORS = {
  BACKGROUND: 0x1a1a2e,
  RED: 0xff4757,
  GREEN: 0x2ed573,
  YELLOW: 0xffa502,
  BLUE: 0x3742fa,
  CYAN: 0x00d9ff,
  ORANGE: 0xff8800,
  WHITE: 0xffffff,
  ENEMY_TRIANGLE: 0xff6b6b,
  ENEMY_SQUARE: 0x4ecdc4,
  ENEMY_PENTAGON: 0xa55eea,
};

// Game constants
export const HEX_SIZE = 12; // Outer radius of hexagon (doubled from 6)
export const PLAYER_SPEED = 200;
export const PLAYER_ACCELERATION = 800;
export const PLAYER_DRAG = 400;

// Test mode: bosses spawn every wave with 1/10 health
export const TEST_MODE = true;
