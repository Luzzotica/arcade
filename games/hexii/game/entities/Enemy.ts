import Phaser from 'phaser';

export type EnemyType = 'TRIANGLE' | 'SQUARE' | 'PENTAGON';

// Enemy colors defined locally to avoid circular dependency
const ENEMY_COLORS = {
  TRIANGLE: 0xff6b6b,
  SQUARE: 0x4ecdc4,
  PENTAGON: 0xa55eea,
};

interface EnemyConfig {
  type: EnemyType;
  color: number;
  size: number;
  speed: number;
  hp: number;
  damage: number;
  score: number;
}

const ENEMY_CONFIGS: Record<EnemyType, Omit<EnemyConfig, 'type'>> = {
  TRIANGLE: {
    color: ENEMY_COLORS.TRIANGLE,
    size: 16, // Doubled from 8
    speed: 150,
    hp: 10,
    damage: 10,
    score: 10,
  },
  SQUARE: {
    color: ENEMY_COLORS.SQUARE,
    size: 20, // Doubled from 10
    speed: 60,
    hp: 50,
    damage: 20,
    score: 25,
  },
  PENTAGON: {
    color: ENEMY_COLORS.PENTAGON,
    size: 24, // Doubled from 12
    speed: 40,
    hp: 30,
    damage: 15,
    score: 50,
  },
};

export class Enemy extends Phaser.GameObjects.Graphics {
  private config: EnemyConfig;
  private hp: number;
  private physicsBody!: Phaser.Physics.Arcade.Body;
  private targetX: number = 0;
  private targetY: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, type: EnemyType) {
    super(scene);
    
    this.config = { type, ...ENEMY_CONFIGS[type] };
    this.hp = this.config.hp;
    
    this.setPosition(x, y);
    this.drawShape();
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.physicsBody = this.body as Phaser.Physics.Arcade.Body;
    this.physicsBody.setCircle(this.config.size);
    this.physicsBody.setOffset(-this.config.size, -this.config.size);
  }

  /**
   * Draw the enemy shape based on type
   */
  private drawShape(): void {
    this.clear();
    
    const { color, size } = this.config;
    
    // Fill
    this.fillStyle(color, 0.9);
    this.lineStyle(2, 0xffffff, 0.5);
    
    this.beginPath();
    
    switch (this.config.type) {
      case 'TRIANGLE':
        this.drawTriangle(size);
        break;
      case 'SQUARE':
        this.drawSquare(size);
        break;
      case 'PENTAGON':
        this.drawPentagon(size);
        break;
    }
    
    this.closePath();
    this.fillPath();
    this.strokePath();
  }

  private drawTriangle(size: number): void {
    for (let i = 0; i < 3; i++) {
      const angle = (Math.PI * 2 / 3) * i - Math.PI / 2;
      const x = size * Math.cos(angle);
      const y = size * Math.sin(angle);
      
      if (i === 0) {
        this.moveTo(x, y);
      } else {
        this.lineTo(x, y);
      }
    }
  }

  private drawSquare(size: number): void {
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI * 2 / 4) * i - Math.PI / 4;
      const x = size * Math.cos(angle);
      const y = size * Math.sin(angle);
      
      if (i === 0) {
        this.moveTo(x, y);
      } else {
        this.lineTo(x, y);
      }
    }
  }

  private drawPentagon(size: number): void {
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
      const x = size * Math.cos(angle);
      const y = size * Math.sin(angle);
      
      if (i === 0) {
        this.moveTo(x, y);
      } else {
        this.lineTo(x, y);
      }
    }
  }

  /**
   * Set the target to chase (player position)
   */
  setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  /**
   * Update enemy each frame - move toward target
   */
  update(): void {
    if (!this.active) return;
    
    // Calculate direction to target
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
      // Normalize and apply speed
      const vx = (dx / dist) * this.config.speed;
      const vy = (dy / dist) * this.config.speed;
      
      this.physicsBody.setVelocity(vx, vy);
      
      // Rotate to face movement direction
      this.rotation = Math.atan2(dy, dx) + Math.PI / 2;
    }
  }

  /**
   * Take damage and return true if destroyed
   */
  takeDamage(amount: number): boolean {
    this.hp -= amount;
    
    // Flash effect
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 50,
      yoyo: true,
    });
    
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    
    return false;
  }

  /**
   * Death effects
   */
  private die(): void {
    // Create particle explosion
    this.createDeathParticles();
    
    this.destroy();
  }

  /**
   * Particle effect on death
   */
  private createDeathParticles(): void {
    const particleCount = 8;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 / particleCount) * i;
      const speed = 100 + Math.random() * 100;
      
      const particle = this.scene.add.graphics();
      particle.fillStyle(this.config.color, 1);
      particle.fillCircle(0, 0, 4);
      particle.setPosition(this.x, this.y);
      
      this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * speed,
        y: this.y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.1,
        duration: 300,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  /**
   * Get damage value
   */
  getDamage(): number {
    return this.config.damage;
  }

  /**
   * Get score value
   */
  getScore(): number {
    return this.config.score;
  }

  /**
   * Get enemy type
   */
  getType(): EnemyType {
    return this.config.type;
  }

  /**
   * Get physics body for collision
   */
  getPhysicsBody(): Phaser.Physics.Arcade.Body {
    return this.physicsBody;
  }

  /**
   * Get size for collision checks
   */
  getSize(): number {
    return this.config.size;
  }
}
