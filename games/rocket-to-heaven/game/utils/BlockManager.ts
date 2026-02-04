import * as Phaser from "phaser";
import { Block } from "../entities/Block";
import { GraceOrb } from "../entities/GraceOrb";
import { GAME_CONSTANTS, GAME_WIDTH } from "../config";
import { useGameStore } from "../../store/gameStore";

export class BlockManager {
  private scene: Phaser.Scene;
  private blocksGroup: Phaser.Physics.Arcade.Group;
  private graceOrbsGroup: Phaser.Physics.Arcade.Group;
  private blocks: Block[] = [];
  private graceOrbs: GraceOrb[] = [];
  private lastSpawnTime: number = 0;
  private spawnInterval: number;
  private highestSpawnY: number = 0;
  private highestPlayerY: number = 0; // Track highest point player reached
  private spawningEnabled: boolean = false;

  constructor(
    scene: Phaser.Scene,
    blocksGroup: Phaser.Physics.Arcade.Group,
    graceOrbsGroup: Phaser.Physics.Arcade.Group,
  ) {
    this.scene = scene;
    this.blocksGroup = blocksGroup;
    this.graceOrbsGroup = graceOrbsGroup;
    this.spawnInterval = GAME_CONSTANTS.BLOCK_SPAWN_RATE;
    this.highestSpawnY = 0;
    this.highestPlayerY = 0;
  }

  public startSpawning(): void {
    this.spawningEnabled = true;
    // Spawn initial block above the player
    const cameraTop = this.scene.cameras.main.scrollY;
    this.spawnBlock(cameraTop - 600);
  }

  public update(delta: number, cameraTop: number, playerY: number): void {
    // Track highest point player has reached (lower Y = higher)
    if (playerY < this.highestPlayerY) {
      this.highestPlayerY = playerY;
    }

    // Only spawn if enabled
    if (this.spawningEnabled) {
      // Update spawn timing
      this.lastSpawnTime += delta;

      // Spawn from above the highest point reached, not current camera
      const spawnY = this.highestPlayerY - 600;

      // Only spawn if we've moved up enough
      if (spawnY < this.highestSpawnY - 150) {
        this.spawnWave(spawnY);
        this.highestSpawnY = spawnY;
      }

      // Also spawn on timer for continuous falling blocks (from highest point)
      if (this.lastSpawnTime >= this.spawnInterval) {
        this.spawnBlock(this.highestPlayerY - 500);
        this.lastSpawnTime = 0;
        // Add variance to spawn timing
        this.spawnInterval =
          GAME_CONSTANTS.BLOCK_SPAWN_RATE +
          (Math.random() - 0.5) * GAME_CONSTANTS.BLOCK_SPAWN_VARIANCE * 2;
      }
    }

    // Update all blocks (always, even if spawning disabled)
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const block = this.blocks[i];
      if (block.active) {
        block.update();
      } else {
        this.blocks.splice(i, 1);
      }
    }

