import * as Phaser from 'phaser';

export type EnemyType = 'TRIANGLE' | 'SQUARE' | 'PENTAGON' | 'BOSS';

const ENEMY_COLORS = {
  TRIANGLE: 0xff6b6b,
  SQUARE: 0x4ecdc4,
  PENTAGON: 0xa55eea,
  BOSS: 0xff0000,
};

interface EnemyConfig {
  type: EnemyType;
  color: number;
  size: number;
  speed: number;
  hp: number;
  damage: number;
  score: number;
  isBoss?: boolean;
}

const ENEMY_CONFIGS: Record<EnemyType, Omit<EnemyConfig, 'type'>> = {
  TRIANGLE: {
    color: ENEMY_COLORS.TRIANGLE,
    size: 16,
    speed: 150,
    hp: 10,
    damage: 10,
    score: 10,
  },
  SQUARE: {
    color: ENEMY_COLORS.SQUARE,
    size: 20,
    speed: 60,
    hp: 50,
    damage: 20,
    score: 25,
  },
  PENTAGON: {
    color: ENEMY_COLORS.PENTAGON,
    size: 24,
    speed: 40,
    hp: 30,
    damage: 15,
    score: 50,
  },
  BOSS: {
    color: ENEMY_COLORS.BOSS,
    size: 48,
    speed: 30,
    hp: 2000,
    damage: 30,
    score: 200,
    isBoss: true,
  },
};

export class Enemy extends Phaser.GameObjects.Graphics {
  private config: EnemyConfig;
  private hp: number;
  private maxHp: number;
  private physicsBody!: Phaser.Physics.Arcade.Body;
  private targetX: number = 0;
  private targetY: number = 0;
  private knockbackTimer: number = 0;
  private hitCooldown: number = 0;
  
  // Status effects
  private slowPercent: number = 0;
  private slowTimer: number = 0;
  private stunTimer: number = 0;
  private isStunned: boolean = false;
  private hasBeenStunned: boolean = false; // Prevent re-stun in same field
  private isCorrosion: boolean = false; // Takes +30% damage
  private entropyStacks: number = 0; // Permanent defense reduction

  constructor(scene: Phaser.Scene, x: number, y: number, type: EnemyType, hpMultiplier: number = 1, damageMultiplier: number = 1) {
    super(scene);
    
    this.config = { type, ...ENEMY_CONFIGS[type] };
    this.config.damage = Math.floor(this.config.damage * damageMultiplier);
    this.maxHp = Math.floor(this.config.hp * hpMultiplier);
    this.hp = this.maxHp;
    
    this.setPosition(x, y);
    this.drawShape();
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.physicsBody = this.body as Phaser.Physics.Arcade.Body;
    this.physicsBody.setCircle(this.config.size);
    this.physicsBody.setOffset(-this.config.size, -this.config.size);
    this.physicsBody.setBounce(0.5);
    this.physicsBody.setMass(this.config.isBoss ? 10 : 1);
  }

  private drawShape(): void {
    this.clear();
    
    const { color, size } = this.config;
    
    // Apply visual effects for status
    let displayColor = color;
    if (this.isCorrosion) {
      displayColor = 0x88ff88; // Green tint for corrosion
    }
    if (this.entropyStacks > 0) {
      displayColor = Phaser.Display.Color.GetColor(
        Math.min(255, ((displayColor >> 16) & 0xff) + this.entropyStacks * 20),
        ((displayColor >> 8) & 0xff),
        (displayColor & 0xff)
      );
    }
    
    this.fillStyle(displayColor, this.isStunned ? 0.5 : 0.9);
    this.lineStyle(2, 0xffffff, 0.5);
    
    this.beginPath();
    
    switch (this.config.type) {
      case 'TRIANGLE': this.drawTriangle(size); break;
      case 'SQUARE': this.drawSquare(size); break;
      case 'PENTAGON': this.drawPentagon(size); break;
      case 'BOSS': this.drawBoss(size); break;
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
      if (i === 0) this.moveTo(x, y);
      else this.lineTo(x, y);
    }
  }

