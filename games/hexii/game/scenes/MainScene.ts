import * as Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import type { EnemyType } from '../entities/Enemy';
import { ExpDrop } from '../entities/ExpDrop';
import { HexChest } from '../entities/HexChest';
import { useGameStore } from '../../store/gameStore';
import { COLORS } from '../config';

export class MainScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private expDrops: ExpDrop[] = [];
  private hexChests: HexChest[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 1500; // ms between spawns
  private gameStarted: boolean = false;
  private isDead: boolean = false;
  
  // Wave system
  private waveTimer: number = 0;
  private waveDuration: number = 30000; // 30 seconds per wave
  private enemiesPerSpawn: number = 1;
  private enemyHpMultiplier: number = 1;
  private bossSpawned: boolean = false;
  private starGraphics!: Phaser.GameObjects.Graphics;
  
  // Boss health bar UI

  constructor() {
    super({ key: 'MainScene' });
  }

  create(): void {
    // Set world bounds to be much larger (effectively infinite)
    this.physics.world.setBounds(-10000, -10000, 20000, 20000);
    
    // Create player at world origin (0, 0)
    this.player = new Player(this, 0, 0);
    
    // Set camera to follow player with smooth interpolation
    this.cameras.main.setBounds(-10000, -10000, 20000, 20000);
    this.cameras.main.startFollow(this.player.getContainer(), true, 0.1, 0.1);
    this.cameras.main.setDeadzone(0, 0); // No deadzone - always centered on player
    
    // Subscribe to game store
    this.initStoreSubscription();
    
    // Create starfield background
    this.createBackground();
    
    // Initialize with a default ship for testing
    // In the real game, this would be triggered by the menu
    const store = useGameStore.getState();
    if (Object.keys(store.ship).length === 0) {
      store.initializeShip('RED');
    }
    
    // Spawn 15 XP drops at start
    this.spawnInitialExpDrops();
    
    this.gameStarted = true;
  }
  
  /**
   * Spawn initial XP drops at game start
   */
  private spawnInitialExpDrops(): void {
    const centerX = 0; // Player starts at world origin
    const centerY = 0;
    const spawnRadius = 300; // Spawn in a circle around player
    
    for (let i = 0; i < 15; i++) {
      // Random angle and distance
      const angle = (Math.PI * 2 / 15) * i + Math.random() * 0.2;
      const distance = 100 + Math.random() * spawnRadius;
      
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      
      const drop = new ExpDrop(this, x, y);
      this.expDrops.push(drop);
    }
  }
  
  private pendingShipUpdate: Record<string, import('../../store/gameStore').HexModule> | null = null;

  private initStoreSubscription(): void {
    // Listen for state changes
    useGameStore.subscribe((state, prevState) => {
      // Defer ship updates to next frame to avoid Phaser crashes during update loop
      if (state.ship !== prevState.ship) {
        this.pendingShipUpdate = state.ship;
        
        // If construction mode just closed and we have more boss hexes queued
        if (!state.isConstructionMode && prevState.isConstructionMode && this.bossHexQueue.length > 0) {
          // Delay to let the UI update
          this.time.delayedCall(100, () => {
            this.showNextBossHex();
          });
        }
      }
      
      // Handle pause state changes using Phaser's scene pause/resume
      const shouldPause = state.isPaused || state.isConstructionMode || state.showPauseMenu;
      const wasPaused = prevState.isPaused || prevState.isConstructionMode || prevState.showPauseMenu;
      
      if (shouldPause && !wasPaused) {
        this.scene.pause();
      } else if (!shouldPause && wasPaused) {
        this.scene.resume();
      }
    });
    
    // Initial sync
    const state = useGameStore.getState();
    if (Object.keys(state.ship).length > 0) {
      this.player.initFromStore(state.ship);
    }
  }

  private createBackground(): void {
    // Create starfield background with better visibility
    this.starGraphics = this.add.graphics();
    
    // Create stars in a very large area
    const starCount = 1000;
    const starFieldSize = 10000;
    
    for (let i = 0; i < starCount; i++) {
      const x = (Math.random() - 0.5) * starFieldSize;
      const y = (Math.random() - 0.5) * starFieldSize;
      // More visible stars
      const alpha = 0.4 + Math.random() * 0.6;
      const size = 1 + Math.random() * 2;
      
      // Varied colors for stars
      const colorRoll = Math.random();
      let color = COLORS.WHITE;
      if (colorRoll < 0.1) {
        color = 0x88ccff; // Blue star
      } else if (colorRoll < 0.15) {
        color = 0xffcc88; // Yellow/orange star
      }
      
      this.starGraphics.fillStyle(color, alpha);
      this.starGraphics.fillCircle(x, y, size);
    }
    
    this.starGraphics.setDepth(-1);
  }

  update(_time: number, delta: number): void {
    if (!this.gameStarted) return;
    
    // Process deferred ship updates (safe to do at start of frame)
    if (this.pendingShipUpdate) {
      this.player.initFromStore(this.pendingShipUpdate);
      this.pendingShipUpdate = null;
    }
    
    // Scene is paused via scene.pause() when React UIs are open
    // so we don't need manual pause checks here
    
    // Update wave timer
    this.waveTimer += delta;
    if (this.waveTimer >= this.waveDuration) {
      this.advanceWave();
    }
    
    // Update player (includes shooting)
    this.player.update(_time, delta);
    
    // Update projectiles
    const projectiles = this.player.getProjectiles();
    projectiles.forEach((projectile) => {
      projectile.update(_time, delta);
    });
    
    // Update enemies
    const playerPos = this.player.getPosition();
    this.enemies.forEach((enemy) => {
      enemy.setTarget(playerPos.x, playerPos.y);
      enemy.update(delta);
    });
    
    // Check enemy-enemy collisions
    this.checkEnemyEnemyCollisions();
    
    // Update boss health bar if boss exists
    this.updateBossHealthBar();
    
    // Clean up destroyed enemies
    this.enemies = this.enemies.filter((e) => e.active);
    
    // Update exp drops
    this.expDrops.forEach((drop) => drop.update());
    this.expDrops = this.expDrops.filter((d) => d.active);
    
    // Update hex chests
    this.hexChests.forEach((chest) => chest.update());
    this.hexChests = this.hexChests.filter((c) => c.active);
    
    // Check collisions
    this.checkProjectileCollisions();
    this.checkEnemyCollisions();
    this.checkExpDropCollisions();
    this.checkHexChestCollisions();
    
    // Spawn enemies
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnEnemies();
    }
  }

  /**
   * Advance to next wave with increased difficulty
   */
  private advanceWave(): void {
    const store = useGameStore.getState();
    store.nextWave();
    
    const currentWave = store.wave;
    this.waveTimer = 0;
    this.bossSpawned = false;
    
    // Increase difficulty each wave
    this.enemyHpMultiplier = 1 + (currentWave - 1) * 0.25; // +25% HP per wave
    this.enemiesPerSpawn = Math.min(1 + Math.floor((currentWave - 1) / 2), 5); // +1 enemy every 2 waves, max 5
    this.spawnInterval = Math.max(1500 - (currentWave - 1) * 100, 500); // Faster spawns, min 500ms
    
    // Spawn boss every 3 waves
    if (currentWave > 1 && currentWave % 3 === 0) {
      this.time.delayedCall(1000, () => {
        this.spawnBoss();
      });
    }
    
    // Wave announcement
    const waveText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 3,
      `WAVE ${currentWave}`,
      {
        fontSize: '64px',
        color: '#ffa502',
        fontFamily: 'Arial Black',
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(500);
    
    this.tweens.add({
      targets: waveText,
      alpha: 0,
      y: waveText.y - 50,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => waveText.destroy(),
    });
  }

  /**
   * Check collisions between enemies (they push each other)
   */
  private checkEnemyEnemyCollisions(): void {
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        const enemy1 = this.enemies[i];
        const enemy2 = this.enemies[j];
        
        if (!enemy1.active || !enemy2.active) continue;
        
        const dx = enemy2.x - enemy1.x;
        const dy = enemy2.y - enemy1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = enemy1.getSize() + enemy2.getSize();
        
        if (dist < minDist && dist > 0) {
          // Push enemies apart
          const overlap = minDist - dist;
          const pushX = (dx / dist) * overlap * 0.5;
          const pushY = (dy / dist) * overlap * 0.5;
          
          enemy1.setPosition(enemy1.x - pushX, enemy1.y - pushY);
          enemy2.setPosition(enemy2.x + pushX, enemy2.y + pushY);
        }
      }
    }
  }

  /**
   * Spawn multiple enemies based on current wave
   */
  private spawnEnemies(): void {
    for (let i = 0; i < this.enemiesPerSpawn; i++) {
      this.spawnEnemy();
    }
  }

  private spawnEnemy(): void {
    // Spawn enemies relative to camera view (just outside visible area)
    const camera = this.cameras.main;
    
    // Get camera bounds in world coordinates
    const camLeft = camera.worldView.x;
    const camRight = camera.worldView.x + camera.worldView.width;
    const camTop = camera.worldView.y;
    const camBottom = camera.worldView.y + camera.worldView.height;
    
    // Spawn at random edge of camera view
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;
    
    const margin = 100; // Spawn just outside camera view
    
    switch (side) {
      case 0: // Top
        x = camLeft + Math.random() * (camRight - camLeft);
        y = camTop - margin;
        break;
      case 1: // Right
        x = camRight + margin;
        y = camTop + Math.random() * (camBottom - camTop);
        break;
      case 2: // Bottom
        x = camLeft + Math.random() * (camRight - camLeft);
        y = camBottom + margin;
        break;
      case 3: // Left
      default:
        x = camLeft - margin;
        y = camTop + Math.random() * (camBottom - camTop);
        break;
    }
    
    // Random enemy type weighted toward triangles
    const roll = Math.random();
    let type: EnemyType;
    if (roll < 0.6) {
      type = 'TRIANGLE';
    } else if (roll < 0.85) {
      type = 'SQUARE';
    } else {
      type = 'PENTAGON';
    }
    
    const enemy = new Enemy(this, x, y, type, this.enemyHpMultiplier);
    this.enemies.push(enemy);
  }

  /**
   * Spawn a boss enemy
   */
  private spawnBoss(): void {
    if (this.bossSpawned) return;
    this.bossSpawned = true;
    
    const camera = this.cameras.main;
    const playerPos = this.player.getPosition();
    
    // Spawn boss at a random edge, further away
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(camera.width, camera.height) * 0.7;
    const x = playerPos.x + Math.cos(angle) * distance;
    const y = playerPos.y + Math.sin(angle) * distance;
    
    const boss = new Enemy(this, x, y, 'BOSS', this.enemyHpMultiplier);
    this.enemies.push(boss);
    
    // Boss announcement
    const bossText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      'BOSS INCOMING!',
      {
        fontSize: '48px',
        color: '#ff0000',
        fontFamily: 'Arial Black',
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(500);
    
    this.tweens.add({
      targets: bossText,
      alpha: 0,
      scale: 1.5,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => bossText.destroy(),
    });
    
    // Screen shake for boss entrance
    this.cameras.main.shake(300, 0.01);
  }

  /**
   * Check collisions between projectiles and enemies
   */
  private checkProjectileCollisions(): void {
    const store = useGameStore.getState();
    const projectiles = this.player.getProjectiles();
    
    for (const projectile of projectiles) {
      if (!projectile.active) continue;
      
      for (const enemy of this.enemies) {
        if (!enemy.active) continue;
        
        // Distance-based collision
        const dx = enemy.x - projectile.x;
        const dy = enemy.y - projectile.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = enemy.getSize() + projectile.config.size;
        
        if (dist < minDist) {
          // For piercing projectiles, check if we've already hit this enemy
          if (projectile.isPiercing() && projectile.hasHitEnemy(enemy)) {
            continue; // Skip this enemy, already hit
          }
          
          // Enemy takes damage
          const wasBoss = enemy.isBoss();
          const enemyType = enemy.getType();
          const destroyed = enemy.takeDamage(projectile.getDamage());
          
          // Mark this enemy as hit (for piercing projectiles)
          if (projectile.isPiercing()) {
            projectile.markEnemyHit(enemy);
          }
          
          if (destroyed) {
            // Enemy destroyed
            store.addScore(enemy.getScore());
            
            // Boss drops a chest with hexagon module(s)
            if (wasBoss) {
              this.dropHexChestFromBoss(enemy.x, enemy.y);
            } else {
              // Regular enemies spawn exp drop
              // Stronger enemies (PENTAGON, SQUARE) drop larger XP
              const dropType = (enemyType === 'PENTAGON' || enemyType === 'SQUARE') ? 'LARGE' : 'SMALL';
              const drop = new ExpDrop(this, enemy.x, enemy.y, dropType);
              this.expDrops.push(drop);
            }
          }
          
          // Destroy projectile (unless piercing)
          if (!projectile.isPiercing()) {
            projectile.destroy();
          }
        }
      }
    }
  }

  /**
   * Drop a hex chest when boss is killed
   * 1% chance for 5 hexes, 5% chance for 3 hexes, 94% chance for 1 hex
   */
  private dropHexChestFromBoss(x: number, y: number): void {
    const roll = Math.random();
    let hexCount = 1;
    
    if (roll < 0.01) {
      hexCount = 5; // 1% chance
    } else if (roll < 0.06) {
      hexCount = 3; // 5% chance (0.01 to 0.06)
    }
    
    // Generate random hexes for the chest
    const colors: Array<'RED' | 'GREEN' | 'YELLOW' | 'BLUE' | 'CYAN'> = ['RED', 'GREEN', 'YELLOW', 'BLUE', 'CYAN'];
    const hexes: Array<import('../../store/gameStore').HexModule> = [];
    
    for (let i = 0; i < hexCount; i++) {
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      hexes.push({
        type: 'MODULE',
        color: randomColor,
        health: 100,
      });
    }
    
    // Create the chest at the boss's death location
    const chest = new HexChest(this, x, y, hexes);
    this.hexChests.push(chest);
    
    // Announcement
    const chestText = this.add.text(
      this.cameras.main.width / 2,
      100,
      hexCount > 1 ? `CHEST DROPPED! (${hexCount} HEXES)` : 'CHEST DROPPED!',
      {
        fontSize: '28px',
        color: hexCount >= 5 ? '#ffd700' : hexCount >= 3 ? '#ff00ff' : '#00ffff',
        fontFamily: 'Arial Black',
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(500);
    
    this.tweens.add({
      targets: chestText,
      alpha: 0,
      y: 80,
      duration: 2000,
      onComplete: () => chestText.destroy(),
    });
  }

  private bossHexQueue: Array<import('../../store/gameStore').HexModule> = [];

  /**
   * Check collisions between hex chests and player
   */
  private checkHexChestCollisions(): void {
    const playerPos = this.player.getPosition();
    const playerRadius = this.player.getBody().halfWidth;
    
    this.hexChests.forEach((chest) => {
      if (!chest.active) return;
      
      const dx = chest.x - playerPos.x;
      const dy = chest.y - playerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pickupDist = playerRadius + chest.getPickupRadius();
      
      if (dist <= pickupDist) {
        // Pick up the chest - queue all hexes for placement
        this.bossHexQueue = [...chest.getHexes()];
        chest.destroy();
        
        // Start placing the first hex
        this.showNextBossHex();
      }
    });
  }

  /**
   * Show the next hex from boss queue
   */
  private showNextBossHex(): void {
    if (this.bossHexQueue.length === 0) return;
    
    const nextHex = this.bossHexQueue.shift()!;
    const store = useGameStore.getState();
    
    // Show announcement if multiple hexes
    if (this.bossHexQueue.length > 0) {
      const remainingText = this.add.text(
        this.cameras.main.width / 2,
        100,
        `${this.bossHexQueue.length + 1} HEXES REMAINING!`,
        {
          fontSize: '24px',
          color: '#ffa502',
          fontFamily: 'Arial Black',
        }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(500);
      
      this.tweens.add({
        targets: remainingText,
        alpha: 0,
        duration: 2000,
        onComplete: () => remainingText.destroy(),
      });
    }
    
    store.setConstructionMode(true, nextHex);
  }
  
  /**
   * Check collisions between exp drops and player (with magnet effect)
   */
  private checkExpDropCollisions(): void {
    const store = useGameStore.getState();
    const playerPos = this.player.getPosition();
    const playerRadius = this.player.getBody().halfWidth;
    // Base magnet radius + bonus from CYAN hexes
    const magnetRadius = 150 + store.pickupRadiusBonus;
    
    this.expDrops.forEach((drop) => {
      if (!drop.active) return;
      
      // Calculate distance to player
      const dx = drop.x - playerPos.x;
      const dy = drop.y - playerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pickupDist = playerRadius + drop.getPickupRadius();
      
      // Magnet effect - attract drops when within magnet radius
      if (dist < magnetRadius && dist > pickupDist) {
        const magnetStrength = 300; // Speed of attraction
        const vx = -(dx / dist) * magnetStrength;
        const vy = -(dy / dist) * magnetStrength;
        drop.getPhysicsBody().setVelocity(vx, vy);
      } else if (dist <= pickupDist) {
        // Pick up exp drop - use the drop's exp value
        store.addExp(drop.getExpValue());
        drop.destroy();
      } else {
        // Stop movement if outside magnet range
        drop.getPhysicsBody().setVelocity(0, 0);
      }
    });
  }
  
  /**
   * Check collisions between enemies and player hexagons
   */
  private checkEnemyCollisions(): void {
    const store = useGameStore.getState();
    const hexPositions = this.player.getHexWorldPositions();
    
    this.enemies.forEach((enemy) => {
      if (!enemy.active) return;
      
      // Check collision against each player hex
      let collided = false;
      let closestHexX = 0;
      let closestHexY = 0;
      
      for (const hex of hexPositions) {
        const dx = enemy.x - hex.x;
        const dy = enemy.y - hex.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = hex.size + enemy.getSize();
        
        if (dist < minDist) {
          collided = true;
          closestHexX = hex.x;
          closestHexY = hex.y;
          break;
        }
      }
      
      if (collided) {
        // Only deal damage if enemy is not on cooldown
        if (enemy.canDealDamage()) {
          // Player takes damage
          store.takeDamage(enemy.getDamage());
          this.player.flashDamage();
          
          // Set cooldown so enemy doesn't immediately damage again
          enemy.setHitCooldown();
          
          // Check game over
          if (store.hp <= 0 && !this.isDead) {
            this.playerDeath();
          }
        }
        
        // Knockback enemy away from the hex they hit
        enemy.knockback(closestHexX, closestHexY, 400);
      }
    });
  }

  /**
   * Death explosion animation (reduced for performance)
   */
  private playerDeath(): void {
    this.isDead = true;
    this.gameStarted = false;
    
    const playerPos = this.player.getPosition();
    
    // Hide player hexagons
    this.player.getContainer().setVisible(false);
    
    // Stop all movement
    this.player.getBody().setVelocity(0, 0);
    this.player.getBody().setAcceleration(0, 0);
    
    // Reduced explosion for performance
    const explosionRadius = 100;
    const particleCount = 20; // Reduced from 100
    
    // Main explosion flash
    const flash = this.add.circle(playerPos.x, playerPos.y, 0, 0xff4757, 1);
    flash.setDepth(100);
    
    this.tweens.add({
      targets: flash,
      radius: explosionRadius * 2,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });
    
    // Reduced explosion rings (2 instead of 5)
    for (let ring = 0; ring < 2; ring++) {
      const ringDelay = ring * 150;
      const ringRadius = explosionRadius * (ring + 1);
      
      const ringData = { radius: 0 };
      const ringGraphic = this.add.graphics();
      ringGraphic.setDepth(100);
      
      this.tweens.add({
        targets: ringData,
        radius: ringRadius,
        duration: 300,
        delay: ringDelay,
        onUpdate: () => {
          ringGraphic.clear();
          const alpha = 1 - (ringData.radius / ringRadius);
          ringGraphic.lineStyle(8 - ring * 3, 0xff4757, alpha);
          ringGraphic.strokeCircle(playerPos.x, playerPos.y, ringData.radius);
        },
        onComplete: () => ringGraphic.destroy(),
      });
    }
    
    // Reduced particle explosion
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 / particleCount) * i;
      const speed = 150 + Math.random() * 200;
      const size = 2 + Math.random() * 4;
      const color = [0xff4757, 0xff6b81, 0xffffff][Math.floor(Math.random() * 3)];
      
      const particle = this.add.circle(
        playerPos.x,
        playerPos.y,
        size,
        color,
        1
      );
      particle.setDepth(100);
      
      this.tweens.add({
        targets: particle,
        x: playerPos.x + Math.cos(angle) * speed,
        y: playerPos.y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0,
        duration: 600 + Math.random() * 300,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
    
    // Reduced screen shake
    this.cameras.main.shake(500, 0.01);
    
    // Fade to red
    const fadeOverlay = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0xff0000,
      0
    );
    fadeOverlay.setScrollFactor(0).setDepth(999);
    
    this.tweens.add({
      targets: fadeOverlay,
      alpha: 0.2,
      duration: 400,
      delay: 200,
    });
    
    // Show game over after explosion
    this.time.delayedCall(800, () => {
      this.gameOver();
    });
  }
  
  private gameOver(): void {
    // Display game over - fixed to camera (scrollFactor 0 means it stays on screen)
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    this.add.text(centerX, centerY, 'GAME OVER', {
      fontSize: '64px',
      color: '#ff4757',
      fontFamily: 'Arial Black',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    
    this.add.text(centerX, centerY + 60, 'Press R to return to menu', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    
    // Return to menu on R
    this.input.keyboard!.once('keydown-R', () => {
      this.returnToMenu();
    });
  }
  
  /**
   * Return to main menu
   */
  private returnToMenu(): void {
    // Dispatch custom event to return to menu
    window.dispatchEvent(new CustomEvent('game:returnToMenu'));
  }

  /**
   * Update boss health bar (updates store for React component)
   */
  private updateBossHealthBar(): void {
    const store = useGameStore.getState();
    
    // Find active boss
    const boss = this.enemies.find((e) => e.active && e.isBoss());
    
    if (!boss) {
      // No boss active, hide health bar
      store.setBossHealth(null, null);
      return;
    }
    
    // Update store with boss health
    const hp = boss.getHp();
    const maxHp = boss.getMaxHp();
    store.setBossHealth(hp, maxHp);
  }

  /**
   * Get valid attachment points for construction UI
   */
  getValidAttachmentPoints() {
    return this.player.getValidAttachmentPoints();
  }

  /**
   * Get pixel position for hex
   */
  getPixelForHex(hex: { q: number; r: number }) {
    return this.player.getPixelForHex(hex);
  }
}
