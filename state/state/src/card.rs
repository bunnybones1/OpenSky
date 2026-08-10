#[cfg(feature = "bindings")]
use typescript_definitions::TypescriptDefinition;
#[allow(unused_imports)]
#[cfg(feature = "bindings")]
use wasm_bindgen::prelude::*;

use crate::game::SkyWeaver;
use crate::library::BaseCard;
use crate::model::*;
use crate::saturating_u8::SaturatingU8;
use crate::{effects::EffectType, library::AttackRestriction, CardEffect};
use card_movement_simulator::{CardInstance, InstanceID, Player};
use indexmap::{indexset, IndexSet};
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use std::ops::Deref;

#[derive(Deserialize, Serialize, Clone, Debug, PartialEq)]
#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[serde(rename_all = "camelCase")]
pub struct CardAttributes {
  pub cost: SaturatingU8,
  pub prism: Prism,
  pub element: Element,
  pub power: SaturatingU8,
  pub health: SaturatingU8,
  pub traits: IndexSet<Trait>,
  pub r#type: Type,
  pub can_be_played: bool,
  pub is_silenced: bool,
  // the below properties are only used on units.
  // Maybe there should be an enum variant for units only with these props?
  pub marked_for_death: Option<InstanceID>,
  pub did_attack: bool,
  pub attack_state: AttackState,
  pub can_be_targeted_by_owner: bool,
  pub can_be_targeted_by_enemy: bool,
  pub attack_restrictions: IndexSet<AttackRestriction>,
  pub effects: Vec<CardEffect>,
  pub rarity: Rarity,
  pub is_x_cost: bool,
  pub health_frozen: bool,

  pub charges: Option<SaturatingU8>,
  pub max_charges: Option<SaturatingU8>,
  pub counters: Option<SaturatingU8>,
  pub max_counters: Option<SaturatingU8>,
  pub per_turn: Option<SaturatingU8>,
}

#[derive(Deserialize, Serialize, Copy, Clone, Debug, PartialEq)]
#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
pub enum AttackState {
  Exhausted,
  Sleeping,
  Ready,
}

impl AttackState {
  pub fn can_attack(&self) -> bool {
    match self {
      Self::Exhausted | Self::Sleeping => false,
      Self::Ready => true,
    }
  }
}

impl Default for CardAttributes {
  fn default() -> CardAttributes {
    CardAttributes {
      cost: 0.into(),
      prism: Prism::Token,
      element: Element::Sky,
      power: 0.into(),
      health: 1.into(),
      traits: indexset![],
      marked_for_death: None,
      did_attack: false,
      attack_state: AttackState::Sleeping,
      r#type: Type::Unit,
      can_be_targeted_by_owner: true,
      can_be_targeted_by_enemy: true,
      can_be_played: true,
      attack_restrictions: Default::default(),
      is_silenced: false,
      effects: vec![],
      is_x_cost: false,
      health_frozen: false,
      rarity: Rarity::Base,
      charges: None,
      max_charges: None,
      counters: None,
      max_counters: None,
      per_turn: None,
    }
  }
}

impl CardAttributes {
  pub fn is_hero(&self) -> bool {
    self.r#type == Type::Hero
  }

  pub fn is_unit(&self) -> bool {
    self.r#type == Type::Unit
  }

  pub fn is_spell(&self) -> bool {
    self.r#type == Type::Spell
  }

  pub fn is_enchant(&self) -> bool {
    self.r#type == Type::Enchant
  }
  pub fn is_hero_ability(&self) -> bool {
    self.r#type == Type::HeroAbility
  }
  pub fn get_effect_types(&self) -> Box<dyn Iterator<Item = EffectType> + '_> {
    Box::new(self.effects.iter().flat_map(|e| e.effect().effect_types()))
  }
}

#[derive(Clone)]
pub struct CardAttributesWithBase<'a> {
  pub attributes: &'a CardAttributes,
  pub base: BaseCard,
}
impl<'a> Deref for CardAttributesWithBase<'a> {
  type Target = &'a CardAttributes;
  fn deref(&self) -> &Self::Target {
    &self.attributes
  }
}

