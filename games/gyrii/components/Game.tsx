"use client";

import { useEffect, useRef, useState } from "react";
import type { Vector3 } from "@babylonjs/core";
import { useGyriiStore } from "../store/gameStore";
import HUD from "./HUD";
import LobbyUI from "./LobbyUI";
import PauseMenu from "./PauseMenu";

// Types for weapon and throwable renderers
type WeaponRendererType =
  typeof import("../game/weapons/WeaponRenderer").WeaponRenderer;
type ThrowableRendererType =
  typeof import("../game/weapons/ThrowableRenderer").ThrowableRenderer;

export default function GyriiGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameSceneRef = useRef<any>(null);
  const weaponRendererRef = useRef<InstanceType<WeaponRendererType> | null>(
    null,
  );
  const throwableRendererRef =
    useRef<InstanceType<ThrowableRendererType> | null>(null);
  const { gameState, setGameState, localPlayer, selectedWeapon } =
    useGyriiStore();
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    let mounted = true;

    const initGame = async () => {
      try {
        // Import BabylonJS dynamically
        const BABYLON = await import("@babylonjs/core");

        // Import Havok physics
        const HavokPhysics = await import("@babylonjs/havok");

        // Import weapon systems
        const { WeaponRenderer, WEAPON_CONFIGS } =
          await import("../game/weapons/WeaponRenderer");
        const { ThrowableRenderer } =
          await import("../game/weapons/ThrowableRenderer");
        const { createDeathExplosion } =
          await import("../game/effects/ParticleEffects");

        if (!mounted || !canvasRef.current) return;

        // Create engine
        const engine = new BABYLON.Engine(canvasRef.current, true, {
          preserveDrawingBuffer: true,
          stencil: true,
        });

        // Create scene
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.05, 1);

        // Initialize Havok physics
        setLoadingProgress(20);
        const havokInstance = await HavokPhysics.default();
        const havokPlugin = new BABYLON.HavokPlugin(true, havokInstance);
        scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), havokPlugin);

        setLoadingProgress(40);

        // Create top-down camera
        const camera = new BABYLON.ArcRotateCamera(
          "camera",
          -Math.PI / 2, // alpha - rotation around Y axis
          Math.PI / 6, // beta - angle from top (30 degrees from vertical)
          40, // radius
          BABYLON.Vector3.Zero(),
          scene,
        );
        camera.lowerRadiusLimit = 20;
        camera.upperRadiusLimit = 80;
        camera.lowerBetaLimit = Math.PI / 8;
        camera.upperBetaLimit = Math.PI / 3;
        camera.attachControl(canvasRef.current, false);
        camera.panningSensibility = 0; // Disable panning

        // Initialize camera target for smooth following
        let cameraTarget = BABYLON.Vector3.Zero();

        setLoadingProgress(60);

        // Create lighting
        const ambientLight = new BABYLON.HemisphericLight(
          "ambient",
          new BABYLON.Vector3(0, 1, 0),
          scene,
        );
        ambientLight.intensity = 0.4;
        ambientLight.groundColor = new BABYLON.Color3(0.1, 0.1, 0.2);

        const mainLight = new BABYLON.DirectionalLight(
          "main",
          new BABYLON.Vector3(-1, -2, -1),
          scene,
        );
        mainLight.intensity = 0.8;

        // Create ground plane
        const ground = BABYLON.MeshBuilder.CreateGround(
          "ground",
          { width: 100, height: 100 },
          scene,
        );
        const groundMaterial = new BABYLON.PBRMaterial("groundMat", scene);
        groundMaterial.albedoColor = new BABYLON.Color3(0.05, 0.05, 0.1);
        groundMaterial.metallic = 0.8;
        groundMaterial.roughness = 0.4;
        groundMaterial.emissiveColor = new BABYLON.Color3(0, 0.05, 0.1);
        ground.material = groundMaterial;

        // Add grid lines to ground using standard material with texture
        const gridGround = BABYLON.MeshBuilder.CreateGround(
          "gridGround",
          { width: 100, height: 100, subdivisions: 50 },
          scene,
        );
        gridGround.position.y = 0.01;

        const gridMaterial = new BABYLON.StandardMaterial("gridMat", scene);
        gridMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.3);
        gridMaterial.wireframe = true;
        gridMaterial.alpha = 0.3;
        gridGround.material = gridMaterial;

        setLoadingProgress(80);

        // Create a test player ball
        const playerBall = BABYLON.MeshBuilder.CreateSphere(
          "player",
          { diameter: 1 },
          scene,
        );
        playerBall.position.y = 0.5;

        // Initialize camera target to player starting position
        cameraTarget = playerBall.position.clone();
        camera.target.copyFrom(cameraTarget);

        const playerMaterial = new BABYLON.PBRMaterial("playerMat", scene);
        playerMaterial.albedoColor = new BABYLON.Color3(0, 1, 1);
        playerMaterial.emissiveColor = new BABYLON.Color3(0, 0.5, 0.5);
        playerMaterial.metallic = 0.5;
        playerMaterial.roughness = 0.3;
        playerBall.material = playerMaterial;

        // Add glow layer for neon effect
        const glowLayer = new BABYLON.GlowLayer("glow", scene);
        glowLayer.intensity = 0.8;
        glowLayer.addIncludedOnlyMesh(playerBall);

        // Create some test walls
        const createWall = (
          x: number,
          z: number,
          width: number,
          depth: number,
          height: number,
        ) => {
          const wall = BABYLON.MeshBuilder.CreateBox(
            `wall_${x}_${z}`,
            { width, height, depth },
            scene,
          );
          wall.position = new BABYLON.Vector3(x, height / 2, z);

          const wallMaterial = new BABYLON.PBRMaterial(
            `wallMat_${x}_${z}`,
            scene,
          );
          wallMaterial.albedoColor = new BABYLON.Color3(0.2, 0.2, 0.3);
          wallMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.2);
          wallMaterial.metallic = 0.7;
          wallMaterial.roughness = 0.3;
          wall.material = wallMaterial;

          return wall;
        };

        // Create arena boundaries
        createWall(0, -25, 50, 1, 2);
        createWall(0, 25, 50, 1, 2);
        createWall(-25, 0, 1, 50, 2);
        createWall(25, 0, 1, 50, 2);

        // Create some cover
        createWall(0, 0, 8, 2, 1);
        createWall(0, 0, 2, 8, 1);
        createWall(-12, -12, 3, 3, 2);
        createWall(12, -12, 3, 3, 2);
        createWall(-12, 12, 3, 3, 2);
        createWall(12, 12, 3, 3, 2);

        setLoadingProgress(100);

        // Initialize weapon renderers
        const weaponRenderer = new WeaponRenderer(scene);
        const throwableRenderer = new ThrowableRenderer(scene);
        weaponRendererRef.current = weaponRenderer;
        throwableRendererRef.current = throwableRenderer;

        // Store reference
        gameSceneRef.current = { engine, scene, camera, playerBall, glowLayer };

        // Handle resize
        const handleResize = () => {
          engine.resize();
        };
        window.addEventListener("resize", handleResize);

        // Input handling
        const inputMap: { [key: string]: boolean } = {};
        const handleKeyDown = (e: KeyboardEvent) => {
          // Handle Escape key for pause
          if (e.key === "Escape") {
            e.preventDefault();
            const currentState = useGyriiStore.getState().gameState;
            if (currentState === "playing") {
              useGyriiStore.getState().setGameState("paused");
            } else if (currentState === "paused") {
              useGyriiStore.getState().setGameState("playing");
            }
            return;
          }
          inputMap[e.key.toLowerCase()] = true;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
          inputMap[e.key.toLowerCase()] = false;
        };
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        // Mouse position tracking for aiming
        let aimDirection = new BABYLON.Vector3(0, 0, -1);
        let mouseScreenPos = { x: 0, y: 0 };

        const handleMouseMove = (e: MouseEvent) => {
          mouseScreenPos.x = e.clientX;
          mouseScreenPos.y = e.clientY;
        };
        window.addEventListener("mousemove", handleMouseMove);

        // Shooting state
        let isShooting = false;
        let lastShotTime = 0;
        let playerVelocity = new BABYLON.Vector3(0, 0, 0);
        let playerHealth = 100;

        // Mouse button handlers
        const handleMouseDown = (e: MouseEvent) => {
          if (e.button === 0) {
            // Left click - shoot
            isShooting = true;
          } else if (e.button === 2) {
            // Right click - grenade
            throwableRenderer.throw(
              playerBall.position.clone(),
              aimDirection,
              15,
              "grenade",
              "local",
            );
          } else if (e.button === 1) {
            // Middle click - molotov
            throwableRenderer.throw(
              playerBall.position.clone(),
              aimDirection,
              12,
              "molotov",
              "local",
            );
          }
        };

        const handleMouseUp = (e: MouseEvent) => {
          if (e.button === 0) {
            isShooting = false;
          }
        };

        canvasRef.current.addEventListener("mousedown", handleMouseDown);
        canvasRef.current.addEventListener("mouseup", handleMouseUp);

        // Game loop
        let lastFrameTime = performance.now();

        scene.onBeforeRenderObservable.add(() => {
          // Pause game loop if paused
          const currentState = useGyriiStore.getState().gameState;
          if (currentState === "paused") {
            return;
          }

          const currentTime = performance.now();
          const deltaTime = (currentTime - lastFrameTime) / 1000;
          lastFrameTime = currentTime;

          // Calculate aim direction from mouse position
          let mouseWorldPos: Vector3 | null = null;
          const pickInfo = scene.pick(mouseScreenPos.x, mouseScreenPos.y);
          if (pickInfo?.pickedPoint) {
            const targetPos = pickInfo.pickedPoint;
            mouseWorldPos = targetPos.clone();
            // Always zero out Y (vertical) coordinate so camera doesn't go up when hovering over walls
            mouseWorldPos.y = 0;
            aimDirection = mouseWorldPos
              .subtract(playerBall.position)
              .normalize();
            aimDirection.y = 0;
            aimDirection.normalize();
          } else {
            // Fallback: project mouse ray onto ground plane (y=0)
            const ray = scene.createPickingRay(
              mouseScreenPos.x,
              mouseScreenPos.y,
              BABYLON.Matrix.Identity(),
              camera,
            );
            if (ray.direction.y !== 0) {
              const t = -ray.origin.y / ray.direction.y;
              if (t > 0) {
                mouseWorldPos = ray.origin.add(ray.direction.scale(t));
                mouseWorldPos.y = 0; // Ensure it's on the ground plane
                aimDirection = mouseWorldPos
                  .subtract(playerBall.position)
                  .normalize();
                aimDirection.y = 0;
                aimDirection.normalize();
              }
            }
          }

          // Movement input (Y inverted)
          const moveSpeed = 10 * 0.03; // Reduced by 80% again (4% of original)
          let inputX = 0,
            inputZ = 0;

          if (inputMap["w"] || inputMap["arrowup"]) inputZ = 1; // Inverted: was -1
          if (inputMap["s"] || inputMap["arrowdown"]) inputZ = -1; // Inverted: was 1
          if (inputMap["a"] || inputMap["arrowleft"]) inputX = -1;
          if (inputMap["d"] || inputMap["arrowright"]) inputX = 1;

          // Apply movement with physics-like velocity
          const friction = 0.85;
          if (inputX !== 0 || inputZ !== 0) {
            const len = Math.sqrt(inputX * inputX + inputZ * inputZ);
            playerVelocity.x += (inputX / len) * moveSpeed * deltaTime * 5;
            playerVelocity.z += (inputZ / len) * moveSpeed * deltaTime * 5;
          }

          // Apply friction
          playerVelocity.x *= friction;
          playerVelocity.z *= friction;

          // Cap velocity
          const maxSpeed = 0.5;
          const currentSpeed = Math.sqrt(
            playerVelocity.x ** 2 + playerVelocity.z ** 2,
          );
          if (currentSpeed > maxSpeed) {
            playerVelocity.x = (playerVelocity.x / currentSpeed) * maxSpeed;
            playerVelocity.z = (playerVelocity.z / currentSpeed) * maxSpeed;
          }

          // Update position
          playerBall.position.x += playerVelocity.x;
          playerBall.position.z += playerVelocity.z;

          // Clamp to arena
          playerBall.position.x = Math.max(
            -24,
            Math.min(24, playerBall.position.x),
          );
          playerBall.position.z = Math.max(
            -24,
            Math.min(24, playerBall.position.z),
          );

          // Handle shooting
          if (isShooting) {
            // Get current weapon config dynamically from store
            const currentWeapon = useGyriiStore.getState().selectedWeapon;
            const currentWeaponConfig = WEAPON_CONFIGS[currentWeapon];
            const timeSinceLastShot = currentTime - lastShotTime;
            const fireInterval = 1000 / currentWeaponConfig.fireRate;

            if (timeSinceLastShot >= fireInterval) {
              // Fire weapon
              const muzzlePos = playerBall.position.add(
                aimDirection.scale(0.7),
              );
              muzzlePos.y += 0.3;

              weaponRenderer.fireHitscan(
                muzzlePos,
                aimDirection,
                currentWeaponConfig,
                (hitPoint) => {
                  // Handle hit feedback
                  console.log("Hit at:", hitPoint);
                },
              );

              // Apply recoil knockback to player
              const recoilForce = currentWeaponConfig.knockback * 0.1;
              playerVelocity.x -= aimDirection.x * recoilForce;
              playerVelocity.z -= aimDirection.z * recoilForce;

              lastShotTime = currentTime;
            }
          }

          // Update weapon renderer
          weaponRenderer.update(deltaTime);

          // Update throwables
          throwableRenderer.update(deltaTime);

          // Check if player is in fire zone (molotov damage)
          if (throwableRenderer.isInFireZone(playerBall.position)) {
            playerHealth -= 15 * deltaTime; // 15 damage per second
            if (playerHealth <= 0 && playerHealth > -100) {
              // Death effect (only trigger once)
              playerHealth = -100;
              createDeathExplosion(
                scene,
                playerBall.position.clone(),
                new BABYLON.Color3(0, 1, 1),
                () => {
                  // Respawn after death
                  setTimeout(() => {
                    playerHealth = 100;
                    playerBall.position = new BABYLON.Vector3(0, 0.5, 0);
                    playerVelocity = new BABYLON.Vector3(0, 0, 0);
                  }, 2000);
                },
              );
            }
          }

          // Camera follows player - sits 1/4 of the way to mouse world position
          let targetPosition: Vector3;
          if (mouseWorldPos) {
            // Calculate position 1/4 of the way from player to mouse (0.25 = 1/4)
            targetPosition = BABYLON.Vector3.Lerp(
              playerBall.position,
              mouseWorldPos,
              0.25,
            );
          } else {
            // Fallback: just follow player if no mouse position
            targetPosition = playerBall.position.clone();
          }

          // Smooth camera interpolation (lerp for smooth following)
          // Higher lerp speed = more responsive, lower = smoother
          const cameraLerpSpeed = Math.min(1.0, deltaTime * 10); // Responsive following
          cameraTarget = BABYLON.Vector3.Lerp(
            cameraTarget,
            targetPosition,
            cameraLerpSpeed,
          );

          // Update camera target directly (don't use setTarget which rebuilds angles)
          // This makes the camera MOVE to follow the target, not just look at it
          camera.target.copyFrom(cameraTarget);
        });

        // Start render loop
        engine.runRenderLoop(() => {
          scene.render();
        });

        setIsLoading(false);
        setGameState("menu");

        // Cleanup function
        return () => {
          mounted = false;
          window.removeEventListener("resize", handleResize);
          window.removeEventListener("keydown", handleKeyDown);
          window.removeEventListener("keyup", handleKeyUp);
          window.removeEventListener("mousemove", handleMouseMove);
          canvasRef.current?.removeEventListener("mousedown", handleMouseDown);
          canvasRef.current?.removeEventListener("mouseup", handleMouseUp);
          weaponRenderer.dispose();
          throwableRenderer.dispose();
          scene.dispose();
          engine.dispose();
        };
      } catch (error) {
        console.error("Failed to initialize game:", error);
        setIsLoading(false);
      }
    };

    const cleanup = initGame();

    return () => {
      mounted = false;
      cleanup?.then((fn) => fn?.());
    };
  }, [setGameState]);

  return (
    <div className="relative w-full h-full">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500 mb-8">
              GYRII
            </h1>
            <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-pink-500 transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <p className="text-gray-400">
              Loading assets... {loadingProgress}%
            </p>
          </div>
        </div>
      )}

      {/* Game canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full outline-none"
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* UI Overlays */}
      {!isLoading && gameState === "menu" && <LobbyUI />}
      {!isLoading && gameState === "playing" && <HUD />}
      {!isLoading && gameState === "paused" && <PauseMenu />}
    </div>
  );
}