  private drawSquare(size: number): void {
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI * 2 / 4) * i - Math.PI / 4;
      const x = size * Math.cos(angle);
      const y = size * Math.sin(angle);
      if (i === 0) this.moveTo(x, y);
      else this.lineTo(x, y);
    }
  }

  private drawPentagon(size: number): void {
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
      const x = size * Math.cos(angle);
      const y = size * Math.sin(angle);
      if (i === 0) this.moveTo(x, y);
      else this.lineTo(x, y);
    }
  }

  private drawBoss(size: number): void {
    // Draw septagon (7-sided polygon)
    for (let i = 0; i < 7; i++) {
      const angle = (Math.PI * 2 / 7) * i - Math.PI / 2;
      const x = size * Math.cos(angle);
      const y = size * Math.sin(angle);
      if (i === 0) this.moveTo(x, y);
      else this.lineTo(x, y);
    }
    
    this.closePath();
    this.fillPath();
    this.strokePath();
    
    this.fillStyle(0x000000, 0.8);
    this.fillCircle(0, 0, size * 0.4);
    this.fillStyle(0xff0000, 1);
    this.fillCircle(0, 0, size * 0.2);
  }

  setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  update(delta: number = 16): void {
    if (!this.active) return;
    
    // Bosses maintain their own movement and can't be affected by status effects that push them
    if (this.isBoss()) {
      // Bosses move normally but can't be pushed by external forces
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        const vx = (dx / dist) * this.config.speed;
        const vy = (dy / dist) * this.config.speed;
        this.physicsBody.setVelocity(vx, vy);
        this.rotation = Math.atan2(dy, dx) + Math.PI / 2;
      }
      return;
    }
    
    // Update status effect timers
    if (this.stunTimer > 0) {
      this.stunTimer -= delta;
      if (this.stunTimer <= 0) {
        this.isStunned = false;
        this.drawShape();
      }
    }
    
    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) {
        this.slowPercent = 0;
      }
    }
    
    // Don't move if stunned
    if (this.isStunned) {
      this.physicsBody.setVelocity(0, 0);
      return;
    }
    
    if (this.knockbackTimer > 0) {
      this.knockbackTimer -= delta;
      return;
    }
    
    if (this.hitCooldown > 0) {
      this.hitCooldown -= delta;
    }
    
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
      // Apply slow effect
      const speedMultiplier = 1 - (this.slowPercent / 100);
      const effectiveSpeed = this.config.speed * speedMultiplier;
      
      const vx = (dx / dist) * effectiveSpeed;
      const vy = (dy / dist) * effectiveSpeed;
      
      this.physicsBody.setVelocity(vx, vy);
      this.rotation = Math.atan2(dy, dx) + Math.PI / 2;
    }
  }

  knockback(fromX: number, fromY: number, force: number = 300): void {
    // Bosses can't be pushed
    if (this.isBoss()) return;
    
    const dx = this.x - fromX;
    const dy = this.y - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
      const vx = (dx / dist) * force;
      const vy = (dy / dist) * force;
      this.physicsBody.setVelocity(vx, vy);
    }
    
    this.knockbackTimer = 200;
  }

  canDealDamage(): boolean {
    return this.hitCooldown <= 0 && !this.isStunned;
  }

  setHitCooldown(): void {
    this.hitCooldown = 500;
  }

  /**
   * Take damage and return true if destroyed
   */
  takeDamage(amount: number): boolean {
    // Apply corrosion bonus damage
    let finalDamage = amount;
    if (this.isCorrosion) {
      finalDamage *= 1.3; // +30% damage
    }
    
    // Apply entropy stacks
    finalDamage += this.entropyStacks * 2;
    
    this.hp -= finalDamage;
    
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

  private die(): void {
    this.createDeathParticles();
    this.destroy();
  }

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

  // ============================================================================
  // STATUS EFFECT METHODS
  // ============================================================================

  /**
   * Apply slow effect
   */
  applySlow(percent: number, duration: number): void {
    this.slowPercent = Math.max(this.slowPercent, percent);
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  /**
   * Apply stun effect (only once per field entry)
   */
  applyStun(duration: number): void {
    if (this.hasBeenStunned) return;
    
    this.isStunned = true;
    this.hasBeenStunned = true;
    this.stunTimer = duration;
    this.drawShape();
    
    // Reset stun immunity after leaving field
    this.scene.time.delayedCall(duration + 500, () => {
      this.hasBeenStunned = false;
    });
  }

  /**
   * Set corrosion state (enemies take +30% damage)
   */
  setCorrosion(active: boolean): void {
    if (this.isCorrosion !== active) {
      this.isCorrosion = active;
      this.drawShape();
    }
  }

  /**
   * Apply entropy (permanent defense reduction)
   */
  applyEntropy(): void {
    this.entropyStacks++;
    this.drawShape();
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  getDamage(): number {
    return this.config.damage;
  }

  getScore(): number {
    return this.config.score;
  }

  getType(): EnemyType {
    return this.config.type;
  }

  getPhysicsBody(): Phaser.Physics.Arcade.Body {
    return this.physicsBody;
  }

  getSize(): number {
    return this.config.size;
  }

  isBoss(): boolean {
    return this.config.isBoss === true;
  }

  getHp(): number {
    return this.hp;
  }

  getMaxHp(): number {
    return this.maxHp;
  }

  getBody(): Phaser.Physics.Arcade.Body | null {
    return this.physicsBody;
  }
}
