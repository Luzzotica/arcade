//! Query utilities for physics world
//!
//! Provides raycast and shapecast functionality.

use spacetimedb::ReducerContext;
use crate::tables::{PhysicsWorld, RayCastHit};

#[cfg(feature = "dim2")]
use crate::math::Vec2;

#[cfg(feature = "dim3")]
use crate::math::Vec3;

/// Perform an instant raycast (not persistent) - 3D version
///
/// Unlike persistent raycasts stored in the RayCast table, this performs
/// a one-shot raycast and returns results immediately.
#[cfg(feature = "dim3")]
pub fn raycast_instant(
    _ctx: &ReducerContext,
    _world: &PhysicsWorld,
    _origin: Vec3,
    _direction: Vec3,
    _max_distance: f32,
) -> Vec<RayCastHit> {
    // TODO: Implement instant raycast
    Vec::new()
}

/// Perform an instant raycast (not persistent) - 2D version
///
/// Unlike persistent raycasts stored in the RayCast table, this performs
/// a one-shot raycast and returns results immediately.
#[cfg(feature = "dim2")]
pub fn raycast_instant(
    _ctx: &ReducerContext,
    _world: &PhysicsWorld,
    _origin: Vec2,
    _direction: Vec2,
    _max_distance: f32,
) -> Vec<RayCastHit> {
    // TODO: Implement instant raycast
    Vec::new()
}
