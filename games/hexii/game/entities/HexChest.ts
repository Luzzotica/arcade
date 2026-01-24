import * as Phaser from 'phaser';
import type { HexModule } from '../../store/gameStore';

export class HexChest extends Phaser.GameObjects.Graphics {
  private physicsBody!: Phaser.Physics.Arcade.Body;
  private pickupRadius: number = 30;
  private pulseTween!: Phaser.Tweens.Tween;
  private glowTween!: Phaser.Tweens.Tween;
  private rotationSpeed: number = 0.01;
  private hexes: HexModule[];
  private glowIntensity: number = 0.5;

  constructor(scene: Phaser.Scene, x: number, y: number, hexes: HexModule[]) {
    super(scene);
    
    this.hexes = hexes;
    this.setPosition(x, y);
    this.drawChest();
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.physicsBody = this.body as Phaser.Physics.Arcade.Body;
    this.physicsBody.setCircle(this.pickupRadius);
    this.physicsBody.setOffset(-this.pickupRadius, -this.pickupRadius);
    
    // Pulse animation
    this.pulseTween = scene.tweens.add({
      targets: this,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    
    // Glow animation
    this.glowTween = scene.tweens.add({
      targets: this,
      glowIntensity: 1,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => this.drawChest(),
    });
    
    // Spawn effect
    scene.tweens.add({
      targets: this,
      scaleX: { from: 0, to: 1 },
      scaleY: { from: 0, to: 1 },
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  private drawChest(): void {
    this.clear();
    
    const size = 24;
    
    // Draw outer glow based on number of hexes
    const glowColor = this.hexes.length >= 5 ? 0xffd700 : // Gold for 5+
                      this.hexes.length >= 3 ? 0xff00ff : // Purple for 3+
                      0x00ffff; // Cyan for 1
    
    const glowSize = size + 8 + (this.glowIntensity * 4);
    this.fillStyle(glowColor, 0.2 * this.glowIntensity);
    this.fillCircle(0, 0, glowSize);
    
    // Draw hexagon chest shape
    this.fillStyle(0x2a2a4a, 0.95);
    this.lineStyle(3, glowColor, 0.9);
    
    this.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const hx = size * Math.cos(angle);
      const hy = size * Math.sin(angle);
      
      if (i === 0) {
        this.moveTo(hx, hy);
      } else {
        this.lineTo(hx, hy);
      }
    }
    this.closePath();
    this.fillPath();
    this.strokePath();
    
    // Draw inner details - small hexagons representing contents
    const innerSize = 8;
    const contentColor = glowColor;
    
    this.fillStyle(contentColor, 0.8);
    this.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const hx = innerSize * Math.cos(angle);
      const hy = innerSize * Math.sin(angle);
      
      if (i === 0) {
        this.moveTo(hx, hy);
      } else {
        this.lineTo(hx, hy);
      }
    }
    this.closePath();
    this.fillPath();
    
    // Draw sparkle/star in center
    this.fillStyle(0xffffff, 0.9 * this.glowIntensity);
    this.fillCircle(0, 0, 3);
    
    // Draw hex count indicator
    if (this.hexes.length > 1) {
      this.fillStyle(0xffffff, 1);
      this.fillCircle(size * 0.6, -size * 0.6, 8);
      
      // Note: Can't easily draw text in Graphics, so just show dots
      this.fillStyle(glowColor, 1);
      this.fillCircle(size * 0.6, -size * 0.6, 5);
    }
  }

  update(): void {
    if (!this.active) return;
    
    // Rotate slowly
    this.rotation += this.rotationSpeed;
  }

  getPhysicsBody(): Phaser.Physics.Arcade.Body {
    return this.physicsBody;
  }

  getPickupRadius(): number {
    return this.pickupRadius;
  }

  getHexes(): HexModule[] {
    return this.hexes;
  }

  destroy(): void {
    if (this.pulseTween) {
      this.pulseTween.stop();
    }
    if (this.glowTween) {
      this.glowTween.stop();
    }
    super.destroy();
  }
}
