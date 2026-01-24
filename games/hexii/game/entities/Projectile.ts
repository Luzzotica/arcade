import Phaser from 'phaser';

export interface ProjectileConfig {
  damage: number;
  speed: number;
  size: number;
  color: number;
  piercing: boolean;
  lifetime: number;
}

export class Projectile extends Phaser.GameObjects.Arc {
  public config: ProjectileConfig;
  private physicsBody!: Phaser.Physics.Arcade.Body;
  private lifetime: number;
  private damage: number;
  private piercing: boolean;

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
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.physicsBody = this.body as Phaser.Physics.Arcade.Body;
    
    // Set velocity based on angle
    const vx = Math.cos(angle) * config.speed;
    const vy = Math.sin(angle) * config.speed;
    this.physicsBody.setVelocity(vx, vy);
    
    // Set rotation to match direction
    this.setRotation(angle);
    
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

  update(_time: number, delta: number): void {
    if (!this.active) return;
    
    // Reduce lifetime
    this.lifetime -= delta;
    if (this.lifetime <= 0) {
      this.destroy();
      return;
    }
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

  // Mark for destruction (for piercing projectiles that can hit multiple enemies)
  markForDestruction(): void {
    if (!this.piercing) {
      this.destroy();
    }
  }
}
