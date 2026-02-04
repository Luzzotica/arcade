// Weapon definitions, shooting, and throwable reducers

use spacetimedb::{reducer, table, Identity, ReducerContext, Table};
use spacetime_rapier::{Collider, RigidBody, RigidBodyProperties, RigidBodyType, Trigger, RayCast, Vec3};

use crate::game::apply_damage;
use crate::player::{player, get_weapon_damage, get_weapon_fire_rate_ms, get_weapon_knockback, WeaponType};
use crate::lobby::lobby;

// Re-export table traits for other modules
pub use projectile::projectile;
pub use grenade::grenade;
pub use damage_zone::damage_zone;

// ============================================================================
// PROJECTILE TABLE (for Bazooka rockets)
// ============================================================================

#[derive(Clone)]
#[table(name = projectile, public)]
pub struct Projectile {
    #[primary_key]
    pub rigid_body_id: u64,
    pub owner_id: Identity,
    pub damage: f32,
    pub radius: f32,
    pub can_detonate: bool,
}

// ============================================================================
// GRENADE TABLE
// ============================================================================

#[derive(Clone)]
#[table(name = grenade, public)]
pub struct Grenade {
    #[primary_key]
    pub rigid_body_id: u64,
    pub owner_id: Identity,
    pub fuse_ticks: i32,
    pub damage: f32,
    pub radius: f32,
}

// ============================================================================
// DAMAGE ZONE TABLE (for Molotov fire)
// ============================================================================

#[derive(Clone)]
#[table(name = damage_zone, public)]
pub struct DamageZone {
    #[primary_key]
    pub trigger_id: u64,
    pub owner_id: Identity,
    pub damage_per_tick: i32,
    pub remaining_ticks: i32,
}

// ============================================================================
// SHOOTING REDUCERS
// ============================================================================

#[reducer]
pub fn shoot(ctx: &ReducerContext) -> Result<(), String> {
    let identity = ctx.sender;
    
    let player = ctx.db.player().identity().find(identity)
        .ok_or("Player not found")?;
    
    if !player.is_alive {
        return Err("Player is dead".to_string());
    }
    
    if player.ammo <= 0 {
        return Err("No ammo".to_string());
    }
    
    // Check fire rate
    let current_time = ctx.timestamp.to_micros_since_unix_epoch();
    let fire_rate = get_weapon_fire_rate_ms(player.weapon) * 1000; // convert to micros
    if current_time - player.last_shot_at < fire_rate {
        return Ok(()); // Too soon to fire
    }
    
    // Get lobby for physics world
    let lobby = ctx.db.lobby().id().find(player.lobby_id)
        .ok_or("Lobby not found")?;
    
    match player.weapon {
        WeaponType::Bazooka => {
            shoot_bazooka(ctx, &player, lobby.physics_world_id)?;
        }
        _ => {
            // Hitscan weapons
            shoot_hitscan(ctx, &player, lobby.physics_world_id)?;
        }
    }
    
    // Update player state
    let mut updated_player = player.clone();
    updated_player.ammo -= 1;
    updated_player.last_shot_at = current_time;
    ctx.db.player().identity().update(updated_player);
    
    Ok(())
}

fn shoot_hitscan(
    ctx: &ReducerContext,
    player: &crate::player::Player,
    world_id: u64,
) -> Result<(), String> {
    let aim_dir = Vec3::new(player.aim_x, 0.0, player.aim_z).normalize();
    let start_pos = Vec3::new(
        player.position_x + aim_dir.x * 0.6,
        player.position_y + 0.3,
        player.position_z + aim_dir.z * 0.6,
    );
    
    // Create raycast
    let raycast = RayCast::new(
        world_id,
        start_pos,
        aim_dir,
        100.0, // range
        false, // not solid
    ).insert(ctx);
    
    // Check hits (hits is a Vec of RayCastHit which has rigid_body_id)
    for hit in &raycast.hits {
        // Find player with this rigid body
        if let Some(hit_player) = ctx.db.player().iter().find(|p| p.rigid_body_id == hit.rigid_body_id) {
            if hit_player.identity != player.identity {
                let damage = get_weapon_damage(player.weapon);
                apply_damage(ctx, hit_player.identity, damage, player.identity);
                
                // Apply knockback
                let knockback = get_weapon_knockback(player.weapon);
                if let Some(mut target) = ctx.db.player().identity().find(hit_player.identity) {
                    target.position_x += aim_dir.x * knockback;
                    target.position_z += aim_dir.z * knockback;
                    ctx.db.player().identity().update(target);
                }
            }
        }
    }
    
    // Clean up raycast (single use)
    raycast.delete(ctx);
    
    // Apply recoil to shooter
    let recoil = get_weapon_knockback(player.weapon) * 0.1;
    if let Some(mut shooter) = ctx.db.player().identity().find(player.identity) {
        shooter.position_x -= aim_dir.x * recoil;
        shooter.position_z -= aim_dir.z * recoil;
        ctx.db.player().identity().update(shooter);
    }
    
    Ok(())
}