impl<'a> From<&'a CardInstance<SkyWeaver>> for CardAttributesWithBase<'a> {
  fn from(card: &'a CardInstance<SkyWeaver>) -> Self {
    CardAttributesWithBase {
      attributes: &card.view,
      base: *card.base(),
    }
  }
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, Debug, Clone, PartialEq)]
#[serde(tag = "type", content = "payload")]
pub enum ModifierExpiry {
  OnTurn(u16),
  Never { copyable: bool },
  Aura,
  XCost,
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, Debug, Clone, PartialEq)]
pub struct TemporaryModifier {
  pub source: InstanceID,
  pub priority: i8,
  pub modifier: Modifier,
  pub expiry: ModifierExpiry,
}

impl TemporaryModifier {
  fn is_copyable(&self) -> bool {
    match self.expiry {
      ModifierExpiry::Aura => false,
      ModifierExpiry::XCost => false,
      ModifierExpiry::OnTurn(_) => true,
      ModifierExpiry::Never { copyable } => copyable,
    }
  }
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CardState {
  pub view: CardAttributes,
  pub temporary_modifiers: Vec<TemporaryModifier>,
  pub field_age: usize,
  instance: CardAttributes,
  pub effect_types: Vec<EffectType>,
}

impl Deref for CardState {
  type Target = CardAttributes;
  fn deref(&self) -> &Self::Target {
    &self.view
  }
}

impl card_movement_simulator::CardState for CardState {
  fn eq(&self, other: &Self) -> bool {
    self.view == other.view
  }
  fn copy_card(&self) -> Self {
    let mut card = self.clone();
    card.remove_non_copyable_modifiers();
    card
  }
}

impl CardState {
  pub fn new(base: BaseCard, rarity: Rarity) -> CardState {
    let mut instance = base.instance().clone();
    instance.rarity = rarity;
    let mut state = CardState {
      view: Default::default(),
      temporary_modifiers: Vec::new(),
      instance,
      field_age: 0,
      effect_types: Vec::new(),
    };
    state.recompute();
    state
  }

  pub fn instance(&self) -> &CardAttributes {
    &self.instance
  }
  pub fn _internal_instance_mut(&mut self) -> &mut CardAttributes {
    &mut self.instance
  }

  pub fn copy_instance_and_modifiers(&mut self, other: &CardState) {
    self.instance = other.instance.clone();
    self.temporary_modifiers = other.temporary_modifiers.clone();
    self.recompute();
  }

  pub fn exact_copy_card_state(&self) -> Self {
    let mut clone = self.clone();
    clone.remove_non_copyable_modifiers();
    clone
  }

  pub fn remove_non_copyable_modifiers(&mut self) {
    self.temporary_modifiers.retain(|m| m.is_copyable());
    self.recompute();
  }

  pub fn remove_expired_modifiers(&mut self, turn_nonce: u16) {
    self.temporary_modifiers.retain(|m| match m.expiry {
      ModifierExpiry::Aura => false,
      ModifierExpiry::XCost => false,
      ModifierExpiry::OnTurn(t) if turn_nonce >= t => false,
      _ => true,
    });
    self.recompute();
  }
  pub fn remove_x_cost_modifiers(&mut self) {
    self
      .temporary_modifiers
      .retain(|m| !matches!(m.expiry, ModifierExpiry::XCost));
    self.recompute();
  }

  pub fn add_modifier(
    &mut self,
    source: InstanceID,
    priority: i8,
    modifier: Modifier,
    expiry: ModifierExpiry,
  ) {
    let new_mod = TemporaryModifier {
      source,
      priority,
      modifier,
      expiry,
    };
    self.temporary_modifiers.push(new_mod);
    self.recompute();
  }

  pub fn apply_modifier(&mut self, modifier: Modifier, source: InstanceID) {
    mutate_overriding_traits(&mut self.instance, move |s| modifier.mutate(s), source);
    self.recompute();
  }

  pub fn add_aura_modifier(&mut self, source: InstanceID, modifier: Modifier, priority: i8) {
    self.temporary_modifiers.push(TemporaryModifier {
      source,
      priority,
      modifier,
      expiry: ModifierExpiry::Aura,
    });
    self.recompute();
  }

  pub fn add_xcost_modifier(&mut self, my_id: InstanceID, modifier: Modifier) {
    self.temporary_modifiers.push(TemporaryModifier {
      source: my_id,
      priority: 5, // xcost modifiers always run last!
      modifier,
      expiry: ModifierExpiry::XCost,
    });
    self.recompute();
  }
  pub fn remove_modifiers_from(&mut self, instance_id: InstanceID) {
    self.temporary_modifiers.retain(|m| m.source != instance_id);
    self.recompute();
  }

  pub fn remove_modifier(&mut self, remove: impl Fn(&TemporaryModifier) -> bool) {
    self.temporary_modifiers.retain(|m| !remove(m));
    self.recompute();
  }

