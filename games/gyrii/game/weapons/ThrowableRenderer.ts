import * as BABYLON from "@babylonjs/core";
import { createExplosion, createFireEffect } from "../effects/ParticleEffects";

export type ThrowableType = "grenade" | "molotov";

export interface ThrowableConfig {
  type: ThrowableType;
  damage: number;
  radius: number;
  fuseTime: number; // seconds
  bounceRestitution: number;
}

export const THROWABLE_CONFIGS: Record<ThrowableType, ThrowableConfig> = {
  grenade: {
    type: "grenade",
    damage: 70,
    radius: 5,
    fuseTime: 2.5,
    bounceRestitution: 0.5,
  },
  molotov: {
    type: "molotov",
    damage: 15, // per second
    radius: 4,
    fuseTime: 0, // explodes on impact
    bounceRestitution: 0,
  },
};

interface ActiveThrowable {
  mesh: BABYLON.Mesh;
  velocity: BABYLON.Vector3;
  config: ThrowableConfig;
  spawnTime: number;
  ownerId: string;
}

interface ActiveFireZone {
  position: BABYLON.Vector3;
  radius: number;
  endTime: number;
  particleSystem: BABYLON.ParticleSystem;
  zoneMesh: BABYLON.Mesh;
}

/**
 * Renders grenades and molotovs in the scene
 */
