// Gyrii - Multiplayer Ball Shooter Server Module
// Built with SpacetimeDB and spacetime_rapier

#![feature(import_trait_associated_functions)]
#![allow(hidden_glob_reexports)]

mod game;
mod player;
mod weapons;
mod lobby;
mod maps;

pub use game::*;
pub use player::*;
pub use weapons::*;
pub use lobby::*;
pub use maps::*;
