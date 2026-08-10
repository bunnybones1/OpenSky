#[cfg(feature = "bindings")]
use wasm_bindgen::prelude::*;

use crate::card_effects::effect_helpers::{is_scion, is_shroom, is_wisp};
use crate::{
  card::{CardAttributes, CardState},
  card_effects,
  effects::Effect,
  model::{Element, Prism, Rarity, Trait, Type},
};
use card_movement_simulator::CardInfo;
use indexmap::indexset;
use serde::{Deserialize, Serialize};
use std::convert::TryFrom;
use strum_macros::EnumIter;

include!(concat!(env!("OUT_DIR"), "/card_library.rs"));

impl card_movement_simulator::BaseCard for BaseCard {
  type CardState = CardState;
  fn new_card_state(&self, parent: Option<&Self::CardState>) -> Self::CardState {
    let rarity = parent.map_or(Rarity::Base, |p| p.rarity);
    CardState::new(*self, rarity)
  }

  fn attachment(&self) -> Option<BaseCard> {
    self.attached_spell()
  }
  fn reset_card(&self, old_card: &Self::CardState) -> Self::CardState {
    self.new_card_state(Some(old_card))
  }
}

pub fn is_armis_guard(base: BaseCard) -> bool {
  matches!(base, BaseCard::C20001 | BaseCard::C20066)
}

pub fn is_zomboid(base: BaseCard) -> bool {
  matches!(base, BaseCard::C20013 | BaseCard::C20065)
}
