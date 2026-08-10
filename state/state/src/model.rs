#[cfg(feature = "bindings")]
use typescript_definitions::TypescriptDefinition;
#[allow(unused_imports)]
#[cfg(feature = "bindings")]
use wasm_bindgen::prelude::*;

use serde::{Deserialize, Serialize};
use std::fmt;
use strum_macros::EnumIter;

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, Debug, PartialEq, Copy, Clone)]
pub enum Prism {
  #[cfg_attr(feature = "bindings", serde(rename = "agy"))]
  Agility,
  #[cfg_attr(feature = "bindings", serde(rename = "hrt"))]
  Heart,
  #[cfg_attr(feature = "bindings", serde(rename = "int"))]
  Intellect,
  #[cfg_attr(feature = "bindings", serde(rename = "str"))]
  Strength,
  #[cfg_attr(feature = "bindings", serde(rename = "wis"))]
  Wisdom,
  #[cfg_attr(feature = "bindings", serde(rename = "tok"))]
  Token,
  #[cfg_attr(feature = "bindings", serde(rename = "tut"))]
  Tutorial,
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(
  Deserialize, Serialize, Debug, EnumIter, Eq, PartialEq, Hash, Copy, Clone, PartialOrd, Ord,
)]
#[cfg_attr(feature = "bindings", serde(rename_all = "camelCase"))]
pub enum Element {
  Light,
  Mind,
  Fire,
  Air,
  Water,
  Earth,
  Metal,
  Dark,
  Sky, // none
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, Debug, PartialEq, Eq, Hash, Copy, Clone, EnumIter)]
#[cfg_attr(feature = "bindings", serde(rename_all = "camelCase"))]
pub enum Trait {
  Stealth,
  Wither,
  Guard,
  Banner,
  Lifesteal,
  Armor,
  Dash,
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, Debug, PartialEq, Eq, Copy, Clone)]
#[cfg_attr(feature = "bindings", serde(rename_all = "camelCase"))]
pub enum Type {
  Hero,
  Unit,
  Spell,
  Enchant,
  HeroAbility,
}

impl Type {
  pub fn is_allowed_attachments(self) -> bool {
    match self {
      Self::Hero | Self::Unit => true,
      Self::Spell | Self::Enchant | Self::HeroAbility => false,
    }
  }
}

impl fmt::Display for Type {
  fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
    write!(
      f,
      "{}",
      match self {
        Type::Hero => "Hero",
        Type::HeroAbility => "HeroAbility",
        Type::Unit => "Unit",
        Type::Enchant => "Enchant",
        Type::Spell => "Spell",
      }
    )
  }
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, Debug, PartialEq, Eq, Hash, Copy, Clone)]
#[serde(tag = "type")]
pub enum DamageKind {
  Combat { is_retaliation: bool },
  CardEffect,
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, Debug, PartialEq, Eq, Hash, Copy, Clone)]
pub enum CardPool {
  Deck,
  Prisms,
  Anywhere,
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(
  Deserialize, Serialize, Debug, EnumIter, Eq, PartialEq, Hash, Copy, Clone, PartialOrd, Ord,
)]
#[cfg_attr(feature = "bindings", serde(rename_all = "camelCase"))]
pub enum Rarity {
  None,
  Base,
  Silver,
  Gold,
}
