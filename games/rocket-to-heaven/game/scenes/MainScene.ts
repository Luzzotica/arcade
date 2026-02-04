import * as Phaser from "phaser";
import { Player } from "../entities/Player";
import { Block, BlockConfig } from "../entities/Block";
import { GraceOrb } from "../entities/GraceOrb";
import { Abyss } from "../entities/Abyss";
import { BlockManager } from "../utils/BlockManager";
import { COLORS, GAME_CONSTANTS, GAME_WIDTH } from "../config";
import { useGameStore } from "../../store/gameStore";
import { audioManager } from "../audio/AudioManager";

export class MainScene extends Phaser.Scene {
  private player!: Player;
  private playerGhost!: Phaser.GameObjects.Graphics;
  private abyss!: Abyss;
  private blockManager!: BlockManager;
  private background!: Phaser.GameObjects.Graphics;
  private columnEdges!: Phaser.GameObjects.Graphics;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private floor!: Phaser.GameObjects.Rectangle;
  private blocksGroup!: Phaser.Physics.Arcade.Group;
  private graceOrbsGroup!: Phaser.Physics.Arcade.Group;
  private nearMissCheckedBlocks: Set<Block> = new Set();
  private blockHitCooldowns: Map<Block, number> = new Map(); // Track when blocks were last hit
  private unsubscribe?: () => void;
  private gameTime: number = 0;
  private lavaStarted: boolean = false;
  private jesusPlatform?: Phaser.GameObjects.Container;
  private jesusSprite?: Phaser.GameObjects.Image;

  constructor() {
    super({ key: "MainScene" });
  }

  preload(): void {
    // Create basic particle texture
    const particleGraphics = this.add.graphics();
    particleGraphics.fillStyle(0xffffff, 1);
    particleGraphics.fillCircle(4, 4, 4);
    particleGraphics.generateTexture("flame_particle", 8, 8);
    particleGraphics.destroy();

    // Create block debris particle texture (smaller, square-ish)
    const debrisGraphics = this.add.graphics();
    debrisGraphics.fillStyle(0xffffff, 1);
    debrisGraphics.fillRect(2, 2, 4, 4);
    debrisGraphics.generateTexture("block_debris", 8, 8);
    debrisGraphics.destroy();
  }

  create(): void {
    // Reset store and start game
    const store = useGameStore.getState();
    store.reset();
    store.setGameStarted(true);

    // Set up camera - it will fill the entire screen
    const screenWidth = this.game.scale.width;
    const screenHeight = this.game.scale.height;
    const playableAreaX = (screenWidth - GAME_WIDTH) / 2;

    // Camera fills entire screen, no bounds constraint
    // We'll handle playable area constraints through player movement and rendering

    // Create background (full screen)
    this.background = this.add.graphics();
    this.background.setDepth(-100);
    this.drawBackground(0);

    // Create invisible walls on sides of screen
    this.createWalls();

    // Create solid floor (full width, thick)
    this.createFloor();

    // Create blocks physics group
    this.blocksGroup = this.physics.add.group({
      allowGravity: false,
    });

    // Create grace orbs physics group
    this.graceOrbsGroup = this.physics.add.group({
      allowGravity: false,
    });

    // Create abyss (lava) - starts well below the screen
    const playableHeight = this.cameras.main.height;
    this.abyss = new Abyss(this, playableHeight + GAME_CONSTANTS.ABYSS_START_Y);
    this.abyss.setActive(false); // Don't update until delay passes

    // Create block manager
    this.blockManager = new BlockManager(
      this,
      this.blocksGroup,
      this.graceOrbsGroup,
    );

    // Create player on the floor - position in world coordinates
    // Player is centered in the playable area
    const floorY = 100;
    const playerWorldX = playableAreaX + GAME_WIDTH / 2;
    this.player = new Player(
      this,
      playerWorldX,
      floorY - GAME_CONSTANTS.PLAYER_HEIGHT / 2 - 60,
    );

    // Create column edge visuals (tower walls)
    // Set depth to be behind game elements but visible in side areas
    this.columnEdges = this.add.graphics();
    this.columnEdges.setDepth(50);

    // Create player ghost (shows where player will wrap to)
    this.playerGhost = this.add.graphics();
    this.playerGhost.setDepth(5);
    this.playerGhost.setAlpha(0.3);

    // Setup camera to follow player
    // Camera fills entire screen and follows player normally
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(100, GAME_CONSTANTS.CAMERA_DEAD_ZONE_Y);

    // Handle resize - camera will automatically resize with screen
    const handleResize = () => {
      // Redraw background and edges on resize
      const height = useGameStore.getState().height;
      this.drawBackground(height);
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, handleResize);

    // Setup collisions
    this.setupCollisions();

    // Subscribe to store changes
    this.unsubscribe = useGameStore.subscribe((state) => {
      if (!this.scene || !this.scene.manager) return;

      try {
        if (state.isPaused && this.scene.isActive()) {
          this.scene.pause();
        } else if (!state.isPaused && !this.scene.isActive()) {
          this.scene.resume();
        }
      } catch (e) {
        // Scene may be shutting down, ignore errors
      }
    });

    // Start spawning blocks after a short delay
    this.time.delayedCall(1500, () => {
      this.blockManager.startSpawning();
    });

    // Reset game time
    this.gameTime = 0;
    this.lavaStarted = false;

    // Create Jesus platform at heaven height (always visible)
    this.createJesusPlatform();
  }

