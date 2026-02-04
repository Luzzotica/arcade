//! RayCast table - persistent raycasts for collision detection

use bon::Builder;
use spacetimedb::{table, ReducerContext, SpacetimeType, Table};
use crate::math::Vec3;

#[cfg(feature = "dim2")]
use crate::math::Vec2;

pub type RayCastId = u64;

/// A raycast hit result
#[derive(SpacetimeType, Clone, Copy, Debug, PartialEq, Default)]
pub struct RayCastHit {
    /// ID of the rigid body that was hit
    pub rigid_body_id: u64,
    /// Distance along the ray to the hit point
    pub distance: f32,
    /// Hit point X
    pub point_x: f32,
    /// Hit point Y
    pub point_y: f32,
    /// Hit point Z
    pub point_z: f32,
    /// Surface normal X at hit point
    pub normal_x: f32,
    /// Surface normal Y at hit point
    pub normal_y: f32,
    /// Surface normal Z at hit point
    pub normal_z: f32,
}

impl RayCastHit {
    /// Create a new raycast hit
    pub fn new(rigid_body_id: u64, distance: f32, point: Vec3, normal: Vec3) -> Self {
        Self {
            rigid_body_id,
            distance,
            point_x: point.x,
            point_y: point.y,
            point_z: point.z,
            normal_x: normal.x,
            normal_y: normal.y,
            normal_z: normal.z,
        }
    }

    /// Get hit point as Vec3
    pub fn point(&self) -> Vec3 {
        Vec3::new(self.point_x, self.point_y, self.point_z)
    }

    /// Get surface normal as Vec3
    pub fn normal(&self) -> Vec3 {
        Vec3::new(self.normal_x, self.normal_y, self.normal_z)
    }

    #[cfg(feature = "dim2")]
    pub fn point_2d(&self) -> Vec2 {
        Vec2::new(self.point_x, self.point_y)
    }

    #[cfg(feature = "dim2")]
    pub fn normal_2d(&self) -> Vec2 {
        Vec2::new(self.normal_x, self.normal_y)
    }
}

/// A persistent raycast that is checked every physics tick
#[table(name = rapier_raycast, public)]
#[derive(Builder, Clone, Debug, PartialEq)]
#[builder(derive(Debug, Clone))]
pub struct RayCast {
    #[primary_key]
    #[auto_inc]
    #[builder(default = 0)]
    pub id: u64,

    /// Which physics world this raycast belongs to
    #[index(btree)]
    #[builder(default = 1)]
    pub world_id: u64,

    // Origin point
    #[builder(default = 0.0)]
    pub origin_x: f32,
    #[builder(default = 0.0)]
    pub origin_y: f32,
    #[builder(default = 0.0)]
    pub origin_z: f32,

    // Direction (should be normalized)
    #[builder(default = 0.0)]
    pub direction_x: f32,
    #[builder(default = -1.0)]
    pub direction_y: f32,
    #[builder(default = 0.0)]
    pub direction_z: f32,

    /// Maximum distance for the ray
    #[builder(default = 100.0)]
    pub max_distance: f32,

    /// If true, ray starts from inside shapes (solid), if false, only surface hits
    #[builder(default = false)]
    pub solid: bool,

    /// All current hits (sorted by distance)
    #[builder(default)]
    pub hits: Vec<RayCastHit>,

    /// Hits that were added this tick
    #[builder(default)]
    pub added_hits: Vec<RayCastHit>,

    /// Hits that were removed this tick
    #[builder(default)]
    pub removed_hits: Vec<RayCastHit>,

    /// Whether this raycast is currently enabled
    #[builder(default = true)]
    pub enabled: bool,
}

impl Default for RayCast {
    fn default() -> Self {
        Self {
            id: 0,
            world_id: 1,
            origin_x: 0.0,
            origin_y: 0.0,
            origin_z: 0.0,
            direction_x: 0.0,
            direction_y: -1.0,
            direction_z: 0.0,
            max_distance: 100.0,
            solid: false,
            hits: Vec::new(),
            added_hits: Vec::new(),
            removed_hits: Vec::new(),
            enabled: true,
        }
    }
}

