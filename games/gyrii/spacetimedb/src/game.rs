// Game state, physics tick, and damage processing

use spacetimedb::{reducer, table, Identity, ReducerContext, ScheduleAt, SpacetimeType, Table, Timestamp};
use spacetime_rapier::{step_world, PhysicsWorld, RigidBody, Trigger, Vec3, Quat};

// Import table traits for database access
use crate::player::{player, Player};
use crate::weapons::{grenade, damage_zone, Grenade};

// ============================================================================
// GAME CONFIG
// ============================================================================

#[table(name = game_config, public)]
pub struct GameConfig {
    #[primary_key]
    pub id: u64,
    pub respawn_time_ms: u64,
    pub default_health: i32,
    pub default_max_ammo: i32,
}

// ============================================================================
// PHYSICS TICK TIMER (Scheduled Reducer)
// ============================================================================

#[table(name = physics_tick_timer, scheduled(physics_tick))]
pub struct PhysicsTickTimer {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
    pub world_id: u64,
}

// ============================================================================
// KILL EVENTS
// ============================================================================

#[table(name = kill_event, public)]
pub struct KillEvent {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub killer_id: Identity,
    pub victim_id: Identity,
    pub weapon_type: String,
    pub timestamp: Timestamp,
}

// ============================================================================
// GAME STATE
// ============================================================================

#[derive(Clone, Copy, PartialEq, Eq, Debug, SpacetimeType)]
pub enum GameState {
    Waiting,
    Starting,
    InProgress,
    Ended,
}

// ============================================================================
// PHYSICS TICK REDUCER
// ============================================================================