  pub fn mutate(&mut self, mutator: impl FnOnce(&mut CardAttributes), source: InstanceID) {
    mutate_overriding_traits(&mut self.instance, mutator, source);
    self.recompute();
  }

  fn recompute(&mut self) {
    self.view = self.instance.clone();
    let modifiers: Vec<_> = self
      .temporary_modifiers
      .iter()
      .cloned()
      .sorted_by_key(|m| m.priority)
      .collect();

    for modifier in modifiers {
      let source = modifier.source;
      mutate_overriding_traits(&mut self.view, move |s| modifier.modifier.mutate(s), source);
      self.effect_types = self.view.get_effect_types().collect();
    }

    self.effect_types = self.view.get_effect_types().collect();
  }
}

fn mutate_overriding_traits(
  attributes: &mut CardAttributes,
  mutator: impl FnOnce(&mut CardAttributes),
  source: InstanceID,
) {
  let had_stealth = attributes.traits.contains(&Trait::Stealth);
  let had_guard = attributes.traits.contains(&Trait::Guard);
  let was_marked_for_death = attributes.marked_for_death;

  mutator(attributes);

  if (attributes.is_unit() || attributes.is_hero())
    && was_marked_for_death.is_none()
    && attributes.marked_for_death.is_none()
    && attributes.health == 0
  {
    attributes.marked_for_death = Some(source);
  }
  if had_stealth && attributes.traits.contains(&Trait::Guard) {
    attributes.traits.remove(&Trait::Stealth);
  } else if had_guard && attributes.traits.contains(&Trait::Stealth) {
    attributes.traits.remove(&Trait::Guard);
  }

  if attributes.marked_for_death.is_some() {
    attributes.health = 0.into();
    attributes.attack_state = AttackState::Exhausted;
  }
}

#[derive(Copy, Clone, Debug)]
#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, PartialEq)]
pub enum ModifyHealthReason {
  /// The card we're stealing life from
  Lifesteal(InstanceID),
  /// The card that is causing this damage
  Damage(InstanceID, DamageKind),
  // OOD damage!
  Fatigue,
}

#[derive(Copy, Clone, Debug)]
#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, PartialEq)]
pub enum ModifyPowerReason {
  Wither,
  Banner,
}

#[derive(Clone, Debug, PartialEq)]
#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize)]
pub enum Modifier {
  SetHealth(SaturatingU8),
  ModifyHealth(i8, Option<ModifyHealthReason>),
  SetPower(SaturatingU8),
  ModifyPower(i8, Option<ModifyPowerReason>),
  SetCost(SaturatingU8),
  ModifyCost(i8),

  GrantTrait(Trait),
  RemoveTrait(Trait),
  GrantEffect(CardEffect),
  SetTraits(IndexSet<Trait>),

  SetElement(Element),
  SetRarity(Rarity),

  GrantAttackRestrictions(IndexSet<AttackRestriction>),
  RemoveAttackRestrictions(IndexSet<AttackRestriction>),

  CanBePlayed(bool),
  SetAttackState(AttackState),
  SetHealthFrozen(bool),
  /// Internal, do not use pls!
  ChangeMana(i8),
  SetDidAttack(bool),

  CantBeTargetedByEnemy,
  NoTraits,
  Silenced(bool),
  MarkedForDeath(InstanceID),
  UnmarkForDeath,
  CheatedByPlayingIllegalHandCard,

