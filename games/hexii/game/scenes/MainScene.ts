import * as Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import type { EnemyType } from '../entities/Enemy';
import { ExpDrop } from '../entities/ExpDrop';
import { useGameStore } from '../../store/gameStore';
import { COLORS } from '../config';

export class MainScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private expDrops: ExpDrop[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 2000; // ms between spawns
  private gameStarted: boolean = false;
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private pauseText!: Phaser.GameObjects.Text;
  private isDead: boolean = false;

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
    
    // Set up Escape key for pause
    this.escapeKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.escapeKey.on('down', () => {
      this.togglePause();
    });
    
    // Create pause text (initially hidden) - fixed to camera
    this.pauseText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      'PAUSED',
      {
        fontSize: '64px',
        color: '#ffa502',
        fontFamily: 'Arial Black',
      }
    ).setOrigin(0.5).setVisible(false).setDepth(1000).setScrollFactor(0); // Fixed to camera
    
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
  
  /**
   * Toggle pause state
   */
  private togglePause(): void {
    const store = useGameStore.getState();
    // Don't allow pausing during construction mode
    if (store.isConstructionMode) {
      return;
    }
    
    const newPausedState = !store.isPaused;
    store.setPaused(newPausedState);
    // The subscription will handle scene pause/resume and pause text visibility
  }

  private pendingShipUpdate: Record<string, import('../../store/gameStore').HexModule> | null = null;

  private initStoreSubscription(): void {
    // Listen for ship changes
    useGameStore.subscribe((state, prevState) => {
      // Defer ship updates to next frame to avoid Phaser crashes during update loop
      if (state.ship !== prevState.ship) {
        this.pendingShipUpdate = state.ship;
      }
      
      // Update pause text visibility (safe operation)
      if (state.isPaused !== prevState.isPaused) {
        this.pauseText.setVisible(state.isPaused);
      }
    });
    
    // Initial sync
    const state = useGameStore.getState();
    if (Object.keys(state.ship).length > 0) {
      this.player.initFromStore(state.ship);
    }
  }

  private createBackground(): void {
    // Create infinite starfield background
    // Stars will be positioned randomly in world space
    const graphics = this.add.graphics();
    
    // Create stars in a large area around origin
    const starCount = 500;
    const starFieldSize = 5000; // Large area for stars
    
    for (let i = 0; i < starCount; i++) {
      const x = (Math.random() - 0.5) * starFieldSize;
      const y = (Math.random() - 0.5) * starFieldSize;
      const alpha = 0.2 + Math.random() * 0.3;
      const size = 0.5 + Math.random() * 1.5;
      
      graphics.fillStyle(COLORS.WHITE, alpha);
      graphics.fillCircle(x, y, size);
    }
    
    graphics.setDepth(-1);
  }

  update(_time: number, delta: number): void {
    if (!this.gameStarted) return;
    
    // Process deferred ship updates (safe to do at start of frame)
    if (this.pendingShipUpdate) {
      this.player.initFromStore(this.pendingShipUpdate);
      this.pendingShipUpdate = null;
    }
    
    const store = useGameStore.getState();
    if (store.isPaused) return;
    
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
      enemy.update();
    });
    
    // Clean up destroyed enemies
    this.enemies = this.enemies.filter((e) => e.active);
    
    // Update exp drops
    this.expDrops.forEach((drop) => drop.update());
    this.expDrops = this.expDrops.filter((d) => d.active);
    
    // Check collisions
    this.checkProjectileCollisions();
    this.checkEnemyCollisions();
    this.checkExpDropCollisions();
    
    // Spawn enemies
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
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
    
    const enemy = new Enemy(this, x, y, type);
    this.enemies.push(enemy);
  }

  /**
   * Check collisions between projectiles and enemies
   */
  private checkProjectileCollisions(): void {
    const store = useGameStore.getState();
    const projectiles = this.player.getProjectiles();
    
    projectiles.forEach((projectile) => {
      if (!projectile.active) return;
      
      this.enemies.forEach((enemy) => {
        if (!enemy.active) return;
        
        // Distance-based collision
        const dx = enemy.x - projectile.x;
        const dy = enemy.y - projectile.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = enemy.getSize() + projectile.config.size;
        
        if (dist < minDist) {
          // Enemy takes damage
          const destroyed = enemy.takeDamage(projectile.getDamage());
          
          if (destroyed) {
            // Enemy destroyed
            store.addScore(enemy.getScore());
            
            // Spawn exp drop
            const drop = new ExpDrop(this, enemy.x, enemy.y);
            this.expDrops.push(drop);
            
            // Particle effect already handled in Enemy.die()
          }
          
          // Destroy projectile (unless piercing)
          if (!projectile.isPiercing()) {
            projectile.destroy();
          } else {
            // For piercing projectiles, mark but don't destroy immediately
            // They can hit multiple enemies
          }
        }
      });
    });
  }
  
  /**
   * Check collisions between exp drops and player (with magnet effect)
   */
  private checkExpDropCollisions(): void {
    const store = useGameStore.getState();
    const playerPos = this.player.getPosition();
    const playerRadius = this.player.getBody().halfWidth;
    const magnetRadius = 150; // Distance at which drops start being attracted
    
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
        // Pick up exp drop
        store.addExp(1); // Each drop gives 1 exp
        drop.destroy();
      } else {
        // Stop movement if outside magnet range
        drop.getPhysicsBody().setVelocity(0, 0);
      }
    });
  }
  
  /**
   * Check collisions between enemies and player
   */
  private checkEnemyCollisions(): void {
    const store = useGameStore.getState();
    const playerPos = this.player.getPosition();
    const playerRadius = this.player.getBody().halfWidth;
    
    this.enemies.forEach((enemy) => {
      if (!enemy.active) return;
      
      // Simple distance-based collision
      const dx = enemy.x - playerPos.x;
      const dy = enemy.y - playerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = playerRadius + enemy.getSize();
      
      if (dist < minDist) {
        // Player takes damage
        store.takeDamage(enemy.getDamage());
        this.player.flashDamage();
        
        // Destroy enemy on contact (they're melee)
        store.addScore(enemy.getScore());
        enemy.takeDamage(9999);
        
        // Check game over
        if (store.hp <= 0 && !this.isDead) {
          this.playerDeath();
        }
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
