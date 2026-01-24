import Phaser from 'phaser';

export class ExpDrop extends Phaser.GameObjects.Graphics {
  private physicsBody!: Phaser.Physics.Arcade.Body;
  private pickupRadius: number = 8;
  private pulseTween!: Phaser.Tweens.Tween;
  private rotationSpeed: number = 0.02;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene);
    
    this.setPosition(x, y);
    this.drawHexagon();
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.physicsBody = this.body as Phaser.Physics.Arcade.Body;
    this.physicsBody.setCircle(this.pickupRadius);
    this.physicsBody.setOffset(-this.pickupRadius, -this.pickupRadius);
    
    // Pulse animation
    this.pulseTween = scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private drawHexagon(): void {
    this.clear();
    
    const size = 6;
    const color = 0x4dd0e1; // Light blue
    
    // Draw fill
    this.fillStyle(color, 0.9);
    this.lineStyle(2, 0xffffff, 0.8);
    
    this.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = size * Math.cos(angle);
      const y = size * Math.sin(angle);
      
      if (i === 0) {
        this.moveTo(x, y);
      } else {
        this.lineTo(x, y);
      }
    }
    this.closePath();
    this.fillPath();
    this.strokePath();
    
    // Inner glow
    this.fillStyle(0xffffff, 0.5);
    this.fillCircle(0, 0, size * 0.4);
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

  destroy(): void {
    if (this.pulseTween) {
      this.pulseTween.stop();
    }
    super.destroy();
  }
}
