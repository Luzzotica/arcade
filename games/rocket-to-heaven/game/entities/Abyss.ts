import * as Phaser from "phaser";
import { COLORS, GAME_CONSTANTS } from "../config";

export class Abyss extends Phaser.GameObjects.Container {
  private lavaGraphics: Phaser.GameObjects.Graphics;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private waveTime: number = 0;
  private currentRiseSpeed: number;
  private lavaTop: number;

  constructor(scene: Phaser.Scene, startY: number) {
    super(scene, 0, startY);

    this.lavaTop = startY;
    this.currentRiseSpeed = GAME_CONSTANTS.ABYSS_RISE_SPEED;

    // Create glow effect (rendered above lava)
    this.glowGraphics = scene.add.graphics();
    this.add(this.glowGraphics);

    // Create lava graphics
    this.lavaGraphics = scene.add.graphics();
    this.add(this.lavaGraphics);

    // Add to scene (no physics - we use manual collision detection)
    scene.add.existing(this);

    // Draw initial state
    this.drawLava();

    // Set depth to be behind most things but visible
    this.setDepth(-10);
  }

  private drawLava(): void {
    const g = this.lavaGraphics;
    const glow = this.glowGraphics;
    const width = 4000;
    const height = 2000;

    g.clear();
    glow.clear();

    // Glow effect above lava
    const glowHeight = 100;
    for (let i = 0; i < glowHeight; i++) {
      const alpha = (1 - i / glowHeight) * 0.4;
      glow.fillStyle(COLORS.LAVA_GLOW, alpha);
      glow.fillRect(-width / 2, -i, width, 1);
    }

    // Main lava body
    g.fillStyle(COLORS.LAVA, 1);
    g.fillRect(-width / 2, 0, width, height);

    // Animated waves on top
    g.fillStyle(COLORS.LAVA_GLOW, 1);
    for (let x = -width / 2; x < width / 2; x += 20) {
      const waveOffset = Math.sin(x * 0.02 + this.waveTime) * 5;
      const waveHeight = 8 + Math.sin(x * 0.03 + this.waveTime * 1.5) * 4;
      g.fillRect(x, -waveHeight + waveOffset, 18, waveHeight);
    }

    // Bright highlights on wave crests
    g.fillStyle(0xffaa00, 0.8);
    for (let x = -width / 2; x < width / 2; x += 40) {
      const waveOffset = Math.sin(x * 0.02 + this.waveTime) * 5;
      g.fillRect(x + 5, -10 + waveOffset, 10, 3);
    }
  }

  public update(delta: number): void {
    // Update wave animation
    this.waveTime += delta * 0.002;
    this.drawLava();

    // Rise up (negative Y is up in Phaser)
    this.currentRiseSpeed +=
      GAME_CONSTANTS.ABYSS_RISE_ACCELERATION * (delta / 1000);
    const riseAmount = this.currentRiseSpeed * (delta / 1000);
    this.y -= riseAmount;
    this.lavaTop = this.y;
  }

  public getLavaTop(): number {
    return this.lavaTop;
  }

  public getCurrentRiseSpeed(): number {
    return this.currentRiseSpeed;
  }

  /**
   * Check if a position is inside the lava
   */
  public isInLava(y: number): boolean {
    return y > this.lavaTop;
  }

  /**
   * Get the danger zone (area close to lava for warnings)
   */
  public getDangerZone(): number {
    return this.lavaTop - 150; // 150 pixels above lava
  }
}
