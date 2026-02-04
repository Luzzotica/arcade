import * as Phaser from "phaser";
import { GAME_CONSTANTS, BLOCK_TYPES, HEAVENLY_BLOCK_TYPES } from "../config";
import { useGameStore } from "../../store/gameStore";

export interface BlockConfig {
  label: string;
  color: number;
  width: number;
  height: number;
  fallSpeed: number;
}

export class Block extends Phaser.GameObjects.Container {
  public body!: Phaser.Physics.Arcade.Body;
  private background: Phaser.GameObjects.Graphics;
  private cracksGraphics: Phaser.GameObjects.Graphics;
  private labelText: Phaser.GameObjects.Text;
  public blockConfig: BlockConfig;
  public blockWidth: number;
  public blockHeight: number;
  private hitCount: number = 0;
  private shakeTween: Phaser.Tweens.Tween | null = null;
  public isDestroyed: boolean = false;
  public isHeavenly: boolean = false; // Track if this is a positive/heavenly block
  public restingBlocks: Block[] = []; // Tree structure: blocks resting on this block

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config?: Partial<BlockConfig>,
  ) {
    super(scene, x, y);

    // Use percentage-based spawning based on progress to heaven
    const store = useGameStore.getState();
    const progressPercent = Math.max(
      0,
      Math.min(100, (store.height / GAME_CONSTANTS.HEAVEN_HEIGHT) * 100),
    );
    const useHeavenly = Math.random() * 100 < progressPercent;
    this.isHeavenly = useHeavenly;
    const blockTypes = useHeavenly ? HEAVENLY_BLOCK_TYPES : BLOCK_TYPES;

    // Generate random properties if not provided
    const baseType = blockTypes[Math.floor(Math.random() * blockTypes.length)];

    this.blockWidth =
      config?.width ??
      Phaser.Math.Between(
        GAME_CONSTANTS.BLOCK_MIN_WIDTH,
        GAME_CONSTANTS.BLOCK_MAX_WIDTH,
      );
    this.blockHeight =
      config?.height ??
      Phaser.Math.Between(
        GAME_CONSTANTS.BLOCK_MIN_HEIGHT,
        GAME_CONSTANTS.BLOCK_MAX_HEIGHT,
      );

    const fallSpeed = config?.fallSpeed ?? GAME_CONSTANTS.BLOCK_FALL_SPEED;

    this.blockConfig = {
      label: config?.label ?? baseType.label,
      color: config?.color ?? baseType.color,
      width: this.blockWidth,
      height: this.blockHeight,
      fallSpeed: fallSpeed,
    };

    // Create background
    this.background = scene.add.graphics();
    this.add(this.background);

    // Create cracks graphics for visual feedback
    this.cracksGraphics = scene.add.graphics();
    this.add(this.cracksGraphics);

    // Draw background (which will also draw cracks)
    this.drawBackground();

    // Create label text - scale font based on block size
    const fontSize = Math.min(14, Math.floor(this.blockHeight * 0.4));
    this.labelText = scene.add.text(0, 0, this.blockConfig.label, {
      fontSize: `${fontSize}px`,
      fontFamily: "Arial, sans-serif",
      color: "#ffffff",
      fontStyle: "bold",
    });
    this.labelText.setOrigin(0.5, 0.5);
    this.labelText.setAlpha(0.85);
    this.add(this.labelText);

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configure as kinematic body (constant velocity, not affected by gravity)
    this.body.setSize(this.blockWidth, this.blockHeight);
    this.body.setOffset(-this.blockWidth / 2, -this.blockHeight / 2);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.pushable = false; // Player cannot push blocks
    this.body.setVelocityY(fallSpeed);

    // Set depth behind lava (lava is -10)
    this.setDepth(-15);
  }

  private drawBackground(): void {
    const g = this.background;
    const w = this.blockWidth;
    const h = this.blockHeight;

    g.clear();

    // Main block body with slight gradient effect
    g.fillStyle(this.blockConfig.color, 0.95);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 5);

    // Top highlight
    g.fillStyle(0xffffff, 0.15);
    g.fillRoundedRect(-w / 2, -h / 2, w, h / 3, { tl: 5, tr: 5, bl: 0, br: 0 });

    // Border
    g.lineStyle(2, 0xffffff, 0.25);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 5);

    // Bottom shadow
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(-w / 2 + 2, h / 2 - 4, w - 4, 4, {
      tl: 0,
      tr: 0,
      bl: 3,
      br: 3,
    });

    // Draw cracks overlay
    this.drawCracks();
  }

  public update(): void {
    // Check if block has fallen too far below camera
    // Use a large buffer so blocks don't disappear when player climbs high
    const camera = this.scene.cameras.main;
    if (this.y > camera.scrollY + camera.height + 5000) {
      this.destroy();
    }
  }

  /**
   * Check if player is near this block (for near-miss detection)
   */
  public isNearMiss(
    playerX: number,
    playerY: number,
    playerWidth: number,
    playerHeight: number,
  ): boolean {
    const blockLeft = this.x - this.blockWidth / 2;
    const blockRight = this.x + this.blockWidth / 2;
    const blockTop = this.y - this.blockHeight / 2;
    const blockBottom = this.y + this.blockHeight / 2;

    const playerLeft = playerX - playerWidth / 2;
    const playerRight = playerX + playerWidth / 2;
    const playerTop = playerY - playerHeight / 2;
    const playerBottom = playerY + playerHeight / 2;

    // Check if within near-miss distance but not colliding
    const nearMissDistance = GAME_CONSTANTS.NEAR_MISS_DISTANCE;

    const horizontalNear =
      playerRight > blockLeft - nearMissDistance &&
      playerLeft < blockRight + nearMissDistance;
    const verticalNear =
      playerBottom > blockTop - nearMissDistance &&
      playerTop < blockBottom + nearMissDistance;

    if (!horizontalNear || !verticalNear) return false;

    // Make sure we're not actually colliding
    const isColliding =
      playerRight > blockLeft &&
      playerLeft < blockRight &&
      playerBottom > blockTop &&
      playerTop < blockBottom;

    return !isColliding;
  }

  public takeHit(): boolean {
    if (this.isDestroyed) return false;

    this.hitCount++;
    this.shake();
    this.drawCracks();

    // Heavenly blocks require 5 hits, negative blocks require 3 hits
    const maxHits = this.isHeavenly ? 5 : 3;
    if (this.hitCount >= maxHits) {
      this.isDestroyed = true;
      return true;
    }
    return false;
  }

  private drawCracks(): void {
    if (!this.cracksGraphics) return; // Safety check

    const g = this.cracksGraphics;
    const w = this.blockWidth;
    const h = this.blockHeight;

    g.clear();

    if (this.hitCount === 0) return;

    // Crack color - darker as damage increases
    const crackAlpha = 0.6 + this.hitCount * 0.1;
    g.lineStyle(2, 0x000000, crackAlpha);

    if (this.hitCount === 1) {
      // 2-3 small cracks from bottom
      const startY = h / 2 - 5;
      g.lineBetween(-w / 4, startY, -w / 3, startY - h / 4);
      g.lineBetween(0, startY, 0, startY - h / 3);
      g.lineBetween(w / 4, startY, w / 3, startY - h / 4);
    } else if (this.hitCount === 2) {
      // 5-6 cracks, some branching
      const startY = h / 2 - 5;
      g.lineBetween(-w / 3, startY, -w / 2, startY - h / 3);
      g.lineBetween(-w / 3, startY - h / 3, -w / 4, startY - h / 2);
      g.lineBetween(-w / 6, startY, -w / 8, startY - h / 2);
      g.lineBetween(w / 6, startY, w / 8, startY - h / 2);
      g.lineBetween(w / 3, startY, w / 2, startY - h / 3);
      g.lineBetween(w / 3, startY - h / 3, w / 4, startY - h / 2);
    } else if (this.hitCount === 3) {
      // Many cracks covering most of block
      const startY = h / 2 - 5;
      // Bottom cracks
      g.lineBetween(-w / 2, startY, -w / 2 + w / 4, startY - h / 2);
      g.lineBetween(-w / 3, startY, -w / 4, startY - h / 3);
      g.lineBetween(-w / 6, startY, -w / 8, startY - h / 2);
      g.lineBetween(0, startY, 0, startY - h / 2);
      g.lineBetween(w / 6, startY, w / 8, startY - h / 2);
      g.lineBetween(w / 3, startY, w / 4, startY - h / 3);
      g.lineBetween(w / 2, startY, w / 2 - w / 4, startY - h / 2);
      // Branching cracks
      g.lineBetween(-w / 4, startY - h / 3, -w / 3, startY - h / 2);
      g.lineBetween(w / 4, startY - h / 3, w / 3, startY - h / 2);
      // Top cracks
      g.lineBetween(-w / 3, startY - h / 2, -w / 2, startY - h / 2 + h / 6);
      g.lineBetween(w / 3, startY - h / 2, w / 2, startY - h / 2 + h / 6);
    } else if (this.hitCount === 4) {
      // Heavy cracking (for heavenly blocks)
      const startY = h / 2 - 5;
      // Bottom cracks - more extensive
      g.lineBetween(-w / 2, startY, -w / 2 + w / 3, startY - h / 2);
      g.lineBetween(-w / 3, startY, -w / 4, startY - h / 2);
      g.lineBetween(-w / 6, startY, -w / 12, startY - h / 2);
      g.lineBetween(0, startY, 0, -h / 2);
      g.lineBetween(w / 6, startY, w / 12, startY - h / 2);
      g.lineBetween(w / 3, startY, w / 4, startY - h / 2);
      g.lineBetween(w / 2, startY, w / 2 - w / 3, startY - h / 2);
      // Multiple branching cracks
      g.lineBetween(-w / 4, startY - h / 3, -w / 2, startY - h / 2);
      g.lineBetween(w / 4, startY - h / 3, w / 2, startY - h / 2);
      g.lineBetween(-w / 6, startY - h / 4, -w / 3, startY - h / 2);
      g.lineBetween(w / 6, startY - h / 4, w / 3, startY - h / 2);
      // Top cracks - more extensive
      g.lineBetween(-w / 2, startY - h / 2, -w / 2, -h / 2 + h / 5);
      g.lineBetween(w / 2, startY - h / 2, w / 2, -h / 2 + h / 5);
      g.lineBetween(-w / 4, -h / 2 + h / 6, w / 4, -h / 2 + h / 6);
    } else if (this.hitCount >= 5) {
      // Critical damage (for heavenly blocks on final hit)
      const startY = h / 2 - 5;
      // Complete network of cracks
      g.lineBetween(-w / 2, startY, -w / 2, -h / 2);
      g.lineBetween(-w / 3, startY, -w / 3, -h / 2);
      g.lineBetween(-w / 6, startY, -w / 6, -h / 2);
      g.lineBetween(0, startY, 0, -h / 2);
      g.lineBetween(w / 6, startY, w / 6, -h / 2);
      g.lineBetween(w / 3, startY, w / 3, -h / 2);
      g.lineBetween(w / 2, startY, w / 2, -h / 2);
      // Horizontal cracks
      g.lineBetween(-w / 2, -h / 4, w / 2, -h / 4);
      g.lineBetween(-w / 2, 0, w / 2, 0);
      g.lineBetween(-w / 2, h / 4, w / 2, h / 4);
      // Diagonal cracks
      g.lineBetween(-w / 2, -h / 2, w / 2, h / 2);
      g.lineBetween(w / 2, -h / 2, -w / 2, h / 2);
    }
  }

  private shake(): void {
    // Stop any existing shake
    if (this.shakeTween) {
      this.shakeTween.stop();
    }

    const intensity = this.hitCount * 2; // 2px, 4px, 6px
    const duration = 100 + this.hitCount * 50; // 100ms, 150ms, 200ms
    const startX = this.x;

    this.shakeTween = this.scene.tweens.add({
      targets: this,
      x: startX + Phaser.Math.Between(-intensity, intensity),
      duration: duration,
      yoyo: true,
      ease: "Sine.easeInOut",
      onComplete: () => {
        // Reset to original position
        this.x = startX;
      },
    });
  }

  public addRestingBlock(block: Block): void {
    if (!this.restingBlocks.includes(block)) {
      this.restingBlocks.push(block);
    }
  }

  public removeRestingBlock(block: Block): void {
    const index = this.restingBlocks.indexOf(block);
    if (index > -1) {
      this.restingBlocks.splice(index, 1);
    }
  }

  public cascadeDestroy(): void {
    // Make all resting blocks fall again
    const blocksToCascade = [...this.restingBlocks]; // Copy array to avoid modification during iteration
    this.restingBlocks = []; // Clear since this block is being destroyed

    for (const block of blocksToCascade) {
      if (block.active && !block.isDestroyed) {
        // Make block fall again
        const body = block.body as Phaser.Physics.Arcade.Body;
        if (body && typeof body.setVelocity === "function") {
          body.setVelocityY(block.blockConfig.fallSpeed);
          body.setImmovable(false);
        }
        // Recursively cascade upward
        block.cascadeDestroy();
      }
    }
  }

  public removeFromParent(allBlocks: Block[]): void {
    // Find and remove this block from any parent's restingBlocks array
    for (const otherBlock of allBlocks) {
      if (otherBlock !== this) {
        otherBlock.removeRestingBlock(this);
      }
    }
  }

  public static getRandomConfig(progressPercent: number = 0): BlockConfig {
    // Use percentage-based spawning
    const useHeavenly = Math.random() * 100 < progressPercent;
    const blockTypes = useHeavenly ? HEAVENLY_BLOCK_TYPES : BLOCK_TYPES;
    const baseType = blockTypes[Math.floor(Math.random() * blockTypes.length)];
    return {
      ...baseType,
      width: Phaser.Math.Between(
        GAME_CONSTANTS.BLOCK_MIN_WIDTH,
        GAME_CONSTANTS.BLOCK_MAX_WIDTH,
      ),
      height: Phaser.Math.Between(
        GAME_CONSTANTS.BLOCK_MIN_HEIGHT,
        GAME_CONSTANTS.BLOCK_MAX_HEIGHT,
      ),
      fallSpeed: GAME_CONSTANTS.BLOCK_FALL_SPEED,
    };
  }
}