  private createFloor(): void {
    const screenWidth = this.game.scale.width;
    const playableAreaX = (screenWidth - GAME_WIDTH) / 2;
    const floorWidth = GAME_WIDTH * 3; // Very wide
    const floorHeight = 100; // Thick floor
    const floorY = 100;

    // Create a simple rectangle for the floor, centered on playable area
    this.floor = this.add.rectangle(
      playableAreaX + GAME_WIDTH / 2,
      floorY + floorHeight / 2,
      floorWidth,
      floorHeight,
      0x8b7355, // Tan/stone color
      1,
    );

    // Add physics as static body
    this.physics.add.existing(this.floor, true);

    // Set depth below player
    this.floor.setDepth(-5);
  }

  private createWalls(): void {
    this.walls = this.physics.add.staticGroup();

    const screenWidth = this.game.scale.width;
    const playableAreaX = (screenWidth - GAME_WIDTH) / 2;
    const wallWidth = 20;
    const wallHeight = 100000; // Very tall walls

    // Left wall (at left edge of playable area)
    const leftWall = this.add.rectangle(
      playableAreaX - wallWidth / 2,
      -wallHeight / 2,
      wallWidth,
      wallHeight,
      0x333333,
      0,
    );
    this.walls.add(leftWall);

    // Right wall (at right edge of playable area)
    const rightWall = this.add.rectangle(
      playableAreaX + GAME_WIDTH + wallWidth / 2,
      -wallHeight / 2,
      wallWidth,
      wallHeight,
      0x333333,
      0,
    );
    this.walls.add(rightWall);
  }