    // Update all grace orbs
    for (let i = this.graceOrbs.length - 1; i >= 0; i--) {
      const orb = this.graceOrbs[i];
      if (orb.active) {
        orb.update(delta);
      } else {
        this.graceOrbs.splice(i, 1);
      }
    }
  }

  private spawnWave(y: number): void {
    const screenWidth = this.scene.game.scale.width;
    const playableAreaX = (screenWidth - GAME_WIDTH) / 2;
    const numBlocks = Math.floor(Math.random() * 2) + 1; // 1-2 blocks per wave

    for (let i = 0; i < numBlocks; i++) {
      const x =
        playableAreaX + GAME_WIDTH * 0.1 + Math.random() * GAME_WIDTH * 0.8;
      const blockY = y - Math.random() * 200;
      this.createBlock(x, blockY);
    }

    // Chance to spawn grace orb
    if (Math.random() < GAME_CONSTANTS.GRACE_SPAWN_CHANCE) {
      const x =
        playableAreaX + GAME_WIDTH * 0.2 + Math.random() * GAME_WIDTH * 0.6;
      this.createGraceOrb(x, y - 150);
    }
  }

  private spawnBlock(y: number): void {
    const screenWidth = this.scene.game.scale.width;
    const playableAreaX = (screenWidth - GAME_WIDTH) / 2;
    // Vary x position within the playable area
    const margin = 50; // Keep blocks away from edges
    const x =
      playableAreaX + margin + Math.random() * (GAME_WIDTH - margin * 2);
    this.createBlock(x, y);
  }

  private createBlock(x: number, y: number): Block | null {
    const screenWidth = this.scene.game.scale.width;
    const playableAreaX = (screenWidth - GAME_WIDTH) / 2;
    const margin = 50;
    const maxRetries = 5;

    // Get current progress percentage for block type selection
    const store = useGameStore.getState();
    const progressPercent = Math.max(
      0,
      Math.min(100, (store.height / GAME_CONSTANTS.HEAVEN_HEIGHT) * 100),
    );

    // Get a random config first to know the size we're checking
    const config = Block.getRandomConfig(progressPercent);

    // Try to find a clear spawn position
    let spawnX = x;
    let spawnY = y;
    let foundClearSpot = false;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (
        !this.wouldCollideWithBlock(spawnX, spawnY, config.width, config.height)
      ) {
        foundClearSpot = true;
        break;
      }
      // Try a different position within playable area
      spawnX =
        playableAreaX + margin + Math.random() * (GAME_WIDTH - margin * 2);
      spawnY = y - Math.random() * 100; // Vary Y slightly too
    }

    if (!foundClearSpot) {
      // Couldn't find a clear spot after retries, skip this spawn
      return null;
    }

    const block = new Block(this.scene, spawnX, spawnY, config);
    this.blocks.push(block);
    // Add to physics group for collision detection
    this.blocksGroup.add(block);
    // Re-apply velocity after adding to group (group might reset it)
    block.body.setVelocityY(block.blockConfig.fallSpeed);
    return block;
  }

  private wouldCollideWithBlock(
    x: number,
    y: number,
    width: number,
    height: number,
  ): boolean {
    // Check against all existing blocks
    const padding = 20; // Extra padding to prevent near-collisions

    for (const block of this.blocks) {
      if (!block.active) continue;

      const blockConfig = block.blockConfig;
      const blockLeft = block.x - blockConfig.width / 2 - padding;
      const blockRight = block.x + blockConfig.width / 2 + padding;
      const blockTop = block.y - blockConfig.height / 2 - padding;
      const blockBottom = block.y + blockConfig.height / 2 + padding;

      const newLeft = x - width / 2;
      const newRight = x + width / 2;
      const newTop = y - height / 2;
      const newBottom = y + height / 2;

      // Check for overlap
      if (
        newLeft < blockRight &&
        newRight > blockLeft &&
        newTop < blockBottom &&
        newBottom > blockTop
      ) {
        return true;
      }
    }

    return false;
  }

  private createGraceOrb(x: number, y: number): GraceOrb | null {
    const screenWidth = this.scene.game.scale.width;
    const playableAreaX = (screenWidth - GAME_WIDTH) / 2;
    const margin = 50;
    const maxRetries = 5;
    const orbSize = 30; // Approximate orb size

    // Try to find a clear spawn position
    let spawnX = x;
    let spawnY = y;
    let foundClearSpot = false;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (!this.wouldCollideWithBlock(spawnX, spawnY, orbSize, orbSize)) {
        foundClearSpot = true;
        break;
      }
      // Try a different position within playable area
      spawnX =
        playableAreaX + margin + Math.random() * (GAME_WIDTH - margin * 2);
      spawnY = y - Math.random() * 100;
    }

    if (!foundClearSpot) {
      return null;
    }

    const orb = new GraceOrb(this.scene, spawnX, spawnY);
    this.graceOrbs.push(orb);
    // Add to physics group for collision with blocks
    this.graceOrbsGroup.add(orb);
    return orb;
  }

  public getBlocks(): Block[] {
    return this.blocks.filter((b) => b.active);
  }

  public getGraceOrbs(): GraceOrb[] {
    return this.graceOrbs.filter((o) => o.active);
  }

  public cleanup(): void {
    this.blocks.forEach((b) => b.destroy());
    this.graceOrbs.forEach((o) => o.destroy());
    this.blocks = [];
    this.graceOrbs = [];
    this.spawningEnabled = false;
  }
}
