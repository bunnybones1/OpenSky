pub use crate::auras::{aura_order, AuraLayer};
pub use crate::card::{AttackState, ModifierExpiry, ModifyPowerReason, StoredCard};
pub use crate::effects::{Effect, EffectType};
pub use crate::extensions::*;
pub use crate::library::{AttackRestriction, SerializableFilter};
pub use crate::saturating_u8::SaturatingU8;
pub use crate::utils::FirstLast;
pub use crate::*;
pub use card_movement_simulator::{
  Card, CardInfo, CardInstance, CardLocation, GameState, InstanceID, Player, PlayerSecret, Zone,
};
pub use indexmap::{indexset, IndexSet};
pub use itertools::Itertools;
pub use lazy_static::lazy_static;
pub use rand::{seq::IteratorRandom, seq::SliceRandom, Rng};
pub use std::{
  convert::{TryFrom, TryInto},
  rc::Rc,
};
pub use strum::IntoEnumIterator;
pub fn is_on_field_not_silenced(zone: Zone, card: &CardAttributes) -> bool {
  zone.is_field() && !card.is_silenced
}
pub fn is_in_casting(zone: Zone, _card: &CardAttributes) -> bool {
  zone.is_casting()
}
pub fn is_in_hero_ability(zone: Zone, _card: &CardAttributes) -> bool {
  zone.is_hero_ability()
}

// Targeting for does_target
#[allow(dead_code)]
pub mod targets {
  use super::*;
  pub fn any_unit(
    game: &card_movement_simulator::GameState<SkyWeaver>,
    _: &card_movement_simulator::PlayerSecret<SkyWeaver>,
    _: Player,
    _: InstanceID,
    target: InstanceID,
  ) -> bool {
    target
      .instance(game, None)
      .expect("Targets must always be public")
      .is_unit()
  }

  pub fn any_hero(
    game: &card_movement_simulator::GameState<SkyWeaver>,
    _: &card_movement_simulator::PlayerSecret<SkyWeaver>,
    _: Player,
    _: InstanceID,
    target: InstanceID,
  ) -> bool {
    target
      .instance(game, None)
      .expect("Targets must always be public")
      .is_hero()
  }

  pub fn is_sleeping(
    game: &card_movement_simulator::GameState<SkyWeaver>,
    _: &card_movement_simulator::PlayerSecret<SkyWeaver>,
    _: Player,
    _: InstanceID,
    target: InstanceID,
  ) -> bool {
    target
      .instance(game, None)
      .expect("Targets must always be public")
      .attack_state
      == AttackState::Sleeping
  }

  pub fn enemy_unit(
    game: &card_movement_simulator::GameState<SkyWeaver>,
    _: &card_movement_simulator::PlayerSecret<SkyWeaver>,
    player: Player,
    _: InstanceID,
    target: InstanceID,
  ) -> bool {
    target
      .instance(game, None)
      .expect("Targets must always be public")
      .is_unit()
      && game.owner(target) != player
  }

  pub fn ally_unit(
    game: &card_movement_simulator::GameState<SkyWeaver>,
    _: &card_movement_simulator::PlayerSecret<SkyWeaver>,
    player: Player,
    _: InstanceID,
    target: InstanceID,
  ) -> bool {
    target
      .instance(game, None)
      .expect("Targets must always be public")
      .is_unit()
      && game.owner(target) == player
  }

  pub fn any_target(
    _: &card_movement_simulator::GameState<SkyWeaver>,
    _: &card_movement_simulator::PlayerSecret<SkyWeaver>,
    _: Player,
    _: InstanceID,
    _: InstanceID,
  ) -> bool {
    true
  }

  pub fn enemy(
    game: &card_movement_simulator::GameState<SkyWeaver>,
    _: &card_movement_simulator::PlayerSecret<SkyWeaver>,
    player: Player,
    _: InstanceID,
    target: InstanceID,
  ) -> bool {
    game.owner(target) != player
  }

  pub fn ally(
    game: &card_movement_simulator::GameState<SkyWeaver>,
    _: &card_movement_simulator::PlayerSecret<SkyWeaver>,
    player: Player,
    _: InstanceID,
    target: InstanceID,
  ) -> bool {
    game.owner(target) == player
  }

  pub fn front_or_back_enemy(
    game: &card_movement_simulator::GameState<SkyWeaver>,
    _: &card_movement_simulator::PlayerSecret<SkyWeaver>,
    player: Player,
    _: InstanceID,
    target: InstanceID,
  ) -> bool {
    let owner = game.owner(target);
    owner != player
      && game
        .player_cards(owner)
        .field()
        .iter()
        .first_last()
        .any(|id| *id == target)
  }
}

pub mod conditions {
  use super::*;
  pub fn has_another_card_in_hand(
    game: &card_movement_simulator::GameState<SkyWeaver>,
    _: &card_movement_simulator::PlayerSecret<SkyWeaver>,
    id: InstanceID,
    player: Player,
  ) -> bool {
    let my_zone = game.location(id);
    let is_this_card_in_hand = matches!(
      my_zone.location,
      None | Some((Zone::Hand { public: true }, _))
    );
    let required_hand_count = if is_this_card_in_hand { 2 } else { 1 };
    game.player_cards(player).hand().len() >= required_hand_count
  }
}

pub fn is_wisp(base: &BaseCard) -> bool {
  let wisps = [
    BaseCard::C2136,
    BaseCard::C2139,
    BaseCard::C2142,
    BaseCard::C2143,
    BaseCard::C2145,
    BaseCard::C2147,
    BaseCard::C2150,
    BaseCard::C2151,
  ];
  wisps.contains(base)
}
pub fn is_scion(base: &BaseCard) -> bool {
  let scions = [
    BaseCard::C2137,
    BaseCard::C2140,
    BaseCard::C2141,
    BaseCard::C2144,
    BaseCard::C2146,
    BaseCard::C2148,
    BaseCard::C2149,
    BaseCard::C2152,
  ];
  scions.contains(base)
}
pub fn is_shroom(base: &BaseCard) -> bool {
  let shrooms = [
    BaseCard::C3166,
    BaseCard::C3000,
    BaseCard::C3107,
    BaseCard::C3102,
    BaseCard::C3037,
    BaseCard::C3098,
    BaseCard::C3123,
    BaseCard::C3010,
  ];
  shrooms.contains(base)
}
pub const BLADES: [BaseCard; 8] = [
  BaseCard::C37,
  BaseCard::C82,
  BaseCard::C87,
  BaseCard::C132,
  BaseCard::C182,
  BaseCard::C183,
  BaseCard::C1000,
  BaseCard::C1027,
];
pub fn is_blade(base: &BaseCard) -> bool {
  BLADES.contains(base)
}