  KrampusBuff(u8),
  ApplyAtTurnEnd(Box<Modifier>),
  StoredCard(Box<StoredCard>),
  MechshroomSize(SaturatingU8),
  GlobalModifierSource {
    source: InstanceID,
    modifier: Box<Modifier>,
  },
  ModifyCharges(i8),
  ModifyCounters(i8),
  ModifyMaxCounters(i8),
}

#[derive(Clone, Debug, PartialEq)]
#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize)]
pub struct StoredCard {
  pub owner: Player,
  pub card: (BaseCard, CardState),
  pub attachment: Option<(BaseCard, CardState)>,
}

impl Modifier {
  pub fn mutate(self, card: &mut CardAttributes) {
    match self {
      Modifier::SetHealth(hp) => {
        card.health = hp;
      }
      Modifier::ModifyHealth(hp, _) => {
        if card.health_frozen {
          return;
        }
        card.health += hp;
      }

      Modifier::GrantTrait(keyword) => {
        card.traits.insert(keyword);
      }
      Modifier::RemoveTrait(keyword) => {
        card.traits.remove(&keyword);
      }
      Modifier::SetTraits(traits) => {
        card.traits = traits;
      }

      Modifier::SetPower(pow) => {
        card.power = pow;
      }
      Modifier::ModifyPower(power, _) => {
        card.power += power;
      }

      Modifier::ModifyCost(cost) => {
        card.cost += cost;
      }
      Modifier::SetCost(cost) => {
        card.cost = cost;
      }

      Modifier::SetElement(element) => {
        card.element = element;
      }
      Modifier::SetRarity(rarity) => {
        card.rarity = rarity;
      }

      Modifier::CanBePlayed(can_be_played) => {
        card.can_be_played = can_be_played;
      }
      Modifier::NoTraits => {
        card.traits = Default::default();
      }
      Modifier::CantBeTargetedByEnemy => {
        card.can_be_targeted_by_enemy = false;
      }
      Modifier::GrantAttackRestrictions(new_restrictions) => {
        card.attack_restrictions.extend(new_restrictions.iter());
      }
      Modifier::RemoveAttackRestrictions(remove_restrictions) => {
        card.attack_restrictions = card
          .attack_restrictions
          .difference(&remove_restrictions)
          .copied()
          .collect();
      }
      Modifier::SetDidAttack(did_attack) => {
        card.did_attack = did_attack;
      }
      Modifier::SetAttackState(attack_state) => {
        card.attack_state = attack_state;
      }
      Modifier::SetHealthFrozen(health_frozen_state) => {
        card.health_frozen = health_frozen_state;
      }
      Modifier::ChangeMana(..) => {
        // dummy modifier to show change mana next turn
      }
      Modifier::Silenced(is_silenced) => {
        card.is_silenced = is_silenced;
      }
      Modifier::MarkedForDeath(toggle) => {
        card.marked_for_death = card.marked_for_death.or(Some(toggle));
      }
      Modifier::UnmarkForDeath => {
        card.marked_for_death = None;
      }
      Modifier::CheatedByPlayingIllegalHandCard => {
        // equivalent to MarkedForDeath, but only applied when you tried to cheat by playing an illegal hand card.
        card.marked_for_death = Some(InstanceID::from_raw(0));
      }
      Modifier::KrampusBuff(_) => {
        // just a tag, doesn't do any modification
        // except prevent silencing
        card.is_silenced = false;
      }
      Modifier::ApplyAtTurnEnd(_) | Modifier::StoredCard(_) => {
        // just a tag, doesn't do any active modification
      }
      Modifier::GrantEffect(effect) => {
        card.effects.push(effect);
      }
      Modifier::MechshroomSize(_) => {
        // nada
      }
      Modifier::GlobalModifierSource { .. } => {
        // nada
      }
      Modifier::ModifyCharges(delta) => {
        if let Some(charges) = &mut card.charges {
          *charges += delta;
        }
      }
      Modifier::ModifyCounters(delta) => {
        if let Some(counters) = &mut card.counters {
          *counters += delta
        }
      }
      Modifier::ModifyMaxCounters(max) => {
        if let Some(max_counters) = &mut card.max_counters {
          *max_counters += max;
        }
      }
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  #[test]
  fn card_mutates() {
    let mut card = CardState::new(BaseCard::Dummy, Rarity::Gold);
    assert_eq!(card.view.power, 0);
    card.mutate(|c| c.power = 25.into(), InstanceID::from_raw(0));
    assert_eq!(card.view.power, 25);
  }

  #[test]
  fn guard_and_stealth_override_eachother() {
    let mut card = CardState::new(BaseCard::Dummy, Rarity::Gold);
    assert_eq!(card.view.traits.len(), 0);
    card.apply_modifier(
      Modifier::GrantTrait(Trait::Stealth),
      InstanceID::from_raw(0),
    );
    assert_eq!(card.view.traits.len(), 1);
    assert!(card.view.traits.contains(&Trait::Stealth));

    card.apply_modifier(Modifier::GrantTrait(Trait::Guard), InstanceID::from_raw(0));
    assert_eq!(card.view.traits.len(), 1);
    assert!(card.view.traits.contains(&Trait::Guard));

    card.apply_modifier(Modifier::GrantTrait(Trait::Guard), InstanceID::from_raw(0));
    assert_eq!(card.view.traits.len(), 1);
    assert!(card.view.traits.contains(&Trait::Guard));
  }
}