fn shoot_bazooka(
    ctx: &ReducerContext,
    player: &crate::player::Player,
    world_id: u64,
) -> Result<(), String> {
    let aim_dir = Vec3::new(player.aim_x, 0.0, player.aim_z).normalize();
    let start_pos = Vec3::new(
        player.position_x + aim_dir.x * 0.8,
        player.position_y + 0.4,
        player.position_z + aim_dir.z * 0.8,
    );
    
    // Rocket velocity
    let speed = 20.0;
    let velocity = Vec3::new(aim_dir.x * speed, 0.0, aim_dir.z * speed);
    
    // Create rocket rigid body properties
    let rb_props = RigidBodyProperties::builder()
        .world_id(world_id)
        .mass(0.5)
        .restitution(0.0) // no bounce
        .build()
        .insert(ctx);
    
    // Create sphere collider for rocket
    let collider = Collider::ball(world_id, 0.2).insert(ctx);
    
    // Create dynamic rigid body
    let rocket_rb = RigidBody::builder()
        .world_id(world_id)
        .position_x(start_pos.x)
        .position_y(start_pos.y)
        .position_z(start_pos.z)
        .linear_velocity_x(velocity.x)
        .linear_velocity_y(velocity.y)
        .linear_velocity_z(velocity.z)
        .collider_id(collider.id)
        .properties_id(rb_props.id)
        .body_type(RigidBodyType::Dynamic)
        .build()
        .insert(ctx);
    
    // Create projectile entity
    ctx.db.projectile().insert(Projectile {
        rigid_body_id: rocket_rb.id,
        owner_id: player.identity,
        damage: 80.0,
        radius: 5.0,
        can_detonate: true,
    });
    
    // Apply recoil
    let recoil = get_weapon_knockback(WeaponType::Bazooka) * 0.2;
    if let Some(mut shooter) = ctx.db.player().identity().find(player.identity) {
        shooter.position_x -= aim_dir.x * recoil;
        shooter.position_z -= aim_dir.z * recoil;
        ctx.db.player().identity().update(shooter);
    }
    
    Ok(())
}

#[reducer]
pub fn detonate_rocket(ctx: &ReducerContext) -> Result<(), String> {
    let identity = ctx.sender;
    
    // Find the player's rocket
    let rocket = ctx.db.projectile().iter()
        .find(|p| p.owner_id == identity && p.can_detonate)
        .ok_or("No detonatable rocket found")?
        .clone();
    
    // Get rocket position
    let rb = RigidBody::find(ctx, rocket.rigid_body_id)
        .ok_or("Rocket rigid body not found")?;
    
    // Apply explosion damage
    crate::game::apply_explosion_damage(ctx, rb.position(), rocket.damage, rocket.radius, identity);
    
    // Clean up
    ctx.db.projectile().rigid_body_id().delete(rocket.rigid_body_id);
    rb.delete(ctx);
    
    Ok(())
}

// ============================================================================
// THROWABLE REDUCERS
// ============================================================================

#[reducer]
pub fn throw_grenade(ctx: &ReducerContext, aim_x: f32, aim_z: f32) -> Result<(), String> {
    let identity = ctx.sender;
    
    let player = ctx.db.player().identity().find(identity)
        .ok_or("Player not found")?;
    
    if !player.is_alive {
        return Err("Player is dead".to_string());
    }
    
    if player.grenades <= 0 {
        return Err("No grenades".to_string());
    }
    
    let lobby = ctx.db.lobby().id().find(player.lobby_id)
        .ok_or("Lobby not found")?;
    
    // Calculate throw direction and velocity
    let aim_dir = Vec3::new(aim_x, 0.0, aim_z).normalize();
    let throw_power = 12.0;
    let arc_height = 5.0;
    
    let velocity = Vec3::new(
        aim_dir.x * throw_power,
        arc_height, // upward for arc
        aim_dir.z * throw_power,
    );
    
    let start_pos = Vec3::new(
        player.position_x + aim_dir.x * 0.5,
        player.position_y + 0.5, // throw from chest height
        player.position_z + aim_dir.z * 0.5,
    );
    
    // Create grenade rigid body properties (bouncy!)
    let rb_props = RigidBodyProperties::builder()
        .world_id(lobby.physics_world_id)
        .mass(0.3)
        .restitution(0.5) // bouncy
        .build()
        .insert(ctx);
    
    // Create sphere collider
    let collider = Collider::ball(lobby.physics_world_id, 0.15).insert(ctx);
    
    // Create dynamic rigid body with initial velocity
    let grenade_rb = RigidBody::builder()
        .world_id(lobby.physics_world_id)
        .position_x(start_pos.x)
        .position_y(start_pos.y)
        .position_z(start_pos.z)
        .linear_velocity_x(velocity.x)
        .linear_velocity_y(velocity.y)
        .linear_velocity_z(velocity.z)
        .collider_id(collider.id)
        .properties_id(rb_props.id)
        .body_type(RigidBodyType::Dynamic)
        .build()
        .insert(ctx);
    
    // Create grenade entity with fuse timer
    ctx.db.grenade().insert(Grenade {
        rigid_body_id: grenade_rb.id,
        owner_id: identity,
        fuse_ticks: 180, // 3 seconds at 60 Hz
        damage: 70.0,
        radius: 5.0,
    });
    
    // Update player grenade count
    let mut updated_player = player.clone();
    updated_player.grenades -= 1;
    ctx.db.player().identity().update(updated_player);
    
    log::info!("Grenade thrown by {:?}", identity);
    Ok(())
}