  private setupCollisions(): void {
    // Player vs floor
    this.physics.add.collider(this.player, this.floor);

    // Player vs blocks - check for crush death and block breaking
    this.physics.add.collider(
      this.player,
      this.blocksGroup,
      (playerObj, blockObj) => {
        const player = playerObj as Player;
        const block = blockObj as Block;
        const blockBody = block.body as Phaser.Physics.Arcade.Body;
        const playerBody = player.body as Phaser.Physics.Arcade.Body;

        if (!blockBody || !playerBody || block.isDestroyed) return;

        // Check if player is hitting block from below (jumping up into it)
        const playerTop = player.y - GAME_CONSTANTS.PLAYER_HEIGHT / 2;
        const playerBottom = player.y + GAME_CONSTANTS.PLAYER_HEIGHT / 2;
        const blockTop = block.y - block.blockConfig.height / 2;
        const blockBottom = block.y + block.blockConfig.height / 2;

        // Check horizontal alignment - player must be under the block, not beside it
        const playerLeft = player.x - GAME_CONSTANTS.PLAYER_WIDTH / 2;
        const playerRight = player.x + GAME_CONSTANTS.PLAYER_WIDTH / 2;
        const blockLeft = block.x - block.blockConfig.width / 2;
        const blockRight = block.x + block.blockConfig.width / 2;

        // Player must be horizontally overlapping with the block (not hitting from pure side)
        // Allow any horizontal overlap - player doesn't need to be perfectly centered
        const horizontalOverlap =
          playerRight > blockLeft && playerLeft < blockRight;
        // For hitting from below, prefer if player is somewhat centered, but allow edge hits too
        const isPlayerHorizontallyAligned = horizontalOverlap; // Use overlap as alignment check

        // Player is hitting from below if:
        // 1. Player is below the block (player center Y > block center Y in Phaser coords)
        // 2. Player's top is hitting or near the block's bottom edge (not the side)
        // 3. Player is not falling fast (falling fast = on top, not hitting from below)
        // 4. Player is horizontally overlapping (not hitting from pure side)
        const isPlayerBelowBlock = player.y > block.y; // Player center is below block center
        // More lenient range: player top should be near block bottom (within 50px above or 30px below)
        const isPlayerTopHittingBlockBottom =
          playerTop >= blockBottom - 50 && // Player top is at or near block bottom
          playerTop <= blockBottom + 30; // Allow some overlap
        // Velocity check: block fast falling (means on top), allow upward/stationary/slow fall
        // This prevents hits when player is clearly on top falling down
        const isNotFallingFast = playerBody.velocity.y < 100; // Not falling very fast

        // Ensure we're hitting the bottom edge, not the side - player top should be near block bottom
        // and player should be below the block's center
        // Also ensure player is NOT standing on top (playerBottom should not be near blockTop)
        const isPlayerStandingOnTop =
          playerBottom >= blockTop - 10 && playerBottom <= blockTop + 20;
        const isPlayerGrounded =
          playerBody.blocked.down || playerBody.touching.down;
        const isHittingFromBelow =
          isPlayerBelowBlock &&
          isPlayerTopHittingBlockBottom &&
          isNotFallingFast &&
          isPlayerHorizontallyAligned &&
          horizontalOverlap &&
          !isPlayerStandingOnTop &&
          !isPlayerGrounded; // Prevent hits when clearly standing on top

        // Check cooldown to prevent multiple hits in quick succession
        const lastHitTime = this.blockHitCooldowns.get(block) || 0;
        const hitCooldown = 200; // 200ms cooldown between hits
        const canHit = this.gameTime - lastHitTime > hitCooldown;

        if (isHittingFromBelow && canHit) {
          // Update cooldown
          this.blockHitCooldowns.set(block, this.gameTime);

          // Player is hitting block from below - damage the block
          const wasDestroyed = block.takeHit();
          if (wasDestroyed) {
            this.blockHitCooldowns.delete(block);
            this.handleBlockDestroyed(block);
          } else {
            // Give player slight bounce feedback
            playerBody.setVelocityY(Math.max(playerBody.velocity.y, -50));
            // Play block hit sound
            audioManager.playSFX("block-hit");
          }
          return; // Don't check for crush death in this case
        }

        // Check if block is hitting player from above (crush death)
        const blockBottomForCrush = block.y + block.blockConfig.height / 2;
        // playerTop already declared above
        const isBlockAbove = blockBottomForCrush <= playerTop + 15;

        if (isBlockAbove && isPlayerGrounded) {
          // Player is crushed between block and ground/another block
          player.triggerDeath("block", block.blockConfig.label);
        }
      },
    );

    // Blocks vs floor - stop falling when hitting floor
    this.physics.add.collider(this.blocksGroup, this.floor, (obj1) => {
      const block = obj1 as Block;
      const body = block.body as Phaser.Physics.Arcade.Body;
      if (body && typeof body.setVelocity === "function") {
        body.setVelocity(0, 0);
        body.setImmovable(true);
        // Block is on floor, so remove it from any other blocks' restingBlocks arrays
        const allBlocks = this.blockManager.getBlocks();
        for (const otherBlock of allBlocks) {
          otherBlock.removeRestingBlock(block);
        }
      }
    });

    // Blocks vs blocks - stack on top of each other and establish tree relationships
    this.physics.add.collider(
      this.blocksGroup,
      this.blocksGroup,
      (obj1, obj2) => {
        const block1 = obj1 as Block;
        const block2 = obj2 as Block;
        const body1 = block1.body as Phaser.Physics.Arcade.Body;
        const body2 = block2.body as Phaser.Physics.Arcade.Body;

        if (!body1 || !body2 || block1.isDestroyed || block2.isDestroyed)
          return;

        // Determine which block is on top (lower Y = higher on screen)
        const block1Y = body1.position.y;
        const block2Y = body2.position.y;
        const topBlock = block1Y < block2Y ? block1 : block2;
        const bottomBlock = block1Y < block2Y ? block2 : block1;
        const topBody = topBlock.body as Phaser.Physics.Arcade.Body;
        const bottomBody = bottomBlock.body as Phaser.Physics.Arcade.Body;

        // Check if blocks are horizontally overlapping (within reasonable range)
        const topLeft = topBlock.x - topBlock.blockWidth / 2;
        const topRight = topBlock.x + topBlock.blockWidth / 2;
        const bottomLeft = bottomBlock.x - bottomBlock.blockWidth / 2;
        const bottomRight = bottomBlock.x + bottomBlock.blockWidth / 2;

        const horizontalOverlap =
          topRight > bottomLeft && topLeft < bottomRight;

        if (horizontalOverlap) {
          // Top block is resting on bottom block - establish tree relationship
          // Only establish if top block is falling down (negative velocity) or stopped
          if (
            topBody &&
            typeof topBody.setVelocity === "function" &&
            topBody.velocity.y <= 0
          ) {
            // Stop the top block
            topBody.setVelocity(0, 0);
            topBody.setImmovable(true);

            // Establish tree relationship: bottom block supports top block
            bottomBlock.addRestingBlock(topBlock);

            // If top block was previously resting on something else, remove that relationship
            // (This handles cases where a block moves from one support to another)
            const allBlocks = this.blockManager.getBlocks();
            for (const otherBlock of allBlocks) {
              if (otherBlock !== bottomBlock) {
                otherBlock.removeRestingBlock(topBlock);
              }
            }
          }
        }
      },
    );

    // Grace orbs vs blocks - orbs land on blocks
    this.physics.add.collider(
      this.graceOrbsGroup,
      this.blocksGroup,
      (orbObj) => {
        const orb = orbObj as GraceOrb;
        const body = orb.body as Phaser.Physics.Arcade.Body;
        if (body && typeof body.setVelocity === "function") {
          body.setVelocity(0, 0);
        }
      },
    );

    // Grace orbs vs floor
    this.physics.add.collider(this.graceOrbsGroup, this.floor, (orbObj) => {
      const orb = orbObj as GraceOrb;
      const body = orb.body as Phaser.Physics.Arcade.Body;
      if (body && typeof body.setVelocity === "function") {
        body.setVelocity(0, 0);
      }
    });
  }