export class ThrowableRenderer {
  private scene: BABYLON.Scene;
  private throwables: Map<string, ActiveThrowable> = new Map();
  private fireZones: Map<string, ActiveFireZone> = new Map();
  private gravity = new BABYLON.Vector3(0, -15, 0);

  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
  }

  /**
   * Throw a grenade or molotov
   */
  throw(
    origin: BABYLON.Vector3,
    direction: BABYLON.Vector3,
    throwStrength: number,
    type: ThrowableType,
    ownerId: string,
  ): string {
    const id = `throwable_${Date.now()}_${Math.random()}`;
    const config = THROWABLE_CONFIGS[type];

    // Create mesh
    const mesh = BABYLON.MeshBuilder.CreateSphere(
      id,
      { diameter: type === "grenade" ? 0.3 : 0.25 },
      this.scene,
    );
    mesh.position = origin.clone();
    mesh.position.y += 0.5; // Start from slightly above player

    // Material
    const material = new BABYLON.StandardMaterial(`${id}_mat`, this.scene);
    if (type === "grenade") {
      material.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.2);
      material.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.1);
    } else {
      material.diffuseColor = new BABYLON.Color3(0.8, 0.3, 0.1);
      material.emissiveColor = new BABYLON.Color3(0.4, 0.15, 0.05);
    }
    mesh.material = material;

    // Calculate arc velocity - up and forward
    const arcHeight = 5 * (throwStrength / 20);
    const velocity = new BABYLON.Vector3(
      direction.x * throwStrength,
      arcHeight,
      direction.z * throwStrength,
    );

    this.throwables.set(id, {
      mesh,
      velocity,
      config,
      spawnTime: Date.now(),
      ownerId,
    });

    return id;
  }

  /**
   * Update all throwables (call in render loop)
   */
  update(deltaTime: number) {
    const currentTime = Date.now();
    const toRemove: string[] = [];

    // Update throwables
    this.throwables.forEach((throwable, id) => {
      // Apply gravity
      throwable.velocity.addInPlace(this.gravity.scale(deltaTime));

      // Move
      throwable.mesh.position.addInPlace(throwable.velocity.scale(deltaTime));

      // Ground collision/bounce
      if (throwable.mesh.position.y <= 0.15) {
        throwable.mesh.position.y = 0.15;

        if (throwable.config.type === "molotov") {
          // Molotov breaks on impact
          this.createFireZone(
            throwable.mesh.position.clone(),
            throwable.config.radius,
            5000,
          );
          toRemove.push(id);
        } else {
          // Grenade bounces
          if (Math.abs(throwable.velocity.y) > 0.5) {
            throwable.velocity.y =
              -throwable.velocity.y * throwable.config.bounceRestitution;
            // Reduce horizontal velocity on bounce
            throwable.velocity.x *= 0.7;
            throwable.velocity.z *= 0.7;
          } else {
            // Come to rest
            throwable.velocity.y = 0;
            throwable.velocity.x *= 0.9;
            throwable.velocity.z *= 0.9;
          }
        }
      }

      // Wall collision (simple box check)
      this.checkWallCollision(throwable);

      // Check fuse time for grenades
      if (throwable.config.type === "grenade") {
        const elapsed = (currentTime - throwable.spawnTime) / 1000;
        if (elapsed >= throwable.config.fuseTime) {
          // Explode
          createExplosion(
            this.scene,
            throwable.mesh.position,
            throwable.config.radius,
          );
          toRemove.push(id);
        }
      }
    });

    // Clean up exploded throwables
    toRemove.forEach((id) => {
      const throwable = this.throwables.get(id);
      if (throwable) {
        throwable.mesh.dispose();
        this.throwables.delete(id);
      }
    });

    // Update fire zones
    const zonesToRemove: string[] = [];
    this.fireZones.forEach((zone, id) => {
      if (currentTime > zone.endTime) {
        zone.particleSystem.stop();
        setTimeout(() => {
          zone.particleSystem.dispose();
          zone.zoneMesh.dispose();
        }, 1000);
        zonesToRemove.push(id);
      }
    });
    zonesToRemove.forEach((id) => this.fireZones.delete(id));
  }

  private checkWallCollision(throwable: ActiveThrowable) {
    // Cast rays in movement direction to detect walls
    const ray = new BABYLON.Ray(
      throwable.mesh.position,
      throwable.velocity.normalize(),
      0.3,
    );

    const hit = this.scene.pickWithRay(
      ray,
      (mesh) => mesh.name.startsWith("wall") || mesh.name === "obstacle",
    );

    if (hit?.pickedMesh && hit.pickedPoint) {
      // Calculate reflection
      const normal = hit.getNormal(true);
      if (normal) {
        const reflection = throwable.velocity.subtract(
          normal.scale(2 * BABYLON.Vector3.Dot(throwable.velocity, normal)),
        );
        throwable.velocity = reflection.scale(
          throwable.config.bounceRestitution,
        );

        // Push back from wall
        throwable.mesh.position.addInPlace(normal.scale(0.1));
      }
    }
  }

  private createFireZone(
    position: BABYLON.Vector3,
    radius: number,
    duration: number,
  ) {
    const id = `fire_${Date.now()}`;

    // Create visual zone on ground
    const zoneMesh = BABYLON.MeshBuilder.CreateDisc(
      id,
      { radius: radius },
      this.scene,
    );
    zoneMesh.position = new BABYLON.Vector3(position.x, 0.02, position.z);
    zoneMesh.rotation.x = Math.PI / 2;

    const material = new BABYLON.StandardMaterial(`${id}_mat`, this.scene);
    material.diffuseColor = new BABYLON.Color3(1, 0.3, 0);
    material.emissiveColor = new BABYLON.Color3(0.5, 0.15, 0);
    material.alpha = 0.5;
    zoneMesh.material = material;

    // Create fire particles
    const particleSystem = createFireEffect(this.scene, position, radius);
    particleSystem.start();

    this.fireZones.set(id, {
      position,
      radius,
      endTime: Date.now() + duration,
      particleSystem,
      zoneMesh,
    });
  }

  /**
   * Check if a position is in any fire zone
   */
  isInFireZone(position: BABYLON.Vector3): boolean {
    for (const [, zone] of this.fireZones) {
      const dist = BABYLON.Vector3.Distance(
        new BABYLON.Vector3(position.x, 0, position.z),
        new BABYLON.Vector3(zone.position.x, 0, zone.position.z),
      );
      if (dist <= zone.radius) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all positions of active throwables (for other clients to render)
   */
  getThrowablePositions(): Array<{
    id: string;
    position: BABYLON.Vector3;
    type: ThrowableType;
  }> {
    const positions: Array<{
      id: string;
      position: BABYLON.Vector3;
      type: ThrowableType;
    }> = [];
    this.throwables.forEach((throwable, id) => {
      positions.push({
        id,
        position: throwable.mesh.position.clone(),
        type: throwable.config.type,
      });
    });
    return positions;
  }

  /**
   * Dispose all resources
   */
  dispose() {
    this.throwables.forEach((t) => t.mesh.dispose());
    this.fireZones.forEach((z) => {
      z.particleSystem.dispose();
      z.zoneMesh.dispose();
    });
  }
}
