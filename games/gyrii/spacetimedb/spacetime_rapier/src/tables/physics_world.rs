//! PhysicsWorld table - configuration for a physics simulation

use bon::Builder;
use spacetimedb::{table, ReducerContext, Table};

pub type PhysicsWorldId = u64;

/// Physics world configuration
///
/// Each world is an isolated physics simulation with its own gravity,
/// timestep, and entities.
#[table(name = rapier_physics_world, public)]
#[derive(Builder, Debug, Clone, Copy, PartialEq)]
#[builder(derive(Debug, Clone))]
pub struct PhysicsWorld {
    #[primary_key]
    #[auto_inc]
    #[builder(default = 0)]
    pub id: u64,

    /// Physics updates per second (default: 60)
    #[builder(default = 60.0)]
    pub ticks_per_second: f32,

    /// Gravity X component
    #[builder(default = 0.0)]
    pub gravity_x: f32,

    /// Gravity Y component (typically negative for downward)
    #[builder(default = -9.81)]
    pub gravity_y: f32,

    /// Gravity Z component (ignored in 2D)
    #[builder(default = 0.0)]
    pub gravity_z: f32,

    /// Number of solver iterations for velocity constraints
    #[builder(default = 4)]
    pub num_solver_iterations: u32,

    /// Number of additional friction iterations
    #[builder(default = 1)]
    pub num_additional_friction_iterations: u32,

    /// Number of internal PGS iterations for each contact constraint
    #[builder(default = 1)]
    pub num_internal_pgs_iterations: u32,

    /// Enable debug logging
    #[builder(default = false)]
    pub debug: bool,
}

impl PhysicsWorld {
    /// Insert this world into the database
    pub fn insert(self, ctx: &ReducerContext) -> Self {
        ctx.db.rapier_physics_world().insert(self)
    }

    /// Find a world by ID
    pub fn find(ctx: &ReducerContext, id: PhysicsWorldId) -> Option<Self> {
        ctx.db.rapier_physics_world().id().find(id)
    }

    /// Update this world in the database
    pub fn update(self, ctx: &ReducerContext) -> Self {
        ctx.db.rapier_physics_world().id().update(self)
    }

    /// Delete this world from the database
    pub fn delete(&self, ctx: &ReducerContext) {
        ctx.db.rapier_physics_world().id().delete(self.id);
    }

    /// Get the timestep duration in seconds
    pub fn timestep(&self) -> f32 {
        1.0 / self.ticks_per_second
    }

    /// Get gravity as a 3D vector (for Rapier3D)
    #[cfg(feature = "dim3")]
    pub fn gravity_vector(&self) -> nalgebra::Vector3<f32> {
        nalgebra::Vector3::new(self.gravity_x, self.gravity_y, self.gravity_z)
    }

    /// Get gravity as a 2D vector (for Rapier2D)
    #[cfg(feature = "dim2")]
    pub fn gravity_vector(&self) -> nalgebra::Vector2<f32> {
        nalgebra::Vector2::new(self.gravity_x, self.gravity_y)
    }
}