  private handleBlockDestroyed(destroyedBlock: Block): void {
    // Play block destroy sound
    audioManager.playSFX("block-destroy");

    // Create particle explosion effect
    this.createBlockExplosion(
      destroyedBlock.x,
      destroyedBlock.y,
      destroyedBlock.blockConfig,
    );

    // Cascade destruction through the tree
    destroyedBlock.cascadeDestroy();

    // Remove block from physics group and destroy it
    this.blocksGroup.remove(destroyedBlock, true, true);
    destroyedBlock.destroy();

    // Clean up: remove this block from any other blocks' restingBlocks arrays
    const allBlocks = this.blockManager.getBlocks();
    for (const block of allBlocks) {
      block.removeRestingBlock(destroyedBlock);
    }
  }

  private createBlockExplosion(
    x: number,
    y: number,
    blockConfig: BlockConfig,
  ): void {
    // Calculate particle count based on block size
    const particleCount = Math.max(
      12,
      Math.floor((blockConfig.width * blockConfig.height) / 150),
    );

    // Create a particle emitter for this explosion
    const particles = this.add.particles(x, y, "block_debris", {
      speed: { min: 80, max: 250 },
      angle: { min: 0, max: 360 },
      scale: { start: Phaser.Math.FloatBetween(0.6, 1.2), end: 0 },
      alpha: { start: 1, end: 0 },
      tint: blockConfig.color,
      lifespan: { min: 400, max: 800 },
      frequency: -1, // Emit all at once
      quantity: particleCount,
      gravityY: 400, // Particles fall down with gravity
      blendMode: "NORMAL", // Use normal blend mode for better visibility
      emitZone: {
        type: "edge",
        source: new Phaser.Geom.Rectangle(
          -blockConfig.width / 2,
          -blockConfig.height / 2,
          blockConfig.width,
          blockConfig.height,
        ),
        quantity: particleCount,
      },
    });

    // Emit all particles at once
    particles.explode();

    // Clean up the emitter after particles are done
    this.time.delayedCall(1000, () => {
      if (particles && particles.active) {
        particles.destroy();
      }
    });
  }

