use crate::{game::SkyWeaver, model::Trait};
use card_movement_simulator::CardInfo;

#[derive(PartialEq, Eq, PartialOrd, Ord)]
pub enum FieldOrder {
  Regular = 0,
  Stealth = 1,
  Hero = 2,
  Guard = 3,
}
impl FieldOrder {
  pub fn for_card(card: &CardInfo<SkyWeaver>) -> Self {
    if card.is_hero() {
      FieldOrder::Hero
    } else if card.traits.contains(&Trait::Guard) {
      FieldOrder::Guard
    } else if card.traits.contains(&Trait::Stealth) {
      FieldOrder::Stealth
    } else {
      FieldOrder::Regular
    }
  }
}