#[reducer]
pub fn physics_tick(ctx: &ReducerContext, timer: PhysicsTickTimer) -> Result<(), String> {
    // Get the physics world
    let world = match PhysicsWorld::find(ctx, timer.world_id) {
        Some(w) => w,
        None => return Ok(()), // World was deleted, stop ticking
    };

    // Collect kinematic entities (players) - sync their positions with physics
    let kinematic_entities = ctx
        .db
        .player()
        .iter()
        .filter(|p| p.rigid_body_id > 0)
        .map(|p| {
            let pos = Vec3::new(p.position_x, p.position_y, p.position_z);
            let rotation = Quat::IDENTITY;
            (p.rigid_body_id, (pos, rotation))
        });

    // Step the physics simulation
    step_world(ctx, &world, kinematic_entities);

    // Process game logic
    process_grenades(ctx);
    process_damage_zones(ctx);
    process_respawns(ctx);

    // Schedule next tick (60 Hz = ~16.667ms)
    schedule_physics_tick(ctx, timer.world_id);

    Ok(())
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

pub fn schedule_physics_tick(ctx: &ReducerContext, world_id: u64) {
    let current_micros = ctx.timestamp.to_micros_since_unix_epoch();
    let next_tick_micros = current_micros + 16667; // ~60Hz
    
    ctx.db.physics_tick_timer().insert(PhysicsTickTimer {
        scheduled_id: 0, // auto_inc
        scheduled_at: ScheduleAt::Time(Timestamp::UNIX_EPOCH + std::time::Duration::from_micros(next_tick_micros as u64)),
        world_id,
    });
}

fn process_grenades(ctx: &ReducerContext) {
    let grenades_to_explode: Vec<Grenade> = ctx
        .db
        .grenade()
        .iter()
        .filter(|g| g.fuse_ticks <= 0)
        .collect();

    for grenade in grenades_to_explode {
        // Get grenade position from rigid body
        if let Some(rb) = RigidBody::find(ctx, grenade.rigid_body_id) {
            let position = rb.position();
            // Apply explosion damage to nearby players
            apply_explosion_damage(ctx, position, grenade.damage, grenade.radius, grenade.owner_id);
        }

        // Remove grenade and its physics body
        ctx.db.grenade().rigid_body_id().delete(grenade.rigid_body_id);
        if let Some(rb) = RigidBody::find(ctx, grenade.rigid_body_id) {
            rb.delete(ctx);
        }
    }

    // Decrement fuse on remaining grenades
    for grenade in ctx.db.grenade().iter() {
        if grenade.fuse_ticks > 0 {
            let mut updated = grenade.clone();
            updated.fuse_ticks -= 1;
            ctx.db.grenade().rigid_body_id().update(updated);
        }
    }
}

fn process_damage_zones(ctx: &ReducerContext) {
    let zones_to_remove: Vec<u64> = ctx
        .db
        .damage_zone()
        .iter()
        .filter(|z| z.remaining_ticks <= 0)
        .map(|z| z.trigger_id)
        .collect();

    // Remove expired zones
    for trigger_id in zones_to_remove {
        ctx.db.damage_zone().trigger_id().delete(trigger_id);
        if let Some(trigger) = Trigger::find(ctx, trigger_id) {
            trigger.delete(ctx);
        }
    }

    // Apply damage from active zones and decrement ticks
    for zone in ctx.db.damage_zone().iter() {
        if zone.remaining_ticks > 0 {
            // Get trigger to find entities inside
            if let Some(trigger) = Trigger::find(ctx, zone.trigger_id) {
                // Apply damage to all players inside the trigger
                for entity_id in &trigger.entities_inside {
                    // Find player with this rigid body
                    if let Some(player) = ctx.db.player().iter().find(|p| p.rigid_body_id == *entity_id) {
                        apply_damage(ctx, player.identity, zone.damage_per_tick, zone.owner_id);
                    }
                }
            }

            // Decrement remaining ticks
            let mut updated = zone.clone();
            updated.remaining_ticks -= 1;
            ctx.db.damage_zone().trigger_id().update(updated);
        }
    }
}

fn process_respawns(ctx: &ReducerContext) {
    let current_time = ctx.timestamp.to_micros_since_unix_epoch();
    
    let players_to_respawn: Vec<Player> = ctx
        .db
        .player()
        .iter()
        .filter(|p| p.respawn_at > 0 && current_time >= p.respawn_at)
        .collect();

    for player in players_to_respawn {
        let mut updated = player.clone();
        updated.health = 100;
        updated.is_alive = true;
        updated.respawn_at = 0;
        // Reset position to spawn point
        let spawn_pos = crate::maps::get_spawn_position(crate::maps::MapId::Arena, updated.team as usize);
        updated.position_x = spawn_pos.x;
        updated.position_y = spawn_pos.y;
        updated.position_z = spawn_pos.z;
        ctx.db.player().identity().update(updated);
    }
}

pub fn apply_explosion_damage(
    ctx: &ReducerContext,
    center: Vec3,
    max_damage: f32,
    radius: f32,
    source_id: Identity,
) {
    for player in ctx.db.player().iter() {
        if !player.is_alive {
            continue;
        }

        let dx = player.position_x - center.x;
        let dy = player.position_y - center.y;
        let dz = player.position_z - center.z;
        let distance = (dx * dx + dy * dy + dz * dz).sqrt();

        if distance < radius {
            // Damage falls off with distance
            let damage_multiplier = 1.0 - (distance / radius);
            let damage = (max_damage * damage_multiplier) as i32;
            apply_damage(ctx, player.identity, damage, source_id);
        }
    }
}

pub fn apply_damage(ctx: &ReducerContext, target_id: Identity, damage: i32, source_id: Identity) {
    if let Some(mut player) = ctx.db.player().identity().find(target_id) {
        if !player.is_alive {
            return;
        }

        player.health -= damage;

        if player.health <= 0 {
            player.health = 0;
            player.is_alive = false;
            player.deaths += 1;
            
            // Set respawn time
            let config = ctx.db.game_config().id().find(0).unwrap_or(GameConfig {
                id: 0,
                respawn_time_ms: 3000,
                default_health: 100,
                default_max_ammo: 30,
            });
            player.respawn_at = ctx.timestamp.to_micros_since_unix_epoch() + (config.respawn_time_ms * 1000) as i64;

            // Record kill
            if source_id != target_id {
                if let Some(mut killer) = ctx.db.player().identity().find(source_id) {
                    killer.kills += 1;
                    ctx.db.player().identity().update(killer);
                }

                ctx.db.kill_event().insert(KillEvent {
                    id: 0,
                    killer_id: source_id,
                    victim_id: target_id,
                    weapon_type: "unknown".to_string(),
                    timestamp: ctx.timestamp,
                });
            }
        }

        ctx.db.player().identity().update(player);
    }
}

// ============================================================================
// INIT REDUCER
// ============================================================================

#[reducer(init)]
pub fn init(ctx: &ReducerContext) {
    // Create default game config
    ctx.db.game_config().insert(GameConfig {
        id: 0,
        respawn_time_ms: 3000,
        default_health: 100,
        default_max_ammo: 30,
    });

    log::info!("Gyrii server initialized!");
}
