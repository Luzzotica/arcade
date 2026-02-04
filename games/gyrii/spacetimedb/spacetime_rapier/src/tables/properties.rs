//! RigidBodyProperties table - physical material properties

use bon::Builder;
use spacetimedb::{table, ReducerContext, Table};

pub type PropertiesId = u64;

/// Physical properties for a rigid body
///
/// Can be shared between multiple bodies with the same material.
#[table(name = rapier_rigid_body_properties, public)]
#[derive(Builder, Clone, Copy, Debug, PartialEq)]
#[builder(derive(Debug, Clone))]
pub struct RigidBodyProperties {
    #[primary_key]
    #[auto_inc]
    #[builder(default = 0)]
    pub id: u64,

    /// Which physics world this belongs to
    #[index(btree)]
    #[builder(default = 1)]
    pub world_id: u64,

    /// Mass in kilograms (0 = infinite mass / static)
    #[builder(default = 1.0)]
    pub mass: f32,

    /// Coefficient of friction (0 = frictionless, 1 = very sticky)
    #[builder(default = 0.5)]
    pub friction: f32,

    /// Coefficient of restitution / bounciness (0 = no bounce, 1 = perfect bounce)
    #[builder(default = 0.0)]
    pub restitution: f32,

    /// Linear damping (air resistance for translation)
    #[builder(default = 0.0)]
    pub linear_damping: f32,

    /// Angular damping (air resistance for rotation)
    #[builder(default = 0.0)]
    pub angular_damping: f32,

    /// Density (used if mass is not specified directly)
    #[builder(default = 1.0)]
    pub density: f32,

    /// Whether continuous collision detection is enabled
    #[builder(default = false)]
    pub ccd_enabled: bool,
}

impl Default for RigidBodyProperties {
    fn default() -> Self {
        Self {
            id: 0,
            world_id: 1,
            mass: 1.0,
            friction: 0.5,
            restitution: 0.0,
            linear_damping: 0.0,
            angular_damping: 0.0,
            density: 1.0,
            ccd_enabled: false,
        }
    }
}

impl RigidBodyProperties {
    /// Insert these properties into the database
    pub fn insert(self, ctx: &ReducerContext) -> Self {
        ctx.db.rapier_rigid_body_properties().insert(self)
    }

    /// Find properties by ID
    pub fn find(ctx: &ReducerContext, id: PropertiesId) -> Option<Self> {
        ctx.db.rapier_rigid_body_properties().id().find(id)
    }

    /// Get all properties in a world
    pub fn all_in_world(ctx: &ReducerContext, world_id: u64) -> impl Iterator<Item = Self> + '_ {
        ctx.db.rapier_rigid_body_properties().world_id().filter(world_id)
    }

    /// Update these properties in the database
    pub fn update(self, ctx: &ReducerContext) -> Self {
        ctx.db.rapier_rigid_body_properties().id().update(self)
    }

    /// Delete these properties from the database
    pub fn delete(&self, ctx: &ReducerContext) {
        ctx.db.rapier_rigid_body_properties().id().delete(self.id);
    }

    /// Get inverse mass (0 for infinite mass)
    pub fn inv_mass(&self) -> f32 {
        if self.mass > 0.0 {
            1.0 / self.mass
        } else {
            0.0
        }
    }
}