#[reducer]
pub fn throw_molotov(ctx: &ReducerContext, aim_x: f32, aim_z: f32) -> Result<(), String> {
    let identity = ctx.sender;
    
    let player = ctx.db.player().identity().find(identity)
        .ok_or("Player not found")?;
    
    if !player.is_alive {
        return Err("Player is dead".to_string());
    }
    
    if player.molotovs <= 0 {
        return Err("No molotovs".to_string());
    }
    
    let lobby = ctx.db.lobby().id().find(player.lobby_id)
        .ok_or("Lobby not found")?;
    
    // Calculate throw direction
    let aim_dir = Vec3::new(aim_x, 0.0, aim_z).normalize();
    let throw_power = 10.0;
    
    // Target position (where molotov lands)
    let target_pos = Vec3::new(
        player.position_x + aim_dir.x * throw_power,
        0.1, // ground level
        player.position_z + aim_dir.z * throw_power,
    );
    
    // Create trigger collider (cuboid for fire zone)
    let collider = Collider::cuboid(
        lobby.physics_world_id,
        Vec3::new(4.0, 1.0, 4.0), // fire zone size (half-extents)
    ).insert(ctx);
    
    // Create trigger for damage zone
    let trigger = Trigger::builder()
        .world_id(lobby.physics_world_id)
        .position_x(target_pos.x)
        .position_y(target_pos.y)
        .position_z(target_pos.z)
        .collider_id(collider.id)
        .build()
        .insert(ctx);
    
    // Create damage zone
    ctx.db.damage_zone().insert(DamageZone {
        trigger_id: trigger.id,
        owner_id: identity,
        damage_per_tick: 2, // ~120 damage per second at 60 Hz
        remaining_ticks: 300, // 5 seconds
    });
    
    // Update player molotov count
    let mut updated_player = player.clone();
    updated_player.molotovs -= 1;
    ctx.db.player().identity().update(updated_player);
    
    log::info!("Molotov thrown by {:?}", identity);
    Ok(())
}

// ============================================================================
// SECONDARY ABILITY REDUCERS
// ============================================================================

#[reducer]
pub fn use_secondary(ctx: &ReducerContext) -> Result<(), String> {
    let identity = ctx.sender;
    
    let player = ctx.db.player().identity().find(identity)
        .ok_or("Player not found")?;
    
    if !player.is_alive {
        return Err("Player is dead".to_string());
    }
    
    match player.secondary {
        crate::player::SecondaryType::PopupKnives => {
            use_popup_knives(ctx, &player)?;
        }
        crate::player::SecondaryType::BubbleShield => {
            // TODO: Implement bubble shield (reduce damage for X seconds)
        }
        crate::player::SecondaryType::SelfDestructNuke => {
            use_self_destruct(ctx, &player)?;
        }
    }
    
    Ok(())
}

fn use_popup_knives(ctx: &ReducerContext, player: &crate::player::Player) -> Result<(), String> {
    let knife_range = 2.0;
    let knife_damage = 50;
    
    // Damage all nearby enemies
    for other in ctx.db.player().iter() {
        if other.identity == player.identity || !other.is_alive {
            continue;
        }
        
        let dx = other.position_x - player.position_x;
        let dz = other.position_z - player.position_z;
        let distance = (dx * dx + dz * dz).sqrt();
        
        if distance <= knife_range {
            apply_damage(ctx, other.identity, knife_damage, player.identity);
        }
    }
    
    Ok(())
}

fn use_self_destruct(ctx: &ReducerContext, player: &crate::player::Player) -> Result<(), String> {
    // TODO: Add countdown timer, for now instant explosion
    let nuke_damage = 200.0;
    let nuke_radius = 10.0;
    
    crate::game::apply_explosion_damage(
        ctx,
        player.position(),
        nuke_damage,
        nuke_radius,
        player.identity,
    );
    
    // Kill self
    apply_damage(ctx, player.identity, 999, player.identity);
    
    Ok(())
}
