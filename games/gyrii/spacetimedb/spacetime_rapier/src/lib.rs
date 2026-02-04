//! # Spacetime Rapier
//!
//! A Rapier physics engine integration for SpacetimeDB that supports both 2D and 3D games.
//!
//! ## Features
//!
//! - `dim2` - Enable 2D physics with Rapier2D
//! - `dim3` - Enable 3D physics with Rapier3D (default)
//!
//! ## Usage
//!
//! ```rust
//! use spacetime_rapier::{PhysicsWorld, RigidBody, Collider, step_world};
//!
//! // Create a physics world
//! let world = PhysicsWorld::builder()
//!     .ticks_per_second(60.0)
//!     .gravity_y(-9.81)
//!     .build()
//!     .insert(ctx);
//!
//! // In your scheduled reducer
//! let world = PhysicsWorld::find(ctx, world_id).unwrap();
//! step_world(ctx, &world, kinematic_updates);
//! ```

// Ensure at least one dimension feature is enabled
#[cfg(not(any(feature = "dim2", feature = "dim3")))]
compile_error!("Either 'dim2' or 'dim3' feature must be enabled");

#[cfg(all(feature = "dim2", feature = "dim3"))]
compile_error!("Cannot enable both 'dim2' and 'dim3' features simultaneously");

// Math types (dimension-agnostic where possible)
pub mod math;

// SpacetimeDB table definitions
pub mod tables;

// Physics engine wrapper
pub mod engine;

// Query utilities (raycasts, shapecasts)
pub mod queries;

// Re-export commonly used types
pub use math::*;
pub use tables::*;
pub use engine::step_world;
pub use queries::*;

// Re-export Rapier types that users might need
#[cfg(feature = "dim2")]
pub use rapier2d;

#[cfg(feature = "dim3")]
pub use rapier3d;