impl RayCast {
    /// Create a new raycast
    pub fn new(world_id: u64, origin: Vec3, direction: Vec3, max_distance: f32, solid: bool) -> Self {
        Self {
            id: 0,
            world_id,
            origin_x: origin.x,
            origin_y: origin.y,
            origin_z: origin.z,
            direction_x: direction.x,
            direction_y: direction.y,
            direction_z: direction.z,
            max_distance,
            solid,
            ..Default::default()
        }
    }

    /// Insert this raycast into the database
    pub fn insert(self, ctx: &ReducerContext) -> Self {
        ctx.db.rapier_raycast().insert(self)
    }

    /// Find a raycast by ID
    pub fn find(ctx: &ReducerContext, id: RayCastId) -> Option<Self> {
        ctx.db.rapier_raycast().id().find(id)
    }

    /// Get all raycasts in a world
    pub fn all_in_world(ctx: &ReducerContext, world_id: u64) -> impl Iterator<Item = Self> + '_ {
        ctx.db.rapier_raycast().world_id().filter(world_id)
    }

    /// Update this raycast in the database
    pub fn update(self, ctx: &ReducerContext) -> Self {
        ctx.db.rapier_raycast().id().update(self)
    }

    /// Delete this raycast from the database
    pub fn delete(&self, ctx: &ReducerContext) {
        ctx.db.rapier_raycast().id().delete(self.id);
    }

    /// Get origin as Vec3
    pub fn origin(&self) -> Vec3 {
        Vec3::new(self.origin_x, self.origin_y, self.origin_z)
    }

    /// Set origin from Vec3
    pub fn set_origin(&mut self, origin: Vec3) {
        self.origin_x = origin.x;
        self.origin_y = origin.y;
        self.origin_z = origin.z;
    }

    /// Get direction as Vec3
    pub fn direction(&self) -> Vec3 {
        Vec3::new(self.direction_x, self.direction_y, self.direction_z)
    }

    /// Set direction from Vec3
    pub fn set_direction(&mut self, direction: Vec3) {
        self.direction_x = direction.x;
        self.direction_y = direction.y;
        self.direction_z = direction.z;
    }

    /// Get the first (closest) hit, if any
    pub fn first_hit(&self) -> Option<&RayCastHit> {
        self.hits.first()
    }

    /// Check if the ray hit anything
    pub fn has_hit(&self) -> bool {
        !self.hits.is_empty()
    }

    /// Clear the added/removed lists (called at start of each tick)
    pub fn clear_events(&mut self) {
        self.added_hits.clear();
        self.removed_hits.clear();
    }

    /// Update hits based on current raycast results
    pub fn update_hits(&mut self, current_hits: Vec<RayCastHit>) {
        // Find newly added hits
        self.added_hits = current_hits
            .iter()
            .filter(|h| !self.hits.iter().any(|existing| existing.rigid_body_id == h.rigid_body_id))
            .cloned()
            .collect();

        // Find removed hits
        self.removed_hits = self.hits
            .iter()
            .filter(|h| !current_hits.iter().any(|current| current.rigid_body_id == h.rigid_body_id))
            .cloned()
            .collect();

        // Update the main list
        self.hits = current_hits;
    }

    // 2D helpers
    #[cfg(feature = "dim2")]
    pub fn new_2d(world_id: u64, origin: Vec2, direction: Vec2, max_distance: f32, solid: bool) -> Self {
        Self::new(
            world_id,
            Vec3::new(origin.x, origin.y, 0.0),
            Vec3::new(direction.x, direction.y, 0.0),
            max_distance,
            solid,
        )
    }

    #[cfg(feature = "dim2")]
    pub fn origin_2d(&self) -> Vec2 {
        Vec2::new(self.origin_x, self.origin_y)
    }

    #[cfg(feature = "dim2")]
    pub fn direction_2d(&self) -> Vec2 {
        Vec2::new(self.direction_x, self.direction_y)
    }
}
