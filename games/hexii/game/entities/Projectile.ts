import * as Phaser from 'phaser';
import { SYNERGY_VALUES } from '../config/SynergyConfig';

export interface ProjectileConfig {
  damage: number;
  speed: number;
  size: number;
  color: number;
  piercing: boolean;
  lifetime: number;
  homing?: boolean;
  bioOrdnance?: boolean;
  heavyImpact?: boolean;
  baseDamage?: number; // For bio-ordnance growth
  baseSize?: number; // For bio-ordnance growth
  bioOrdnanceCount?: number; // Number of GREEN neighbors for stacking growth
}

export class Projectile extends Phaser.GameObjects.Arc {
  public config: ProjectileConfig;
  private physicsBody!: Phaser.Physics.Arcade.Body;
  private lifetime: number;
  private damage: number;
  private piercing: boolean;
  private hitEnemies: Set<Phaser.GameObjects.GameObject> = new Set(); // Track enemies already hit
  private homing: boolean;
  private bioOrdnance: boolean;
  private heavyImpact: boolean;
  private baseDamage: number;
  private baseSize: number;
  private bioOrdnanceCount: number = 0; // Number of GREEN neighbors for stacking
  private distanceTraveled: number = 0;
  private lastX: number;
  private lastY: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    angle: number,
    config: ProjectileConfig
  ) {
    super(scene, x, y, config.size, 0, 360, false, config.color);
    
    this.config = config;
    this.lifetime = config.lifetime;
    this.damage = config.damage;
    this.piercing = config.piercing;
    this.homing = config.homing || false;
    this.bioOrdnance = config.bioOrdnance || false;
    this.heavyImpact = config.heavyImpact || false;
    this.baseDamage = config.baseDamage || config.damage;
    this.baseSize = config.baseSize || config.size;
    this.bioOrdnanceCount = config.bioOrdnanceCount || 0;
    this.lastX = x;
    this.lastY = y;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.physicsBody = this.body as Phaser.Physics.Arcade.Body;
    
    // Set velocity based on angle
    const vx = Math.cos(angle) * config.speed;
    const vy = Math.sin(angle) * config.speed;
    this.physicsBody.setVelocity(vx, vy);
    
    // Set rotation to match direction
    this.setRotation(angle);
    
    // Visual effects
    if (this.piercing) {
      this.setStrokeStyle(2, 0x88ccff, 0.8); // Ghostly blue outline
    }
    if (this.homing) {
      // Will add thruster trail visual in update
    }
    if (this.heavyImpact) {
      this.setFillStyle(config.color, 1);
      // Make it look heavier
    }
    if (this.bioOrdnance) {
      // Start with green tint for bio-ordnance
      this.setFillStyle(0x2ed573, 0.6);
      this.setStrokeStyle(2, 0x2ed573, 0.8);
    }
    
    // Set collision bounds
    this.physicsBody.setCircle(config.size);
    this.physicsBody.setCollideWorldBounds(true);
    this.physicsBody.onWorldBounds = true;
    
    // Destroy on world bounds
    this.physicsBody.world.on('worldbounds', (body: Phaser.Physics.Arcade.Body) => {
      if (body === this.physicsBody) {
        this.destroy();
      }
    });
  }

  update(_time: number, delta: number, enemies?: Phaser.GameObjects.GameObject[]): void {
    if (!this.active) return;
    
    // Track distance traveled for bio-ordnance
    const dx = this.x - this.lastX;
    const dy = this.y - this.lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.distanceTraveled += dist;
    this.lastX = this.x;
    this.lastY = this.y;
    
    // Bio-Ordnance: Grow over distance (STACKING - multiple GREEN neighbors = massive growth)
    if (this.bioOrdnance) {
      // Stacking: Each GREEN neighbor increases max size and growth rate
      const maxGrowthFactor = SYNERGY_VALUES.BIO_ORDNANCE.baseMaxGrowth + (this.bioOrdnanceCount * SYNERGY_VALUES.BIO_ORDNANCE.growthPerNeighbor);
      const growthRate = Math.max(10, SYNERGY_VALUES.BIO_ORDNANCE.baseGrowthRate - (this.bioOrdnanceCount * SYNERGY_VALUES.BIO_ORDNANCE.growthRateReductionPerNeighbor));
      const growthFactor = Math.min(maxGrowthFactor, 1 + (this.distanceTraveled / growthRate));
      
      const newSize = this.baseSize * growthFactor;
      const newDamage = this.baseDamage * growthFactor;
      this.setRadius(newSize);
      this.damage = newDamage;
      this.physicsBody.setCircle(newSize);
      
      // Visual effect: pulsing green glow (brighter with more stacks)
      const baseAlpha = 0.6 + (this.bioOrdnanceCount * 0.1);
      const pulseAlpha = baseAlpha + Math.sin(_time * 0.01) * 0.3;
      this.setFillStyle(0x2ed573, Math.min(1, pulseAlpha)); // Green color with pulse
      this.setStrokeStyle(2 + this.bioOrdnanceCount, 0x2ed573, 0.8);
    }
    
    // Homing: Curve toward nearest enemy
    if (this.homing && enemies && enemies.length > 0) {
      let nearestEnemy: Phaser.GameObjects.GameObject | null = null;
      let nearestDist = Infinity;
      
      enemies.forEach((enemy) => {
        if (!enemy.active) return;
        const ex = (enemy as any).x;
        const ey = (enemy as any).y;
        if (ex === undefined || ey === undefined) return;
        
        const dist = Math.sqrt((ex - this.x) ** 2 + (ey - this.y) ** 2);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestEnemy = enemy;
        }
      });
      
      if (nearestEnemy) {
        const ex = (nearestEnemy as any).x;
        const ey = (nearestEnemy as any).y;
        const dx = ex - this.x;
        const dy = ey - this.y;
        const angle = Math.atan2(dy, dx);
        
        // Gradually curve toward enemy (5% per frame)
        const currentAngle = Math.atan2(this.physicsBody.velocity.y, this.physicsBody.velocity.x);
        const angleDiff = angle - currentAngle;
        const normalizedDiff = ((angleDiff % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const adjustedDiff = normalizedDiff > Math.PI ? normalizedDiff - Math.PI * 2 : normalizedDiff;
        const newAngle = currentAngle + adjustedDiff * 0.05;
        
        const speed = Math.sqrt(
          this.physicsBody.velocity.x ** 2 + this.physicsBody.velocity.y ** 2
        );
        this.physicsBody.setVelocity(
          Math.cos(newAngle) * speed,
          Math.sin(newAngle) * speed
        );
        this.setRotation(newAngle);
      }
    }
    
    // Reduce lifetime
    this.lifetime -= delta;
    if (this.lifetime <= 0) {
      this.destroy();
      return;
    }
  }
  
  isHeavyImpact(): boolean {
    return this.heavyImpact;
  }

  getDamage(): number {
    return this.damage;
  }

  isPiercing(): boolean {
    return this.piercing;
  }

  getPhysicsBody(): Phaser.Physics.Arcade.Body {
    return this.physicsBody;
  }

  /**
   * Check if this projectile has already hit an enemy
   */
  hasHitEnemy(enemy: Phaser.GameObjects.GameObject): boolean {
    return this.hitEnemies.has(enemy);
  }

  /**
   * Mark an enemy as hit by this projectile
   */
  markEnemyHit(enemy: Phaser.GameObjects.GameObject): void {
    this.hitEnemies.add(enemy);
  }

  // Mark for destruction (for piercing projectiles that can hit multiple enemies)
  markForDestruction(): void {
    if (!this.piercing) {
      this.destroy();
    }
  }
}
