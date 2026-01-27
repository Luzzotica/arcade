import * as Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy, getBossTypeFromNumber } from '../entities/Enemy';
import type { EnemyType } from '../entities/Enemy';
import { ExpDrop } from '../entities/ExpDrop';
import { HexChest } from '../entities/HexChest';
import { useGameStore } from '../../store/gameStore';
import { COLORS, PLAYER_SPEED, TEST_MODE } from '../config';
import { synergyCalculator, type SynergyStats } from '../utils/SynergyCalculator';
import { SYNERGY_VALUES } from '../config/SynergyConfig';
import { getBossShapeFromNumber } from '../data/BossDialogues';
import { audioManager } from '../audio/AudioManager';

export class MainScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private expDrops: ExpDrop[] = [];
  private hexChests: HexChest[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 1500;
  private gameStarted: boolean = false;
  private isDead: boolean = false;
  
  // Wave system
  private waveTimer: number = 0;
  private waveDuration: number = 30000;
  private enemiesPerSpawn: number = 1;
  private enemyHpMultiplier: number = 1;
  private enemyDamageMultiplier: number = 1;
  private bossSpawned: boolean = false;
  private starGraphics!: Phaser.GameObjects.Graphics;
  
  // Field visuals
  private blueFieldGraphics: Phaser.GameObjects.Graphics | null = null;
  private corrosionFieldGraphics: Phaser.GameObjects.Graphics | null = null;
  
  // Frozen state for boss dialogue
  private frozenVelocities: Map<Phaser.Physics.Arcade.Body, { vx: number; vy: number }> = new Map();
  
  // Regen timers
  private hpRegenTimer: number = 0;
  private shieldRegenTimer: number = 0;
  private regenTickInterval: number = 1000;
  
  // Synergy state
  private currentStats: SynergyStats | null = null;
  private lastPlayerPos: { x: number; y: number } = { x: 0, y: 0 };
  private lastHitTime: number = 0; // For Living Hull synergy
  private barkskinTimer: number = 0; // For Barkskin synergy
  private barkskinActive: boolean = false;
  private speedBoostTimer: number = 0; // For Kinetic Absorber synergy
  
  // Store subscription cleanup
  private unsubscribeFromStore: (() => void) | null = null;

  constructor() {
    super({ key: 'MainScene' });
  }
  
  /**
   * Get current synergy stats (recalculates if needed)
   */
  private getStats(): SynergyStats {
    if (!this.currentStats) {
      const store = useGameStore.getState();
      this.currentStats = synergyCalculator.calculate(store.ship);
    }
    return this.currentStats;
  }

  /**
   * Get active enemies that haven't been destroyed
   * Filters out enemies that are inactive or have lost their scene reference
   */
  private getActiveEnemies(): Enemy[] {
    return this.enemies.filter((enemy) => enemy.active && enemy.scene);
  }
  
  /**
   * Update synergy stats and store
   */
  private updateSynergyStats(ship: Record<string, import('../../store/gameStore').HexModule>): void {
    synergyCalculator.invalidate();
    this.currentStats = synergyCalculator.calculate(ship);
    
    // Update store with calculated values
    useGameStore.setState({
      shieldRegenRate: this.currentStats.shieldRegenRate,
      hpRegenRate: this.currentStats.hpRegenRate,
      activeUltimates: this.currentStats.ultimates,
      pickupRadiusBonus: this.currentStats.pickupRadiusBonus,
      damageReduction: this.currentStats.damageReduction,
    });
  }

  create(): void {
    this.physics.world.setBounds(-10000, -10000, 20000, 20000);
    this.player = new Player(this, 0, 0);
    
    // Set up enemies callback for mobile auto-shooting
    this.player.setEnemiesCallback(() => this.enemies);
    
    this.cameras.main.setBounds(-10000, -10000, 20000, 20000);
    this.cameras.main.startFollow(this.player.getContainer(), true, 0.1, 0.1);
    this.cameras.main.setDeadzone(0, 0);
    
    this.events.on('shutdown', this.shutdown, this);
    this.events.on('destroy', this.shutdown, this);
    
    this.initStoreSubscription();
    this.createBackground();
    
    const store = useGameStore.getState();
    if (Object.keys(store.ship).length === 0) {
      store.initializeShip('RED');
    }
    
    this.spawnInitialExpDrops();
    this.gameStarted = true;
    
    // Test mode: press 'B' to spawn next boss
    if (TEST_MODE) {
      this.input.keyboard?.on('keydown-B', () => {
        this.spawnBoss();
      });
    }
  }
  
  private spawnInitialExpDrops(): void {
    const centerX = 0;
    const centerY = 0;
    const spawnRadius = 300;
    
    for (let i = 0; i < 15; i++) {
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
    if (this.unsubscribeFromStore) {
      this.unsubscribeFromStore();
      this.unsubscribeFromStore = null;
    }
    
    this.unsubscribeFromStore = useGameStore.subscribe((state, prevState) => {
      if (!this.scene || !this.scene.manager) return;
      
      if (state.ship !== prevState.ship) {
        this.pendingShipUpdate = state.ship;
        this.updateSynergyStats(state.ship);
        
        if (!state.isConstructionMode && prevState.isConstructionMode && this.bossHexQueue.length > 0) {
          this.time.delayedCall(100, () => this.showNextBossHex());
        }
      }
      
      // Don't pause scene during boss dialogue camera pans - we need camera to update
      const bossDialoguePanning = state.bossDialoguePhase === 'pan_to_boss' || state.bossDialoguePhase === 'pan_to_player';
      const shouldPauseScene = (state.isPaused && !bossDialoguePanning) || state.isConstructionMode || state.showPauseMenu || state.showAuthModal || state.isDead;
      const wasPausedScene = (prevState.isPaused && prevState.bossDialoguePhase !== 'pan_to_boss' && prevState.bossDialoguePhase !== 'pan_to_player') || prevState.isConstructionMode || prevState.showPauseMenu || prevState.showAuthModal || prevState.isDead;
      
      if (shouldPauseScene && !wasPausedScene) {
        this.scene.pause('MainScene');
      } else if (!shouldPauseScene && wasPausedScene) {
        this.scene.resume('MainScene');
      }
    });
    
    const state = useGameStore.getState();
    if (Object.keys(state.ship).length > 0) {
      this.player.initFromStore(state.ship);
      this.updateSynergyStats(state.ship);
    }
  }

  shutdown(): void {
    if (this.unsubscribeFromStore) {
      this.unsubscribeFromStore();
      this.unsubscribeFromStore = null;
    }
    
    // Clean up field graphics
    if (this.blueFieldGraphics) {
      this.blueFieldGraphics.destroy();
      this.blueFieldGraphics = null;
    }
    if (this.corrosionFieldGraphics) {
      this.corrosionFieldGraphics.destroy();
      this.corrosionFieldGraphics = null;
    }
  }

  private createBackground(): void {
    this.starGraphics = this.add.graphics();
    const starCount = 1000;
    const starFieldSize = 10000;
    
    for (let i = 0; i < starCount; i++) {
      const x = (Math.random() - 0.5) * starFieldSize;
      const y = (Math.random() - 0.5) * starFieldSize;
      const alpha = 0.4 + Math.random() * 0.6;
      const size = 1 + Math.random() * 2;
      
      const colorRoll = Math.random();
      let color = COLORS.WHITE;
      if (colorRoll < 0.1) color = 0x88ccff;
      else if (colorRoll < 0.15) color = 0xffcc88;
      
      this.starGraphics.fillStyle(color, alpha);
      this.starGraphics.fillCircle(x, y, size);
    }
    
    this.starGraphics.setDepth(-1);
  }

  update(_time: number, delta: number): void {
    if (!this.gameStarted) return;
    
    const store = useGameStore.getState();
    
    // During boss dialogue, skip game logic but allow camera pans to continue
    if (store.showBossDialogue) {
      return;
    }
    
    if (this.pendingShipUpdate) {
      this.player.initFromStore(this.pendingShipUpdate);
      this.pendingShipUpdate = null;
    }
    
    const stats = this.getStats();
    
    // Update timers
    this.hpRegenTimer += delta;
    this.shieldRegenTimer += delta;
    this.barkskinTimer -= delta;
    this.speedBoostTimer -= delta;
    
    // Get player velocity for speed-based synergies
    const playerVel = this.player.getBody().velocity;
    const playerSpeed = Math.sqrt(playerVel.x ** 2 + playerVel.y ** 2);
    const speedRatio = Math.min(1, playerSpeed / PLAYER_SPEED);
    
    // Calculate current regen rates
    let currentHpRegenRate = stats.hpRegenRate;
    let currentShieldRegenRate = stats.shieldRegenRate;
    
    // METABOLISM: Regen rate increases based on move speed
    if (stats.synergies.metabolism && currentHpRegenRate > 0) {
      currentHpRegenRate *= (1 + speedRatio);
    }
    
    // ION SHIELD: Moving adds to shield regen
    if (stats.synergies.ionShield && playerSpeed > 50) {
      currentShieldRegenRate += speedRatio * 2;
    }
    
    // BARKSKIN: Temporary damage reduction after heal
    if (this.barkskinTimer > 0 && stats.synergies.barkskin) {
      this.barkskinActive = true;
    } else {
      this.barkskinActive = false;
    }
    
    // LIVING HULL: Heal if not hit for cooldown duration
    if (stats.synergies.livingHull && _time - this.lastHitTime > SYNERGY_VALUES.LIVING_HULL.cooldown) {
      if (store.hp < store.maxHp) {
        store.heal(SYNERGY_VALUES.LIVING_HULL.healAmount);
        this.lastHitTime = _time;
      }
    }
    
    // HP Regen
    if (currentHpRegenRate > 0 && this.hpRegenTimer >= this.regenTickInterval) {
      this.hpRegenTimer = 0;
      
      // OVER_SHIELD: HP regen fills shield when HP is full
      if (stats.synergies.overShield && store.hp >= store.maxHp) {
        store.regenShield(currentHpRegenRate);
      } else {
        store.heal(currentHpRegenRate);
      }
      
      // BARKSKIN: Grant temporary armor after heal tick
      if (stats.synergies.barkskin) {
        this.barkskinTimer = SYNERGY_VALUES.BARKSKIN.duration;
      }
    }
    
    // Shield Regen
    if (currentShieldRegenRate > 0 && this.shieldRegenTimer >= this.regenTickInterval) {
      this.shieldRegenTimer = 0;
      store.regenShield(currentShieldRegenRate);
    }
    
    // Wave timer
    this.waveTimer += delta;
    if (this.waveTimer >= this.waveDuration) {
      this.advanceWave();
    }
    
    // Update player
    this.player.update(_time, delta);
    
    const playerPos = this.player.getPosition();
    
    // Update YELLOW synergies (trails, etc.)
    this.updateYellowSynergies(playerPos, playerSpeed, delta, stats);
    
    // Update BLUE field synergies
    this.updateBlueFieldSynergies(playerPos, delta, stats);
    
    // Update projectiles
    const projectiles = this.player.getProjectiles();
    const enemyObjects = this.getActiveEnemies().map(e => e as Phaser.GameObjects.GameObject);
    projectiles.forEach((projectile) => projectile.update(_time, delta, enemyObjects));
    
    // Update enemies
    this.getActiveEnemies().forEach((enemy) => {
      enemy.setTarget(playerPos.x, playerPos.y);
      enemy.update(delta);
    });
    
    this.checkEnemyEnemyCollisions();
    this.updateBossHealthBar();
    this.enemies = this.enemies.filter((e) => e.active && e.scene);
    
    this.expDrops.forEach((drop) => drop.update());
    this.expDrops = this.expDrops.filter((d) => d.active);
    
    this.hexChests.forEach((chest) => chest.update());
    this.hexChests = this.hexChests.filter((c) => c.active);
    
    this.checkProjectileCollisions();
    this.checkEnemyCollisions();
    this.checkExpDropCollisions();
    this.checkHexChestCollisions();
    
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnEnemies();
    }
    
    this.lastPlayerPos = playerPos;
  }

  /**
   * Update YELLOW synergies (trails, wake, etc.)
   */
  private updateYellowSynergies(
    playerPos: { x: number; y: number },
    playerSpeed: number,
    delta: number,
    stats: SynergyStats
  ): void {
    if (playerSpeed < 50) return;
    
    const playerAngle = Math.atan2(
      this.player.getBody().velocity.y,
      this.player.getBody().velocity.x
    );
    
    // AFTERBURNER: Fire trail DPS
    if (stats.synergies.afterburner) {
      const trailLength = 100;
      const trailX = playerPos.x - Math.cos(playerAngle) * trailLength;
      const trailY = playerPos.y - Math.sin(playerAngle) * trailLength;
      
      this.getActiveEnemies().forEach((enemy) => {
        const dx = enemy.x - trailX;
        const dy = enemy.y - trailY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 50) {
          enemy.takeDamage(5 * (delta / 1000));
        }
      });
    }
    
    // VACUUM_WAKE: Pull enemies behind ship
    if (stats.synergies.vacuumWake) {
      const wakeLength = SYNERGY_VALUES.VACUUM_WAKE.wakeLength;
      const wakeX = playerPos.x - Math.cos(playerAngle) * wakeLength;
      const wakeY = playerPos.y - Math.sin(playerAngle) * wakeLength;
      
      this.getActiveEnemies().forEach((enemy) => {
        if (enemy.isBoss()) return; // Bosses can't be pulled
        const dx = enemy.x - wakeX;
        const dy = enemy.y - wakeY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < SYNERGY_VALUES.VACUUM_WAKE.wakeRadius) {
          const pullForce = SYNERGY_VALUES.VACUUM_WAKE.pullForce;
          const pullAngle = Math.atan2(wakeY - enemy.y, wakeX - enemy.x);
          const body = enemy.getBody();
          if (body) {
            body.setVelocity(
              body.velocity.x + Math.cos(pullAngle) * pullForce * (delta / 1000),
              body.velocity.y + Math.sin(pullAngle) * pullForce * (delta / 1000)
            );
          }
        }
      });
    }
  }

  /**
   * Update BLUE field synergies
   */
  private updateBlueFieldSynergies(
    playerPos: { x: number; y: number },
    delta: number,
    stats: SynergyStats
  ): void {
    const baseFieldRadius = SYNERGY_VALUES.THERMAL_FIELD.baseRadius + stats.fieldRadius;
    const hasBlueField = stats.synergies.thermalField || stats.synergies.stasisField || 
                        stats.synergies.staticCharge || stats.synergies.leechField;
    
    // Create or update BLUE field visual
    if (hasBlueField) {
      if (!this.blueFieldGraphics) {
        this.blueFieldGraphics = this.add.graphics();
        this.blueFieldGraphics.setDepth(1);
      }
      
      // Draw field circle
      this.blueFieldGraphics.clear();
      this.blueFieldGraphics.lineStyle(2, COLORS.BLUE, 0.3);
      this.blueFieldGraphics.strokeCircle(playerPos.x, playerPos.y, baseFieldRadius);
      
      // Add pulsing effect
      const pulseAlpha = 0.1 + Math.sin(this.time.now * 0.005) * 0.1;
      this.blueFieldGraphics.fillStyle(COLORS.BLUE, pulseAlpha);
      this.blueFieldGraphics.fillCircle(playerPos.x, playerPos.y, baseFieldRadius);
    } else {
      if (this.blueFieldGraphics) {
        this.blueFieldGraphics.destroy();
        this.blueFieldGraphics = null;
      }
    }
    
    if (!hasBlueField) return;
    
    this.getActiveEnemies().forEach((enemy) => {
      const dx = enemy.x - playerPos.x;
      const dy = enemy.y - playerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < baseFieldRadius) {
        // THERMAL_FIELD: DPS to enemies
        if (stats.synergies.thermalField) {
          const damage = stats.fieldDps * (delta / 1000);
          enemy.takeDamage(damage);
          
          // LEECH_FIELD: Heal from damage
          if (stats.synergies.leechField) {
            useGameStore.getState().heal(damage * SYNERGY_VALUES.LEECH_FIELD.healRatio);
          }
        }
        
        // STASIS_FIELD: Slow enemies
        if (stats.synergies.stasisField) {
          enemy.applySlow(stats.fieldSlowPercent, 100);
        }
        
        // STATIC_CHARGE: Stun on entry (tracked by enemy)
        if (stats.synergies.staticCharge) {
          enemy.applyStun(stats.fieldStunDuration * 1000);
        }
      }
    });
  }

  private advanceWave(): void {
    useGameStore.getState().nextWave();
    
    // Get fresh state after increment
    const store = useGameStore.getState();
    const currentWave = store.wave;
    this.waveTimer = 0;
    this.bossSpawned = false;
    
    // Exponential scaling for HP and damage
    this.enemyHpMultiplier = 1 + (currentWave - 1) * 0.25;
    this.enemyDamageMultiplier = Math.pow(1.05, currentWave - 1); // 20% increase per wave (exponential)
    this.enemiesPerSpawn = Math.min(1 + Math.floor((currentWave - 1) / 2), 5);
    this.spawnInterval = Math.max(1500 - (currentWave - 1) * 100, 500);
    
    // In test mode, spawn boss every wave; otherwise every 5 waves
    const shouldSpawnBoss = TEST_MODE 
      ? currentWave > 0 
      : (currentWave > 0 && currentWave % 5 === 0);
    
    if (shouldSpawnBoss) {
      this.time.delayedCall(1000, () => this.spawnBoss());
    }
    
    // Show React wave announcement
    store.setWaveAnnouncement(true);
  }

  private checkEnemyEnemyCollisions(): void {
    const activeEnemies = this.getActiveEnemies();
    for (let i = 0; i < activeEnemies.length; i++) {
      for (let j = i + 1; j < activeEnemies.length; j++) {
        const e1 = activeEnemies[i];
        const e2 = activeEnemies[j];
        
        // Bosses can't be pushed
        if (e1.isBoss() || e2.isBoss()) continue;
        
        const dx = e2.x - e1.x;
        const dy = e2.y - e1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = e1.getSize() + e2.getSize();
        
        if (dist < minDist && dist > 0) {
          const overlap = minDist - dist;
          const pushX = (dx / dist) * overlap * 0.5;
          const pushY = (dy / dist) * overlap * 0.5;
          e1.setPosition(e1.x - pushX, e1.y - pushY);
          e2.setPosition(e2.x + pushX, e2.y + pushY);
        }
      }
    }
  }

  private spawnEnemies(): void {
    for (let i = 0; i < this.enemiesPerSpawn; i++) {
      this.spawnEnemy();
    }
  }

  private spawnEnemy(): void {
    const camera = this.cameras.main;
    const camLeft = camera.worldView.x;
    const camRight = camera.worldView.x + camera.worldView.width;
    const camTop = camera.worldView.y;
    const camBottom = camera.worldView.y + camera.worldView.height;
    
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;
    const margin = 100;
    
    switch (side) {
      case 0: x = camLeft + Math.random() * (camRight - camLeft); y = camTop - margin; break;
      case 1: x = camRight + margin; y = camTop + Math.random() * (camBottom - camTop); break;
      case 2: x = camLeft + Math.random() * (camRight - camLeft); y = camBottom + margin; break;
      default: x = camLeft - margin; y = camTop + Math.random() * (camBottom - camTop); break;
    }
    
    const roll = Math.random();
    let type: EnemyType;
    if (roll < 0.6) type = 'TRIANGLE';
    else if (roll < 0.85) type = 'SQUARE';
    else type = 'PENTAGON';
    
    const enemy = new Enemy(this, x, y, type, this.enemyHpMultiplier, this.enemyDamageMultiplier, (e) => this.handleEnemyDeath(e));
    this.enemies.push(enemy);
  }

  private spawnBoss(): void {
    if (this.bossSpawned) return;
    this.bossSpawned = true;
    
    const store = useGameStore.getState();
    const currentWave = store.wave;
    const bossesDefeated = store.bossesDefeated;
    
    // Calculate boss number from wave: bosses spawn on waves 5, 10, 15, 20, 25, etc.
    // Wave 5 = Boss 1, Wave 10 = Boss 2, Wave 15 = Boss 3, Wave 20 = Boss 4, Wave 25 = Boss 5, then cycles
    const bossWaveIndex = Math.floor((currentWave - 1) / 5);
    const bossNumber = (bossWaveIndex % 5) + 1;
    
    // Get boss type based on calculated boss number (1-5)
    const bossType = getBossTypeFromNumber(bossNumber);
    const bossShape = getBossShapeFromNumber(bossNumber);
    
    // Additional scaling based on bosses defeated (for post-win cycles)
    const cycleBonus = Math.floor(bossesDefeated / 5) * 0.5; // +50% per complete cycle
    let totalHpMultiplier = this.enemyHpMultiplier * (1 + cycleBonus);
    const totalDamageMultiplier = this.enemyDamageMultiplier * (1 + cycleBonus);
    
    // In test mode, reduce boss HP to 1/10
    if (TEST_MODE) {
      totalHpMultiplier *= 0.1;
    }
    
    const camera = this.cameras.main;
    const playerPos = this.player.getPosition();
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(camera.width, camera.height) * 0.7;
    const x = playerPos.x + Math.cos(angle) * distance;
    const y = playerPos.y + Math.sin(angle) * distance;
    
    const boss = new Enemy(this, x, y, bossType, totalHpMultiplier, totalDamageMultiplier, (e) => this.handleEnemyDeath(e));
    this.enemies.push(boss);
    
    // Freeze all entities during boss dialogue
    this.freezeAllEntities();
    
    // Trigger boss dialogue with position for camera panning
    store.setBossDialogue(true, bossShape, { x, y });
    
    // Start camera pan to boss
    this.panCameraToBoss(x, y);
  }
  
  /**
   * Pan camera to boss position
   */
  private panCameraToBoss(x: number, y: number): void {
    const store = useGameStore.getState();
    const camera = this.cameras.main;
    
    // Stop following player temporarily
    camera.stopFollow();
    
    // Pan to boss
    camera.pan(x, y, 1000, 'Sine.easeInOut', true, (_cam, progress) => {
      if (progress === 1) {
        // Camera arrived at boss, update phase
        store.setBossDialoguePhase('boss_talking');
      }
    });
    
    this.cameras.main.shake(300, 0.01);
  }
  
  /**
   * Pan camera back to player
   */
  public panCameraToPlayer(): void {
    const store = useGameStore.getState();
    const camera = this.cameras.main;
    const playerPos = this.player.getPosition();
    
    // Pan back to player
    camera.pan(playerPos.x, playerPos.y, 1000, 'Sine.easeInOut', true, (_cam, progress) => {
      if (progress === 1) {
        // Camera arrived at player, update phase and resume following
        camera.startFollow(this.player.getContainer(), true, 0.1, 0.1);
        store.setBossDialoguePhase('player_talking');
      }
    });
  }
  
  /**
   * Called when player dismisses dialogue and engages boss
   */
  public engageBoss(): void {
    const camera = this.cameras.main;
    
    // Ensure camera is following player
    camera.startFollow(this.player.getContainer(), true, 0.1, 0.1);
    
    // Unfreeze all entities
    this.unfreezeAllEntities();
  }
  
  /**
   * Freeze all entities (player, enemies, exp drops) during boss dialogue
   */
  private freezeAllEntities(): void {
    this.frozenVelocities.clear();
    
    // Freeze player
    const playerBody = this.player.getBody();
    this.frozenVelocities.set(playerBody, { vx: playerBody.velocity.x, vy: playerBody.velocity.y });
    this.player.stopMovement();
    
    // Freeze all enemies
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const body = enemy.getBody();
      if (body) {
        this.frozenVelocities.set(body, { vx: body.velocity.x, vy: body.velocity.y });
        body.setVelocity(0, 0);
      }
    }
    
    // Freeze all exp drops
    for (const drop of this.expDrops) {
      if (!drop.active) continue;
      const body = drop.getPhysicsBody();
      if (body) {
        this.frozenVelocities.set(body, { vx: body.velocity.x, vy: body.velocity.y });
        body.setVelocity(0, 0);
      }
    }
    
    // Freeze all hex chests
    for (const chest of this.hexChests) {
      if (!chest.active) continue;
      const body = (chest as any).physicsBody;
      if (body) {
        this.frozenVelocities.set(body, { vx: body.velocity.x, vy: body.velocity.y });
        body.setVelocity(0, 0);
      }
    }
  }
  
  /**
   * Unfreeze all entities after boss dialogue ends
   */
  private unfreezeAllEntities(): void {
    // Restore all stored velocities
    for (const [body, vel] of this.frozenVelocities) {
      if (body && body.gameObject?.active) {
        body.setVelocity(vel.vx, vel.vy);
      }
    }
    this.frozenVelocities.clear();
  }

  /**
   * Centralized handler for enemy death - handles drops, scoring, and effects
   */
  private handleEnemyDeath(enemy: Enemy): void {
    const store = useGameStore.getState();
    const stats = this.getStats();
    
    // Play enemy death SFX (throttled and pitch-modulated for variety)
    audioManager.playSFX('enemy-death');
    
    // Add score
    store.addScore(enemy.getScore());
    
    // ADRENALINE: Instant heal on kill
    if (stats.synergies.adrenaline) {
      store.heal(SYNERGY_VALUES.ADRENALINE.healAmount);
    }
    
    // Handle drops based on enemy type
    if (enemy.isBoss()) {
      this.dropHexChestFromBoss(enemy.x, enemy.y, enemy.getType());
    } else {
      const enemyType = enemy.getType();
      const dropType = (enemyType === 'PENTAGON' || enemyType === 'SQUARE') ? 'LARGE' : 'SMALL';
      const drop = new ExpDrop(this, enemy.x, enemy.y, dropType);
      this.expDrops.push(drop);
    }
  }

  private checkProjectileCollisions(): void {
    const store = useGameStore.getState();
    const stats = this.getStats();
    const projectiles = this.player.getProjectiles();
    
    for (const projectile of projectiles) {
      if (!projectile.active) continue;
      
      for (const enemy of this.enemies) {
        if (!enemy.active) continue;
        
        const dx = enemy.x - projectile.x;
        const dy = enemy.y - projectile.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = enemy.getSize() + projectile.config.size;
        
        if (dist < minDist) {
          if (projectile.isPiercing() && projectile.hasHitEnemy(enemy)) continue;
          
          const destroyed = enemy.takeDamage(projectile.getDamage());
          
          // HEAVY_IMPACT: Knockback (bosses are immune to physics)
          if ((projectile as any).isHeavyImpact?.() && !enemy.isBoss()) {
            const knockbackForce = 500;
            const knockbackAngle = Math.atan2(enemy.y - projectile.y, enemy.x - projectile.x);
            const body = enemy.getBody();
            if (body) {
              body.setVelocity(
                body.velocity.x + Math.cos(knockbackAngle) * knockbackForce,
                body.velocity.y + Math.sin(knockbackAngle) * knockbackForce
              );
            }
          }
          
          if (projectile.isPiercing()) projectile.markEnemyHit(enemy);
          
          // Enemy death is handled by the callback in handleEnemyDeath()
          
          if (!projectile.isPiercing()) projectile.destroy();
        }
      }
    }
  }

  private dropHexChestFromBoss(x: number, y: number, bossType?: string): void {
    const store = useGameStore.getState();
    
    // Handle boss defeat (increments counters, may trigger win screen)
    store.defeatBoss(bossType);
    
    const roll = Math.random();
    let hexCount = 1;
    if (roll < 0.01) hexCount = 5;
    else if (roll < 0.06) hexCount = 3;
    
    const colors: Array<'RED' | 'GREEN' | 'YELLOW' | 'BLUE' | 'CYAN' | 'ORANGE'> = ['RED', 'GREEN', 'YELLOW', 'BLUE', 'CYAN', 'ORANGE'];
    const hexes: Array<import('../../store/gameStore').HexModule> = [];
    
    for (let i = 0; i < hexCount; i++) {
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      hexes.push({ type: 'MODULE', color: randomColor, health: 100 });
    }
    
    const chest = new HexChest(this, x, y, hexes);
    this.hexChests.push(chest);
    
    const chestText = this.add.text(
      this.cameras.main.width / 2,
      100,
      hexCount > 1 ? `CHEST DROPPED! (${hexCount} HEXES)` : 'CHEST DROPPED!',
      { fontSize: '28px', color: hexCount >= 5 ? '#ffd700' : hexCount >= 3 ? '#ff00ff' : '#00ffff', fontFamily: 'Arial Black' }
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
        this.bossHexQueue = [...chest.getHexes()];
        chest.destroy();
        this.showNextBossHex();
      }
    });
  }

  private showNextBossHex(): void {
    if (this.bossHexQueue.length === 0) return;
    
    const nextHex = this.bossHexQueue.shift()!;
    const store = useGameStore.getState();
    
    if (this.bossHexQueue.length > 0) {
      const remainingText = this.add.text(
        this.cameras.main.width / 2,
        100,
        `${this.bossHexQueue.length + 1} HEXES REMAINING!`,
        { fontSize: '24px', color: '#ffa502', fontFamily: 'Arial Black' }
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
  
  private checkExpDropCollisions(): void {
    const store = useGameStore.getState();
    const stats = this.getStats();
    const playerPos = this.player.getPosition();
    const playerRadius = this.player.getBody().halfWidth;
    
    const magnetRadius = SYNERGY_VALUES.BASE_MAGNET.baseRadius + stats.pickupRadiusBonus;
    const magnetStrength = stats.magnetStrength || SYNERGY_VALUES.BASE_MAGNET.baseStrength;
    
    this.expDrops.forEach((drop) => {
      if (!drop.active) return;
      
      const dx = drop.x - playerPos.x;
      const dy = drop.y - playerPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pickupDist = playerRadius + drop.getPickupRadius();
      
      // CORROSION_FIELD: Enemies in pickup range take more damage (handled in enemy damage)
      
      if (dist < magnetRadius && dist > pickupDist) {
        const vx = -(dx / dist) * magnetStrength;
        const vy = -(dy / dist) * magnetStrength;
        drop.getPhysicsBody().setVelocity(vx, vy);
      } else if (dist <= pickupDist) {
        const expValue = drop.getExpValue();
        store.addExp(expValue);
        
        // BIO_FUEL or NUTRIENTS: Heal on pickup
        if (stats.synergies.bioFuel) {
          store.heal(SYNERGY_VALUES.BIO_FUEL.healOnPickup);
        }
        if (stats.synergies.nutrients) {
          store.heal(SYNERGY_VALUES.NUTRIENTS.healOnPickup);
        }
        
        // ENERGY_SIPHON: Shield on pickup
        if (stats.synergies.energySiphon) {
          store.regenShield(expValue * SYNERGY_VALUES.ENERGY_SIPHON.shieldPerExp);
        }
        
        // UNSTABLE_ISOTOPE: Explode on pickup
        if (stats.synergies.unstableIsotope) {
          const explosionRadius = SYNERGY_VALUES.UNSTABLE_ISOTOPE.explosionRadius;
          this.getActiveEnemies().forEach((enemy) => {
            const edx = enemy.x - drop.x;
            const edy = enemy.y - drop.y;
            const edist = Math.sqrt(edx * edx + edy * edy);
            if (edist < explosionRadius) {
              enemy.takeDamage(SYNERGY_VALUES.UNSTABLE_ISOTOPE.explosionDamage);
            }
          });
          
          // Visual explosion effect
          const explosion = this.add.circle(drop.x, drop.y, 5, 0xff4444, 0.8);
          this.tweens.add({
            targets: explosion,
            radius: explosionRadius,
            alpha: 0,
            duration: 200,
            onComplete: () => explosion.destroy(),
          });
        }
        
        drop.destroy();
      } else {
        drop.getPhysicsBody().setVelocity(0, 0);
      }
    });
  }
  
  private checkEnemyCollisions(): void {
    const store = useGameStore.getState();
    const stats = this.getStats();
    const hexPositions = this.player.getHexWorldPositions();
    const playerVel = this.player.getBody().velocity;
    const playerSpeed = Math.sqrt(playerVel.x ** 2 + playerVel.y ** 2);
    
    // Update Corrosion Field visual
    const playerPos = this.player.getPosition();
    if (stats.synergies.corrosionField) {
      const corrosionRadius = SYNERGY_VALUES.CORROSION_FIELD.baseRadius + stats.pickupRadiusBonus;
      
      if (!this.corrosionFieldGraphics) {
        this.corrosionFieldGraphics = this.add.graphics();
        this.corrosionFieldGraphics.setDepth(1);
      }
      
      // Draw corrosion field circle (green-tinted)
      this.corrosionFieldGraphics.clear();
      this.corrosionFieldGraphics.lineStyle(2, 0x88ff88, 0.4);
      this.corrosionFieldGraphics.strokeCircle(playerPos.x, playerPos.y, corrosionRadius);
      
      // Add pulsing effect
      const pulseAlpha = 0.05 + Math.sin(this.time.now * 0.004) * 0.05;
      this.corrosionFieldGraphics.fillStyle(0x88ff88, pulseAlpha);
      this.corrosionFieldGraphics.fillCircle(playerPos.x, playerPos.y, corrosionRadius);
    } else {
      if (this.corrosionFieldGraphics) {
        this.corrosionFieldGraphics.destroy();
        this.corrosionFieldGraphics = null;
      }
    }
    
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      
      // CORROSION_FIELD: Apply damage bonus to enemies in pickup range
      if (stats.synergies.corrosionField) {
        const dx = enemy.x - playerPos.x;
        const dy = enemy.y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < SYNERGY_VALUES.CORROSION_FIELD.baseRadius + stats.pickupRadiusBonus) {
          enemy.setCorrosion(true);
        } else {
          enemy.setCorrosion(false);
        }
      }
      
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
        // RAMMING_SPEED: Damage enemy at max speed (ONLY if YELLOW + ORANGE synergy)
        if (stats.synergies.rammingSpeed && playerSpeed > PLAYER_SPEED * SYNERGY_VALUES.RAMMING_SPEED.speedThreshold) {
          const enemyDestroyed = enemy.takeDamage(SYNERGY_VALUES.RAMMING_SPEED.collisionDamage);
          
          // ENTROPY: Permanent defense reduction on attacker
          if (!enemyDestroyed && stats.synergies.entropy) {
            enemy.applyEntropy();
          }
          
          // Enemy death is handled by the callback in handleEnemyDeath()
          // Skip rest of collision handling for destroyed enemy
          if (enemyDestroyed) {
            continue;
          }
        } else {
          // ENTROPY: Permanent defense reduction on attacker (even without ramming speed)
          if (stats.synergies.entropy) {
            enemy.applyEntropy();
          }
        }
        
        if (enemy.canDealDamage()) {
          // Calculate damage with BARKSKIN reduction
          let damage = enemy.getDamage();
          if (this.barkskinActive) {
            damage = Math.max(1, damage - SYNERGY_VALUES.BARKSKIN.armorBonus);
          }
          
          store.takeDamage(damage);
          this.player.flashDamage();
          audioManager.playSFX('player-hurt');
          enemy.setHitCooldown();
          this.lastHitTime = this.time.now;
          
          // KINETIC_ABSORBER: Speed boost on hit
          if (stats.synergies.kineticAbsorber) {
            this.speedBoostTimer = SYNERGY_VALUES.KINETIC_ABSORBER.speedBoostDuration;
          }
          
          // REACTIVE_PLATING: Fire shrapnel
          if (stats.synergies.reactivePlating) {
            this.fireReactivePlating(closestHexX, closestHexY);
          }
          
          // Get fresh HP value after damage was applied
          const currentHp = useGameStore.getState().hp;
          if (currentHp <= 0 && !this.isDead) {
            this.playerDeath();
          }
        }
        
        // Knockback enemy away from the hex they hit (bosses are immune)
        if (!enemy.isBoss()) {
          enemy.knockback(closestHexX, closestHexY, 400);
        }
      }
    }
  }

  /**
   * Fire shrapnel from reactive plating
   */
  private fireReactivePlating(x: number, y: number): void {
    const shrapnelCount = SYNERGY_VALUES.REACTIVE_PLATING.shrapnelCount;
    for (let i = 0; i < shrapnelCount; i++) {
      const angle = (Math.PI * 2 / shrapnelCount) * i;
      const shrapnel = this.add.circle(x, y, 3, 0xff8800, 1);
      
      const targetX = x + Math.cos(angle) * SYNERGY_VALUES.REACTIVE_PLATING.shrapnelRange;
      const targetY = y + Math.sin(angle) * SYNERGY_VALUES.REACTIVE_PLATING.shrapnelRange;
      
      this.tweens.add({
        targets: shrapnel,
        x: targetX,
        y: targetY,
        alpha: 0,
        duration: 300,
        onComplete: () => shrapnel.destroy(),
      });
      
      // Damage enemies in path
      this.getActiveEnemies().forEach((enemy) => {
        const dx = enemy.x - x;
        const dy = enemy.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < SYNERGY_VALUES.REACTIVE_PLATING.shrapnelRange) {
          enemy.takeDamage(SYNERGY_VALUES.REACTIVE_PLATING.shrapnelDamage);
        }
      });
    }
  }

  private playerDeath(): void {
    this.isDead = true;
    this.gameStarted = false;
    
    // Play death sound immediately as death animation starts
    audioManager.playSFX('player-death');
    
    const playerPos = this.player.getPosition();
    this.player.getContainer().setVisible(false);
    this.player.getBody().setVelocity(0, 0);
    this.player.getBody().setAcceleration(0, 0);
    
    const explosionRadius = 100;
    const particleCount = 20;
    
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
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 / particleCount) * i;
      const speed = 150 + Math.random() * 200;
      const size = 2 + Math.random() * 4;
      const color = [0xff4757, 0xff6b81, 0xffffff][Math.floor(Math.random() * 3)];
      
      const particle = this.add.circle(playerPos.x, playerPos.y, size, color, 1);
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
    
    this.cameras.main.shake(500, 0.01);
    
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
    
    this.time.delayedCall(800, () => this.gameOver());
  }
  
  private gameOver(): void {
    // Set dead state - React UI will handle the display
    const store = useGameStore.getState();
    store.setDead(true);
  }

  private updateBossHealthBar(): void {
    const store = useGameStore.getState();
    const boss = this.getActiveEnemies().find((e) => e.isBoss());
    
    if (!boss) {
      store.setBossHealth(null, null);
      return;
    }
    
    store.setBossHealth(boss.getHp(), boss.getMaxHp());
  }

  getValidAttachmentPoints() {
    return this.player.getValidAttachmentPoints();
  }

  getPixelForHex(hex: { q: number; r: number }) {
    return this.player.getPixelForHex(hex);
  }
}
