//! Trigger table - sensor volumes for detecting entity enter/exit

use bon::Builder;
use spacetimedb::{table, ReducerContext, Table};
use crate::math::{Vec3, Quat};

pub type TriggerId = u64;

/// A trigger (sensor) volume that detects when entities enter/exit
///
/// Triggers don't cause physical responses - they just track which
/// entities are inside them.
#[table(name = rapier_trigger, public)]
#[derive(Builder, Clone, Debug, PartialEq)]
#[builder(derive(Debug, Clone))]
pub struct Trigger {
    #[primary_key]
    #[auto_inc]
    #[builder(default = 0)]
    pub id: u64,

    /// Which physics world this trigger belongs to
    #[index(btree)]
    #[builder(default = 1)]
    pub world_id: u64,

    // Position
    #[builder(default = 0.0)]
    pub position_x: f32,
    #[builder(default = 0.0)]
    pub position_y: f32,
    #[builder(default = 0.0)]
    pub position_z: f32,

    // Rotation (quaternion)
    #[builder(default = 0.0)]
    pub rotation_x: f32,
    #[builder(default = 0.0)]
    pub rotation_y: f32,
    #[builder(default = 0.0)]
    pub rotation_z: f32,
    #[builder(default = 1.0)]
    pub rotation_w: f32,

    /// ID of the collider shape for this trigger
    pub collider_id: u64,

    /// IDs of entities currently inside this trigger
    #[builder(default)]
    pub entities_inside: Vec<u64>,

    /// IDs of entities that entered this trigger this tick
    #[builder(default)]
    pub added_entities: Vec<u64>,

    /// IDs of entities that left this trigger this tick
    #[builder(default)]
    pub removed_entities: Vec<u64>,

    /// Whether this trigger is currently enabled
    #[builder(default = true)]
    pub enabled: bool,
}

impl Default for Trigger {
    fn default() -> Self {
        Self {
            id: 0,
            world_id: 1,
            position_x: 0.0,
            position_y: 0.0,
            position_z: 0.0,
            rotation_x: 0.0,
            rotation_y: 0.0,
            rotation_z: 0.0,
            rotation_w: 1.0,
            collider_id: 0,
            entities_inside: Vec::new(),
            added_entities: Vec::new(),
            removed_entities: Vec::new(),
            enabled: true,
        }
    }
}

impl Trigger {
    /// Insert this trigger into the database
    pub fn insert(self, ctx: &ReducerContext) -> Self {
        ctx.db.rapier_trigger().insert(self)
    }

    /// Find a trigger by ID
    pub fn find(ctx: &ReducerContext, id: TriggerId) -> Option<Self> {
        ctx.db.rapier_trigger().id().find(id)
    }

    /// Get all triggers in a world
    pub fn all_in_world(ctx: &ReducerContext, world_id: u64) -> impl Iterator<Item = Self> + '_ {
        ctx.db.rapier_trigger().world_id().filter(world_id)
    }

    /// Update this trigger in the database
    pub fn update(self, ctx: &ReducerContext) -> Self {
        ctx.db.rapier_trigger().id().update(self)
    }

    /// Delete this trigger from the database
    pub fn delete(&self, ctx: &ReducerContext) {
        ctx.db.rapier_trigger().id().delete(self.id);
    }

    /// Get position as Vec3
    pub fn position(&self) -> Vec3 {
        Vec3::new(self.position_x, self.position_y, self.position_z)
    }

    /// Set position from Vec3
    pub fn set_position(&mut self, pos: Vec3) {
        self.position_x = pos.x;
        self.position_y = pos.y;
        self.position_z = pos.z;
    }

    /// Get rotation as Quat
    pub fn rotation(&self) -> Quat {
        Quat::new(self.rotation_x, self.rotation_y, self.rotation_z, self.rotation_w)
    }

    /// Set rotation from Quat
    pub fn set_rotation(&mut self, rot: Quat) {
        self.rotation_x = rot.x;
        self.rotation_y = rot.y;
        self.rotation_z = rot.z;
        self.rotation_w = rot.w;
    }

    /// Check if an entity is inside this trigger
    pub fn contains(&self, entity_id: u64) -> bool {
        self.entities_inside.contains(&entity_id)
    }

    /// Check if an entity just entered this trigger
    pub fn just_entered(&self, entity_id: u64) -> bool {
        self.added_entities.contains(&entity_id)
    }

    /// Check if an entity just left this trigger
    pub fn just_left(&self, entity_id: u64) -> bool {
        self.removed_entities.contains(&entity_id)
    }

    /// Clear the added/removed lists (called at start of each tick)
    pub fn clear_events(&mut self) {
        self.added_entities.clear();
        self.removed_entities.clear();
    }

    /// Update entity lists based on current intersection state
    pub fn update_entities(&mut self, current_inside: Vec<u64>) {
        // Find newly added entities
        self.added_entities = current_inside
            .iter()
            .filter(|id| !self.entities_inside.contains(id))
            .copied()
            .collect();

        // Find removed entities
        self.removed_entities = self.entities_inside
            .iter()
            .filter(|id| !current_inside.contains(id))
            .copied()
            .collect();

        // Update the main list
        self.entities_inside = current_inside;
    }
}
