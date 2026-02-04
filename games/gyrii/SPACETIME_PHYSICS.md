# SpacetimeDB Physics API Reference

## 1. Creating a Physics World

```rust
#[reducer(init)]
pub fn example_init(ctx: &ReducerContext) {
    // Create a physics world with 60 Hz tick rate and Earth gravity
    let world = PhysicsWorld::builder()
        .ticks_per_second(60.0)
        .gravity(Vec3::new(0.0, -9.81, 0.0)) // Optional, defaults to earth gravity
        // More options: custom solver iterations, etc.
        .build()
        .insert(ctx);
}
```

## 2. Schedule Physics World Tick

`spacetime_physics` lets you control how and when the world should be stepped, allowing you to update kinematic bodies, perform post-processing after the physics world has been stepped, etc.

```rust
// 1. Create a new table to store the physics world ticks
#[table(name = physics_ticks, scheduled(physics_tick_world))]
pub struct PhysicsWorldTick {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub world_id: u64,
    pub scheduled_at: ScheduleAt,
}

// 2. Schedule the physics world to run at the specified tick rate

// 3. Implement the reducer that will be called when the physics world tick is processed
#[reducer]
pub fn physics_tick_world(ctx: &ReducerContext, tick: PhysicsWorldTick) {
    // Get the physics world by its id
    let world = ctx.db.physics_world().id().find(tick.world_id).unwrap();

    // You can have kinematic entities, which are entities that are not affected
    // by forces but can still interact with the physics world.
    // In this example player's positions are updated by the client directly, we
    // just need to synchronize their positions and rotations with the physics world.
    let kinematic_entities = ctx
        .db
        .players()
        .iter()
        .map(|c| (c.rigid_body_id, (c.position, c.rotation)));

    // Update the physics world and synchronize the kinematic entities positions
    // and rotations
    step_world(ctx, &world, kinematic_entities);

    // After the physics world has been stepped, you can perform post-processing
    // e.g. creating events for entities that entered or exited triggers,
    // raycasts hits, etc.
}
```

## 3. Adding Rigid Bodies

Types of rigid bodies:

- **Dynamic**: Affected by forces and constraints
- **Static**: Never move
- **Kinematic**: Driven by external inputs (e.g. player inputs)

```rust
// Start by creating a rigid body properties entity, this can be reused for
// multiple bodies (e.g. all players, all enemies)
// Most properties are optional, defaults are reasonable for most cases.
let rb_properties = RigidBodyProperties::builder()
    .mass(1.0) // mass in kg
    .restitution(0.3) // bounciness
    .build()
    .insert(ctx);

// Create a collider for the body and get its id, e.g. a sphere with radius 1.0,
// this can also be reused for multiple bodies
let collider = Collider::sphere(world.id, 1.0).insert(ctx).id;

// Now create the rigid body itself, this can be dynamic, static or kinematic
let rigid_body = RigidBody::builder()
    .position(Vec3::new(0.0, 10.0, 0.0)) // initial position
    .collider_id(collider) // the collider we created above
    .properties_id(rb_properties.id) // the properties we created above
    .body_type(RigidBodyType::Dynamic) // can be Dynamic, Static or Kinematic
    .build()
    .insert(ctx);
```

## 4. Adding Triggers

```rust
// Start by creating a collider for the trigger, this can be a cuboid, sphere, etc.
let collider = Collider::cuboid(world.id, Vec3::new(1.0, 1.0, 1.0)).insert(ctx).id;

// Now create the trigger itself, this can be used to detect when entities enter
// or exit the trigger volume
let trigger = Trigger::builder()
    .position(Vec3::new(0.0, 5.0, 0.0)) // position of the trigger
    .size(Vec3::new(2.0, 2.0, 2.0)) // size of the trigger volume
    .collider_id(collider.id) // collider shape
    .build()
    .insert(ctx);

// Each trigger has several properties for detection:
// - trigger.added_entities    // Entities that entered the trigger volume this tick
// - trigger.removed_entities  // Entities that exited the trigger volume this tick
// - trigger.entities_inside   // All entities currently in the trigger volume
```

## 5. Adding RayCasts

```rust
// Unlike rigid bodies and triggers, raycasts don't need anything else
// like a collider or properties.
let raycast = RayCast::new(
    world.id, // The world this raycast belongs to
    Vec3::new(0.0, 10.0, 0.0), // Start position of the ray
    Vec3::new(0.0, -1.0, 0.0), // Direction of the ray (normalized)
    100.0, // Length of the ray
    false, // Is the ray solid
).insert(ctx);

// Raycast properties for hit detection:
// - raycast.hits         // Entities that were hit by the ray this tick
// - raycast.added_hits   // Entities that were hit by the ray this tick
// - raycast.removed_hits // Entities that were no longer hit by the ray this tick
```

## Key API Patterns

1. **Builder Pattern**: Use `.builder()...build().insert(ctx)` for most entities
2. **Collider Helpers**: `Collider::sphere(world_id, radius)` and `Collider::cuboid(world_id, size)`
3. **Table Access**: `ctx.db.physics_world().id().find(world_id)` to query tables
4. **Insert Pattern**: All entities use `.insert(ctx)` to add to the database
