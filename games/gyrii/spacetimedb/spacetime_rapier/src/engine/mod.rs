//! Physics engine wrapper
//!
//! Provides the `step_world()` function that integrates Rapier with SpacetimeDB.

#[cfg(feature = "dim2")]
mod world_2d;

#[cfg(feature = "dim3")]
mod world_3d;

use spacetimedb::ReducerContext;
use crate::tables::PhysicsWorld;

#[cfg(feature = "dim3")]
use crate::math::{Vec3, Quat};

#[cfg(feature = "dim2")]
use crate::math::Vec2;

/// Kinematic body update for 3D - position and rotation from external input
#[cfg(feature = "dim3")]
pub struct KinematicUpdate {
    pub rigid_body_id: u64,
    pub position: Vec3,
    pub rotation: Quat,
}

/// Kinematic body update for 2D - position and rotation angle from external input
#[cfg(feature = "dim2")]
pub struct KinematicUpdate {
    pub rigid_body_id: u64,
    pub position: Vec2,
    pub rotation: f32,
}

/// Type alias for kinematic body updates (2D)
#[cfg(feature = "dim2")]
pub type KinematicBody = (u64, (Vec2, f32));

/// Type alias for kinematic body updates (3D)
#[cfg(feature = "dim3")]
pub type KinematicBody = (u64, (Vec3, Quat));

/// Main physics simulation step
///
/// This function:
/// 1. Loads all physics entities from SpacetimeDB tables
/// 2. Builds a Rapier physics world
/// 3. Applies kinematic body updates
/// 4. Steps the simulation
/// 5. Writes results back to SpacetimeDB tables
/// 6. Updates trigger enter/exit events
/// 7. Updates raycast hit lists
#[cfg(feature = "dim2")]
pub fn step_world(
    ctx: &ReducerContext,
    world: &PhysicsWorld,
    kinematic_entities: impl Iterator<Item = KinematicBody>,
) {
    world_2d::step_world_2d(ctx, world, kinematic_entities);
}

/// Main physics simulation step
///
/// This function:
/// 1. Loads all physics entities from SpacetimeDB tables
/// 2. Builds a Rapier physics world
/// 3. Applies kinematic body updates
/// 4. Steps the simulation
/// 5. Writes results back to SpacetimeDB tables
/// 6. Updates trigger enter/exit events
/// 7. Updates raycast hit lists
#[cfg(feature = "dim3")]
pub fn step_world(
    ctx: &ReducerContext,
    world: &PhysicsWorld,
    kinematic_entities: impl Iterator<Item = KinematicBody>,
) {
    world_3d::step_world_3d(ctx, world, kinematic_entities);
}