  update(time: number, delta: number): void {
    const store = useGameStore.getState();

    // Update Jesus platform position (always visible, positioned at heaven height)
    // Platform stays at HEAVEN_HEIGHT (10000 ft = -10000 in Phaser Y coordinates)
    // Position it in the center of the screen width (not following player X)
    if (this.jesusPlatform) {
      const screenWidth = this.game.scale.width;
      const playableAreaX = (screenWidth - GAME_WIDTH) / 2;
      // Center of the playable area
      const worldX = playableAreaX + GAME_WIDTH / 2;
      // HEAVEN_HEIGHT is 10000, which means Y = -10000 in Phaser coordinates
      const worldY = -GAME_CONSTANTS.HEAVEN_HEIGHT;
      this.jesusPlatform.setPosition(worldX, worldY);
    }

    // Re-enable gravity if player was in victory state but now wants to continue
    // Check this before the early return so we can re-enable gravity even when paused
    if (!store.hasWon && this.player && !this.player.body.allowGravity) {
      this.player.body.setAllowGravity(true);
    }

    if (store.isPaused || store.isDead || store.hasWon) {
      return;
    }

    // Track game time
    this.gameTime += delta;

    // Update play time in store (only if game is active)
    if (!store.isPaused && !store.isDead && !store.hasWon) {
      store.updatePlayTime(delta);
    }

    // Start lava after delay
    if (
      !this.lavaStarted &&
      this.gameTime >= GAME_CONSTANTS.ABYSS_START_DELAY
    ) {
      this.lavaStarted = true;
      this.abyss.setActive(true);
    }

    // Update player
    this.player.update(delta);

    // Screen wrap - player wraps around left/right edges
    this.wrapPlayer();

    // Update abyss only if started
    if (this.lavaStarted) {
      this.abyss.update(delta);
    }

    // Update block manager (pass player Y to track highest point reached)
    const cameraTop = this.cameras.main.scrollY;
    this.blockManager.update(delta, cameraTop, this.player.y);

    // Near miss boost disabled - was confusing
    // this.checkNearMisses();

    // Check grace orb collection
    this.checkGraceOrbCollection();

    // Check if player fell into lava
    if (
      this.lavaStarted &&
      this.abyss.isInLava(this.player.y + GAME_CONSTANTS.PLAYER_HEIGHT / 2)
    ) {
      this.player.triggerDeath("lava");
    }

    // Update background based on height
    const height = Math.max(0, -this.player.y);
    this.drawBackground(height);

    // Update column edges and player ghost
    this.drawColumnEdges();
    this.drawPlayerGhost();

    // Update wall positions to follow camera
    this.updateWalls();
  }

  private checkNearMisses(): void {
    const store = useGameStore.getState();
    const blocks = this.blockManager.getBlocks();

    blocks.forEach((block) => {
      if (this.nearMissCheckedBlocks.has(block)) return;

      const isNear = block.isNearMiss(
        this.player.x,
        this.player.y,
        GAME_CONSTANTS.PLAYER_WIDTH,
        GAME_CONSTANTS.PLAYER_HEIGHT,
      );

      if (isNear && !store.hasNearMissBoost) {
        store.setNearMissBoost(true);
        this.nearMissCheckedBlocks.add(block);
        this.createNearMissEffect();
      }
    });

    // Clean up old checked blocks
    this.nearMissCheckedBlocks.forEach((block) => {
      if (!block.active) {
        this.nearMissCheckedBlocks.delete(block);
      }
    });
  }

