import * as Phaser from "phaser";
import { COLORS, GAME_CONSTANTS } from "../config";
import { useGameStore } from "../../store/gameStore";
import { audioManager } from "../audio/AudioManager";

export class GraceOrb extends Phaser.GameObjects.Container {
  public body!: Phaser.Physics.Arcade.Body;
  private glow: Phaser.GameObjects.Graphics;
  private orb: Phaser.GameObjects.Graphics;
  private pulseTime: number = 0;
  private collected: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Create outer glow
    this.glow = scene.add.graphics();
    this.add(this.glow);

    // Create orb
    this.orb = scene.add.graphics();
    this.drawOrb();
    this.add(this.orb);

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configure physics body
    const size = GAME_CONSTANTS.GRACE_ORB_SIZE;
    this.body.setSize(size, size);
    this.body.setOffset(-size / 2, -size / 2);
    this.body.setAllowGravity(false);
    this.body.setVelocityY(GAME_CONSTANTS.BLOCK_FALL_SPEED * 0.9); // Falls slightly slower than blocks

    // Set depth to appear above blocks
    this.setDepth(10);
  }

  private drawOrb(): void {
    const g = this.orb;
    const size = GAME_CONSTANTS.GRACE_ORB_SIZE;
    const radius = size / 2;

    g.clear();

    // Main orb
    g.fillStyle(COLORS.GRACE_ORB, 1);
    g.fillCircle(0, 0, radius);

    // Inner highlight
    g.fillStyle(COLORS.GRACE_GLOW, 0.8);
    g.fillCircle(-radius * 0.2, -radius * 0.2, radius * 0.5);

    // Bright center
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(-radius * 0.15, -radius * 0.15, radius * 0.2);
  }

  private drawGlow(intensity: number): void {
    const g = this.glow;
    const size = GAME_CONSTANTS.GRACE_ORB_SIZE;
    const radius = size / 2;

    g.clear();

    // Outer glow rings
    for (let i = 3; i >= 1; i--) {
      const alpha = (intensity * 0.15) / i;
      const glowRadius = radius * (1 + i * 0.4);
      g.fillStyle(COLORS.GRACE_ORB, alpha);
      g.fillCircle(0, 0, glowRadius);
    }
  }

  public update(delta: number): void {
    if (this.collected) return;

    // Pulse animation
    this.pulseTime += delta * 0.003;
    const pulse = Math.sin(this.pulseTime) * 0.5 + 0.5;
    this.drawGlow(0.5 + pulse * 0.5);

    // Slight scale pulse
    const scale = 1 + pulse * 0.1;
    this.orb.setScale(scale);

    // Check if fallen too far below camera
    const camera = this.scene.cameras.main;
    if (this.y > camera.scrollY + camera.height + 200) {
      this.destroy();
    }
  }

  public collect(): void {
    if (this.collected) return;
    this.collected = true;

    // Play grace collection sound
    audioManager.playSFX("grace");

    const store = useGameStore.getState();
    store.addGraceOrb();

    // Collection animation
    this.scene.tweens.add({
      targets: this,
      scale: 1.5,
      alpha: 0,
      duration: 300,
      ease: "Power2",
      onComplete: () => {
        this.createCollectParticles();
        this.destroy();
      },
    });

    // Disable physics
    this.body.enable = false;
  }

  private createCollectParticles(): void {
    // Golden particle burst
    const particles = this.scene.add.particles(
      this.x,
      this.y,
      "flame_particle",
      {
        speed: { min: 100, max: 200 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.8, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 600,
        tint: [COLORS.GRACE_ORB, COLORS.GRACE_GLOW, 0xffffff],
        blendMode: Phaser.BlendModes.ADD,
        quantity: 15,
      },
    );

    this.scene.time.delayedCall(600, () => {
      particles.destroy();
    });
  }
}
