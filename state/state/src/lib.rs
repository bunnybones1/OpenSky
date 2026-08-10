#![deny(warnings)]

mod utils;
// utils must be first since it provides macros
mod auras;
mod card;
mod card_effects;
pub mod client;
mod effect_macros;
mod effects;
mod extensions;
mod field_order;
mod game;
mod library;
mod live_game;
mod model;
mod phase;
mod player_action;
mod run_test;
pub mod saturating_u8;
mod tavern_mode;
mod version;

pub use card::{AttackState, CardAttributes, CardState, Modifier, TemporaryModifier};
pub use card_movement_simulator;
pub use card_movement_simulator::Player;
pub use effects::*;
pub use extensions::*;
pub use game::*;
pub use library::*;
pub use live_game::LiveGame;
pub use model::*;
pub use phase::*;
pub use player_action::{validate_player_action, Cheat, PlayerAction};
pub use run_test::*;
pub use tavern_mode::TavernMode;
pub use utils::*;

#[cfg(test)]
mod tests;

#[cfg(feature = "bindings")]
card_movement_simulator::bind!(SkyWeaver);