  private createNearMissEffect(): void {
    const flash = this.add.graphics();
    flash.fillStyle(COLORS.GRACE_ORB, 0.3);
    flash.fillRect(
      this.cameras.main.scrollX,
      this.cameras.main.scrollY,
      GAME_WIDTH,
      this.cameras.main.height,
    );

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    const particles = this.add.particles(
      this.player.x,
      this.player.y,
      "flame_particle",
      {
        speed: { min: 50, max: 100 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 400,
        tint: [COLORS.GRACE_ORB, 0xffffff],
        blendMode: Phaser.BlendModes.ADD,
        quantity: 10,
      },
    );

    this.time.delayedCall(400, () => particles.destroy());
  }

  private checkGraceOrbCollection(): void {
    const orbs = this.blockManager.getGraceOrbs();

    orbs.forEach((orb) => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        orb.x,
        orb.y,
      );

      if (
        distance <
        GAME_CONSTANTS.GRACE_ORB_SIZE + GAME_CONSTANTS.PLAYER_WIDTH / 2
      ) {
        orb.collect();
      }
    });
  }

  private drawBackground(height: number): void {
    const g = this.background;
    const screenWidth = this.game.scale.width;
    const screenHeight = this.game.scale.height;
    const camera = this.cameras.main;

    g.clear();

    const progress = Math.min(1, height / GAME_CONSTANTS.HEAVEN_HEIGHT);

    const colors = [
      { at: 0, color: COLORS.DESPAIR },
      { at: 0.2, color: COLORS.PURGATORY },
      { at: 0.4, color: COLORS.HOPE },
      { at: 0.7, color: COLORS.LIGHT },
      { at: 1, color: COLORS.HEAVEN },
    ];

    let startColor = colors[0];
    let endColor = colors[1];
    for (let i = 0; i < colors.length - 1; i++) {
      if (progress >= colors[i].at && progress <= colors[i + 1].at) {
        startColor = colors[i];
        endColor = colors[i + 1];
        break;
      }
    }

    const localProgress =
      (progress - startColor.at) / (endColor.at - startColor.at);
    const bgColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(startColor.color),
      Phaser.Display.Color.IntegerToColor(endColor.color),
      1,
      localProgress,
    );

    const color = Phaser.Display.Color.GetColor(
      bgColor.r,
      bgColor.g,
      bgColor.b,
    );
    // Reduce brightness at high progress (near 100%) to make player more visible
    // At 100% progress, use 0.7 opacity instead of 1.0
    const opacity = progress >= 0.95 ? 0.7 + (1 - progress) * 6 : 1.0;

    // Fill only the playable area with background (walls will fill the sides)
    const playableAreaX = (screenWidth - GAME_WIDTH) / 2;
    g.fillStyle(color, opacity);
    g.fillRect(
      playableAreaX,
      camera.scrollY - 100,
      GAME_WIDTH,
      screenHeight + 200,
    );

    // Draw stars in playable area
    if (progress > 0.5) {
      const playableAreaX = (screenWidth - GAME_WIDTH) / 2;
      g.fillStyle(0xffffff, (progress - 0.5) * 0.5);
      for (let i = 0; i < 20; i++) {
        const starX = playableAreaX + ((i * 97) % GAME_WIDTH);
        const starY =
          ((i * 137 + Math.floor(-height / 100) * 23) % screenHeight) +
          camera.scrollY;
        g.fillCircle(starX, starY, 1 + Math.random());
      }
    }

    // Draw rays in playable area
    if (progress > 0.8) {
      const playableAreaX = (screenWidth - GAME_WIDTH) / 2;
      const rayAlpha = (progress - 0.8) * 2.5;
      g.fillStyle(COLORS.GRACE_GLOW, rayAlpha * 0.1);

      for (let i = 0; i < 5; i++) {
        const rayX = playableAreaX + (GAME_WIDTH / 6) * (i + 1);
        const rayWidth = 30 + Math.sin(height * 0.01 + i) * 20;
        g.fillRect(rayX - rayWidth / 2, camera.scrollY, rayWidth, screenHeight);
      }
    }
  }

  private wrapPlayer(): void {
    const screenWidth = this.game.scale.width;
    const playableAreaX = (screenWidth - GAME_WIDTH) / 2;
    const margin = GAME_CONSTANTS.PLAYER_WIDTH / 2;
    const leftBound = playableAreaX - margin;
    const rightBound = playableAreaX + GAME_WIDTH + margin;

    // Wrap player around playable area edges
    if (this.player.x < leftBound) {
      this.player.x = rightBound;
    } else if (this.player.x > rightBound) {
      this.player.x = leftBound;
    }
  }

  private updateWalls(): void {
    // Walls no longer needed for wrapping, but keep for potential wall jumping on edges
    const camera = this.cameras.main;
    const children = this.walls.getChildren() as Phaser.GameObjects.Rectangle[];

    if (children[0]) {
      children[0].setY(camera.scrollY + camera.height / 2);
    }
    if (children[1]) {
      children[1].setY(camera.scrollY + camera.height / 2);
    }

    this.walls.refresh();
  }

  private drawColumnEdges(): void {
    const g = this.columnEdges;
    const screenWidth = this.game.scale.width;
    const screenHeight = this.game.scale.height;
    const camera = this.cameras.main;
    const playableAreaX = (screenWidth - GAME_WIDTH) / 2;

    // Extend walls far above and below the visible area to create depth
    const wallExtension = 50000; // Very tall walls extending into distance
    const topY = camera.scrollY - wallExtension;
    const bottomY = camera.scrollY + screenHeight + wallExtension;
    const wallHeight = bottomY - topY;

    g.clear();

    // Fill left side (from screen edge to playable area) - extends far up and down
    g.fillStyle(0x2a2a2a, 1);
    g.fillRect(0, topY, playableAreaX, wallHeight);

    // Fill right side (from playable area end to screen edge) - extends far up and down
    g.fillStyle(0x2a2a2a, 1);
    g.fillRect(
      playableAreaX + GAME_WIDTH,
      topY,
      screenWidth - (playableAreaX + GAME_WIDTH),
      wallHeight,
    );

    // Left edge highlight (at playable area boundary) - extends far up and down
    g.fillStyle(0x4a4a4a, 1);
    g.fillRect(playableAreaX - wallExtension, topY, wallExtension, wallHeight);

    // Right edge highlight (at playable area boundary) - extends far up and down
    g.fillStyle(0x4a4a4a, 1);
    g.fillRect(playableAreaX + GAME_WIDTH, topY, wallExtension, wallHeight);

    // Add some brick-like lines to visible parts (only in visible area for performance)
    g.lineStyle(1, 0x555555, 0.5);
    const visibleTop = camera.scrollY;
    const visibleBottom = camera.scrollY + screenHeight;
    for (let y = visibleTop; y < visibleBottom; y += 30) {
      // Left side bricks
      if (playableAreaX > 0) {
        g.lineBetween(-4, y, playableAreaX, y);
      }
      // Right side bricks
      if (playableAreaX + GAME_WIDTH < screenWidth) {
        g.lineBetween(playableAreaX + GAME_WIDTH + 4, y, screenWidth, y);
      }
    }

    // Draw floor extension below the actual floor (fills screen below floor level)
    const floorY = 150; // Just below the floor
    if (camera.scrollY + screenHeight > floorY) {
      const fillStartY = Math.max(floorY, camera.scrollY);
      const fillHeight = camera.scrollY + screenHeight - fillStartY + 100;
      g.fillStyle(0x8b7355, 1); // Same color as floor
      g.fillRect(playableAreaX, fillStartY, GAME_WIDTH, fillHeight);
    }
  }

  private drawPlayerGhost(): void {
    const g = this.playerGhost;
    const screenWidth = this.game.scale.width;
    const playableAreaX = (screenWidth - GAME_WIDTH) / 2;
    const margin = GAME_CONSTANTS.PLAYER_WIDTH;

    g.clear();

    // Only show ghost when player is near an edge of the playable area
    const distanceFromLeft = this.player.x - playableAreaX;
    const distanceFromRight = playableAreaX + GAME_WIDTH - this.player.x;
    const showDistance = margin * 2;

    if (distanceFromLeft < showDistance && distanceFromLeft >= 0) {
      // Player near left edge - show ghost on right
      const ghostX = playableAreaX + GAME_WIDTH + distanceFromLeft;
      this.drawGhostAt(
        g,
        ghostX,
        this.player.y,
        Math.max(0.1, 1 - distanceFromLeft / showDistance) * 0.4,
      );
    } else if (distanceFromRight < showDistance && distanceFromRight >= 0) {
      // Player near right edge - show ghost on left
      const ghostX = playableAreaX - distanceFromRight;
      this.drawGhostAt(
        g,
        ghostX,
        this.player.y,
        Math.max(0.1, 1 - distanceFromRight / showDistance) * 0.4,
      );
    }
  }

  private drawGhostAt(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    alpha: number,
  ): void {
    g.setAlpha(alpha);

    // Simple ghost outline of player (wheelchair shape)
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(x - 15, y - 20, 30, 25, 4);
    g.fillRoundedRect(x - 15, y - 35, 8, 20, 2);

    // Wheels
    g.lineStyle(3, COLORS.TEXT_GOLD, 1);
    g.strokeCircle(x - 12, y + 10, 12);
    g.strokeCircle(x + 12, y + 10, 8);

    // Head
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(x, y - 35, 8);
  }

  private createJesusPlatform(): void {
    // HEAVEN_HEIGHT is 10000 ft, which is -10000 in Phaser Y coordinates (negative Y is up)
    const worldY = -GAME_CONSTANTS.HEAVEN_HEIGHT;
    // Center of the playable area
    const screenWidth = this.game.scale.width;
    const playableAreaX = (screenWidth - GAME_WIDTH) / 2;
    const worldX = playableAreaX + GAME_WIDTH / 2;

    // Create cloud platform container
    this.jesusPlatform = this.add.container(worldX, worldY);
    this.jesusPlatform.setDepth(100);

    // Create cloud platform using graphics drawn directly (not texture)
    // This avoids texture clipping issues
    const cloudGraphics = this.add.graphics();
    cloudGraphics.fillStyle(0xffffff, 0.95);

    // Draw cloud shape with overlapping circles (all relative to 0,0 center)
    // Main three bumps like in the reference image
    cloudGraphics.fillCircle(-70, 0, 55); // Left bump
    cloudGraphics.fillCircle(0, 10, 70); // Center bump (largest, slightly lower)
    cloudGraphics.fillCircle(80, -5, 60); // Right bump

    // Fill in gaps
    cloudGraphics.fillCircle(-35, 5, 45);
    cloudGraphics.fillCircle(40, 5, 50);

    // Add cloud to container (graphics object stays at container's 0,0)
    this.jesusPlatform.add(cloudGraphics);

    // Create Jesus as a stick figure with brown triangular beard
    // Draw directly with graphics instead of generating texture
    const jesusGraphics = this.add.graphics();

    // Position Jesus above the cloud (y = -70 puts him standing on top)
    const jesusX = 0;
    const jesusY = -50;

    // Fill head with skin color first
    jesusGraphics.fillStyle(0xffdbac, 1);
    jesusGraphics.fillCircle(jesusX, jesusY - 35, 12);

    // Stick figure body (black lines, thick for visibility)
    jesusGraphics.lineStyle(4, 0x000000, 1);

    // Head outline
    jesusGraphics.strokeCircle(jesusX, jesusY - 35, 12);

    // Body (vertical line)
    jesusGraphics.lineBetween(jesusX, jesusY - 23, jesusX, jesusY + 5);

    // Arms (horizontal line)
    jesusGraphics.lineBetween(
      jesusX - 20,
      jesusY - 12,
      jesusX + 20,
      jesusY - 12,
    );

    // Legs (V shape)
    jesusGraphics.lineBetween(jesusX, jesusY + 5, jesusX - 15, jesusY + 25);
    jesusGraphics.lineBetween(jesusX, jesusY + 5, jesusX + 15, jesusY + 25);

    // Brown triangular beard (pointing down from chin)
    jesusGraphics.fillStyle(0x8b4513, 1);
    jesusGraphics.fillTriangle(
      jesusX,
      jesusY - 15, // Bottom point (chin)
      jesusX - 8,
      jesusY - 25, // Top left
      jesusX + 8,
      jesusY - 25, // Top right
    );

    // Gold halo
    jesusGraphics.lineStyle(3, 0xffd700, 0.9);
    jesusGraphics.strokeCircle(jesusX, jesusY - 35, 18);

    // Store reference for animations
    this.jesusSprite = jesusGraphics as unknown as Phaser.GameObjects.Image;

    // Add Jesus to container
    this.jesusPlatform.add(jesusGraphics);

    // Gentle floating animation for the whole platform
    this.tweens.add({
      targets: this.jesusPlatform,
      y: this.jesusPlatform.y - 10,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  shutdown(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.blockManager?.cleanup();
    if (this.jesusPlatform) {
      this.jesusPlatform.destroy();
    }
  }
}
