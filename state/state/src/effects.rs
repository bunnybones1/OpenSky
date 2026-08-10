use crate::{
  game::SkyWeaver,
  live_game::LiveGame,
  phase::{Phase, ResolvedPhase},
  utils::Promisify,
  CardAttributes, CardEffect,
};
use card_movement_simulator::{
  arcadeum::store::State, CardInstance, GameState, InstanceID, Player, PlayerSecret, Zone,
};
use serde::{Deserialize, Serialize};
use std::convert::{TryFrom, TryInto};

#[derive(Copy, Clone, PartialEq)]
pub enum SummonTiming {
  BeforeText,
  AfterText,
  Manual,
}

/// I expect cards to follow intuition from physical card games, where it's not really fair to have a card do something to the public state without revealing what it is.
/// e.g. An effect like `If this card is in your hand, at the start of your turn, kill all units.` doesn't make any sense, because by nature of the effect it gives away which card it is.
///
/// There are 3 types of effects, classified by trigger secrecy and consequence secrecy.
///
/// 1. These triggers are public, and the consequences can be public or secret.
/// If a card is public (e.g. field, graveyard, revealed in hand), its effect can do anything, just like in the current system.
///
/// 2. These triggers can be secret, and the consequences are always secret. (They can still trigger when the card is public.)
/// This is a bit funky.
/// You can still write cards like `When this card is sent from hand to deck, it gains +1/+1` or `When this card is drawn, water units in your deck get -1c.`
/// This also permits effects like "give cards in your deck +1c and Lead" to fire in secret without revealing *anything*, even the fact that the effect fired.
///
/// However, you couldn't write a card like `When this card is drawn, give units in your hand +1/+1`, because some units in your hand might be public. The card would have to have a type 3 effect too, and it would decide which one to fire based on its revealed status.
///
/// TODO type 3 triggers are not implemented.
/// 3. These triggers can be secret, but the consequences might be public. (They can still trigger when the card is public.)
/// Type 3 effects could trigger from deck, from hand (hidden or public), or attached to a card in any secret zone.
///
/// Upon triggering, they should become public. This means revealing in hand, if attached revealing their parent (and by proxy themselves), or moving themselves from deck to a public zone.
/// The reveal isn't a hard requirement, but it's intuitive - if both players can see the effect doing something in public state, then we must implicitly reveal which card fired that effect to be able to run the right code, which means that a savvy programmer could figure out what card it is. IMO it wouldn't make sense not to explicitly reveal as a consequence.
///
/// These effects can do anything once they're triggered, just like #1.
///
/// These effects would require building a system like MTG's priority, where at every step you have to pass priority back and forth.
/// To take the example from #2, `When this card is drawn, *reveal it* and give units in your hand +1/+1`, we'd have to ask the opponent at the beginning of every single event "did anything secret of yours trigger here?" and if anything did, we could `reveal` the card and fire its effect. This is the best design I can think of, since it minimizes reveals of secret information - you only get to know what a card is when its effect fires.

#[cfg(feature = "bindings")]
use typescript_definitions::TypescriptDefinition;
#[cfg(feature = "bindings")]
use wasm_bindgen::prelude::*;
pub enum Effect {
  None,
  Enchant {
    on_attach:
      for<'a> fn(parent: &mut CardInstance<SkyWeaver>, attachment: &CardInstance<SkyWeaver>),
    on_detach:
      for<'a> fn(parent: &mut CardInstance<SkyWeaver>, attachment: &CardInstance<SkyWeaver>),
  },
  Unit {
    triggers: Vec<TriggerVariant>,
    on_play: Option<(SummonTiming, OnPlayEffect)>,
  },
  Spell {
    triggers: Vec<TriggerVariant>,
    on_play: OnPlayEffect,
  },
  HeroAbility {
    triggers: Vec<TriggerVariant>, // passive
    on_play: OnPlayEffect,         // active
  },
}

const NO_ON_PLAY_EFFECT: OnPlayEffect = OnPlayEffect::None;
impl Effect {
  pub fn on_play(&self) -> &OnPlayEffect {
    match self {
      Effect::Unit {
        on_play: Some((_, on_play)),
        ..
      }
      | Effect::Spell { on_play, .. }
      | Effect::HeroAbility { on_play, .. } => on_play,
      _ => &NO_ON_PLAY_EFFECT,
    }
  }
  pub fn summon_timing(&self) -> Option<SummonTiming> {
    match self {
      Effect::Unit {
        on_play: Some((timing, _)),
        ..
      } => Some(*timing),
      _ => None,
    }
  }
  pub fn is_none(&self) -> bool {
    matches!(self, Effect::None)
  }
  pub fn effect_types(&self) -> Box<dyn Iterator<Item = EffectType> + '_> {
    Box::new(self.triggers().map(|t| t.effect_type()))
  }

  pub fn triggers(&self) -> Box<dyn Iterator<Item = &'_ TriggerVariant> + '_> {
    match self {
      Effect::None | Effect::Enchant { .. } => Box::new(std::iter::empty()),
      Effect::Unit { triggers, .. }
      | Effect::Spell { triggers, .. }
      | Effect::HeroAbility { triggers, .. } => Box::new(triggers.iter()),
    }
  }
}

#[derive(Clone)]
pub enum OnPlayEffect {
  None,
  Targeted {
    does_target: fn(
      &GameState<SkyWeaver>,
      &PlayerSecret<SkyWeaver>,
      Player,
      my_id: InstanceID,
      target: InstanceID,
    ) -> bool,
    mutate: for<'a> fn(
      &'a mut LiveGame,
      my_id: InstanceID,
      target: InstanceID,
      owner: Player,
    ) -> Promisify<'a, ()>,
  },
  MaybeTargeted {
    does_target: fn(
      &GameState<SkyWeaver>,
      &PlayerSecret<SkyWeaver>,
      owner: Player,
      my_id: InstanceID,
      target: InstanceID,
    ) -> bool,
    mutate: for<'a> fn(
      &'a mut LiveGame,
      my_id: InstanceID,
      target: Option<InstanceID>,
      owner: Player,
    ) -> Promisify<'a, ()>,
  },
  Untargeted {
    mutate: for<'a> fn(&'a mut LiveGame, InstanceID, Player) -> Promisify<'a, ()>,
  },
}

macro_rules! convert_impls {
  ($variant:ident, $inner:ident) => {
    impl From<$inner> for TriggerVariant {
      fn from(trigger: $inner) -> Self {
        Self::$variant(trigger)
      }
    }
    impl TryFrom<TriggerVariant> for $inner {
      type Error = &'static str;
      fn try_from(value: TriggerVariant) -> Result<Self, Self::Error> {
        match value {
          TriggerVariant::$variant(t) => Ok(t),
          _ => Err(concat!("Variant is not", stringify!($variant))),
        }
      }
    }
    impl<'a> TryFrom<&'a TriggerVariant> for &'a $inner {
      type Error = &'static str;
      fn try_from(value: &'a TriggerVariant) -> Result<Self, Self::Error> {
        match value {
          TriggerVariant::$variant(t) => Ok(t),
          _ => Err(concat!("Variant is not", stringify!($variant))),
        }
      }
    }
  };
}

pub enum TriggerVariant {
  Normal(NormalTrigger),
  SecretNormal(SecretNormalTrigger),
  Early(EarlyTrigger),
  SecretEarly(SecretEarlyTrigger),
  PhaseModifier(PhaseModifier),
}

convert_impls!(Normal, NormalTrigger);
convert_impls!(SecretNormal, SecretNormalTrigger);
convert_impls!(Early, EarlyTrigger);
convert_impls!(SecretEarly, SecretEarlyTrigger);
convert_impls!(PhaseModifier, PhaseModifier);

impl TriggerVariant {
  pub fn is_active(&self, zone: Zone, card: &CardAttributes) -> bool {
    (match self {
      TriggerVariant::Normal(t) => t.is_active,
      TriggerVariant::SecretNormal(t) => t.is_active,
      TriggerVariant::SecretEarly(t) => t.is_active,
      TriggerVariant::Early(t) => t.is_active,
      TriggerVariant::PhaseModifier(t) => t.is_active,
    })(zone, card)
  }

  pub fn name(&self) -> &str {
    match self {
      TriggerVariant::Normal(_) => "Normal",
      TriggerVariant::SecretNormal(_) => "SecretNormal",
      TriggerVariant::SecretEarly(_) => "SecretEarly",
      TriggerVariant::Early(_) => "Early",
      TriggerVariant::PhaseModifier(_) => "PhaseModifier",
    }
  }
  pub fn effect_type(&self) -> EffectType {
    match self {
      TriggerVariant::Normal(t) => t.effect_type,
      TriggerVariant::SecretNormal(t) => t.effect_type,
      TriggerVariant::SecretEarly(t) => t.effect_type,
      TriggerVariant::Early(t) => t.effect_type,
      TriggerVariant::PhaseModifier(t) => t.effect_type,
    }
  }
}

pub struct PhaseModifier {
  pub effect_type: EffectType,
  pub priority: i8,
  pub is_active: fn(zone: Zone, card: &CardAttributes) -> bool,
  /// Returns (was_modified, Phase)
  pub run: for<'a> fn(
    game: &'a mut LiveGame,
    my_id: InstanceID,
    phase: &'a Phase,
    source_effect: CardEffect,
  ) -> Promisify<'a, Option<Phase>>,
}

pub struct EarlyTrigger {
  pub effect_type: EffectType,
  pub priority: i8,
  pub is_active: fn(zone: Zone, card: &CardAttributes) -> bool,
  pub run: for<'a> fn(
    game: &'a mut LiveGame,
    my_id: InstanceID,
    phase: Phase,
    source_effect: CardEffect,
  ) -> Promisify<'a, ()>,
}

pub type ResolveTriggerContinuation = dyn for<'a> FnOnce(&'a mut LiveGame) -> Promisify<'a, ()>;

#[derive(Default)]
pub struct Queue(Vec<Box<ResolveTriggerContinuation>>);

impl Queue {
  pub fn add_resolution(
    &mut self,
    func: impl for<'a> FnOnce(&'a mut LiveGame) -> Promisify<'a, ()> + 'static,
  ) {
    self.0.push(Box::new(func))
  }

  pub fn add_alive_in_play_resolution(
    &mut self,
    my_id: InstanceID,
    func: impl for<'a> FnOnce(&'a mut LiveGame) -> Promisify<'a, ()> + 'static,
  ) {
    self.0.push(Box::new(move |game| {
      Box::pin(async move {
        if game.is_alive_on_field(my_id) {
          func(game).await;
        }
      })
    }))
  }

  pub fn into_inner(self) -> Vec<Box<ResolveTriggerContinuation>> {
    self.0
  }
}

#[allow(clippy::type_complexity)]
pub struct NormalTrigger {
  pub effect_type: EffectType,
  pub priority: i8,
  pub is_active: fn(zone: Zone, card: &CardAttributes) -> bool,
  pub run: for<'a> fn(
    game: &'a mut LiveGame,
    queue: &'a mut Queue,
    my_id: InstanceID,
    phase: ResolvedPhase,
    source_effect: CardEffect,
  ) -> Promisify<'a, ()>,
}

// Only allowed in-hand.
#[allow(clippy::type_complexity)]
pub struct SecretNormalTrigger {
  pub effect_type: EffectType,
  pub priority: i8,
  pub is_active: fn(zone: Zone, card: &CardAttributes) -> bool,
  pub run: fn(
    game: &GameState<SkyWeaver>,
    secret: &mut PlayerSecret<SkyWeaver>,
    random: &mut dyn rand::RngCore,
    log: &mut dyn FnMut(<GameState<SkyWeaver> as State>::Event),
    my_id: InstanceID,
    phase: ResolvedPhase,
  ),
}

#[allow(clippy::type_complexity)]
pub struct SecretEarlyTrigger {
  pub effect_type: EffectType,
  pub priority: i8,
  pub is_active: fn(zone: Zone, card: &CardAttributes) -> bool,
  pub run: fn(
    game: &GameState<SkyWeaver>,
    secret: &mut PlayerSecret<SkyWeaver>,
    random: &mut dyn rand::RngCore,
    log: &mut dyn FnMut(<GameState<SkyWeaver> as State>::Event),
    my_id: InstanceID,
    phase: Phase,
  ),
}
#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, Debug, Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum EffectType {
  Death,
  Glory,
  Slay,
  Inspire,
  Play,
  Summon,
  Generic,
  Sunrise,
  Sunset,
  Continuous,
  Internal,
  Choose,
}

#[cfg_attr(feature = "bindings", wasm_bindgen(typescript_custom_section))]
#[cfg(feature = "bindings")]
const TS_CLIENT_EXTRA: &str = r#"
export type ActiveTrigger<_G> = object

export type SecretEarlyTrigger = never
"#;

#[derive(Deserialize, Serialize)]
pub struct ActiveTrigger<G>
where
  for<'a> &'a G: TryFrom<&'a TriggerVariant>,
{
  instance: InstanceID,
  effect: CardEffect,
  trigger_index: usize,
  trigger_type: std::marker::PhantomData<*const G>,
}

impl<G> Clone for ActiveTrigger<G>
where
  for<'a> &'a G: TryFrom<&'a TriggerVariant>,
{
  fn clone(&self) -> Self {
    ActiveTrigger {
      instance: self.instance,
      effect: self.effect,
      trigger_index: self.trigger_index,
      trigger_type: std::marker::PhantomData,
    }
  }
}

impl<G> std::fmt::Debug for ActiveTrigger<G>
where
  for<'a> &'a G: TryFrom<&'a TriggerVariant>,
{
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    f.debug_struct("ActiveTrigger")
      .field("instance", &self.instance)
      .field("effect", &self.effect)
      .field("effect_index", &self.trigger_index)
      .finish()
  }
}

impl<G> ActiveTrigger<G>
where
  for<'a> &'a G: TryFrom<&'a TriggerVariant>,
{
  pub fn new(instance: InstanceID, effect: CardEffect, trigger_index: usize) -> Self {
    ActiveTrigger {
      instance,
      effect,
      trigger_index,
      trigger_type: std::marker::PhantomData,
    }
  }
  pub fn instance(&self) -> InstanceID {
    self.instance
  }
  pub fn card_effect(&self) -> CardEffect {
    self.effect
  }
  pub fn effect(&self) -> &'static Effect {
    self.effect.effect()
  }
  pub fn get(&self) -> &'_ G {
    let ActiveTrigger {
      effect,
      trigger_index,
      ..
    } = self;
    effect
      .effect()
      .triggers()
      .nth(*trigger_index)
      .unwrap_or_else(|| {
        panic!(
          "No trigger exists at index {} of base card {:?}!",
          *trigger_index, *effect
        )
      })
      .try_into()
      .map_err(|_| ())
      .expect("Trigger type didn't match effect index!")
  }
}

// a card's triggers = card.base.triggers + card.attachment.triggers
// global trigger cache.remove_by_source(card.id)
// global trigger cache.add(computed triggers)

pub fn effects_for_card(
  id: InstanceID,
  card: &CardInstance<SkyWeaver>,
  zone: Zone,
) -> Vec<(InstanceID, CardEffect)> {
  let mut active_triggers = Vec::new();
  for effect in card.effects.clone() {
    if let Effect::Unit { triggers, .. }
    | Effect::Spell { triggers, .. }
    | Effect::HeroAbility { triggers, .. } = effect.effect()
    {
      if triggers.iter().any(|c| c.is_active(zone, card)) {
        active_triggers.push((id, effect))
      }
    }
  }
  active_triggers
}

pub fn get_active_secret_triggers(
  secret: &PlayerSecret<SkyWeaver>,
) -> (
  Vec<ActiveTrigger<SecretEarlyTrigger>>,
  Vec<ActiveTrigger<SecretNormalTrigger>>,
) {
  let active_effects: Vec<_> = secret
    .hand()
    .iter()
    .flatten()
    .map(|id| (Zone::Hand { public: false }, *id))
    .chain(secret.deck().iter().map(|id| (Zone::Deck, *id)))
    .flat_map(|e| {
      std::iter::once(e).chain(
        secret
          .instance(e.1)
          .unwrap()
          .attachment()
          .map(|attach| (Zone::Attachment { parent: e.1.into() }, attach)),
      )
    })
    .flat_map(|(zone, id)| {
      let card = secret
        .instance(id)
        .expect("Secret trigger cards are secret.");
      effects_for_card(id, card, zone)
        .into_iter()
        .map(move |(id, effect)| (id, effect, zone, card))
    })
    .collect();

  let mut secret_early_triggers: Vec<ActiveTrigger<SecretEarlyTrigger>> = Vec::new();
  let mut secret_normal_triggers: Vec<ActiveTrigger<SecretNormalTrigger>> = Vec::new();
  for (id, effect, zone, card) in active_effects {
    if let Some(triggers) = match &effect.effect() {
      Effect::Unit { triggers, .. } => Some(triggers),
      Effect::Spell { triggers, .. } => Some(triggers),
      Effect::HeroAbility { triggers, .. } => Some(triggers),
      Effect::None | Effect::Enchant { .. } => None,
    } {
      for (trigger_index, trigger) in triggers.iter().enumerate() {
        if trigger.is_active(zone, card) {
          match trigger {
            TriggerVariant::SecretNormal(_) => {
              secret_normal_triggers.push(ActiveTrigger::new(id, effect, trigger_index))
            }
            TriggerVariant::SecretEarly(_) => {
              secret_early_triggers.push(ActiveTrigger::new(id, effect, trigger_index))
            }
            TriggerVariant::PhaseModifier(..)
            | TriggerVariant::Early(..)
            | TriggerVariant::Normal(..) => {}
          }
        }
      }
    }
  }

  // NOTE: booleans sort to [false, true]

  // TODO de-duplicate these identical functions
  secret_early_triggers.sort_by_key(|trigger| {
    let instance = secret.instance(trigger.instance()).unwrap();
    (
      // Priority should be considered before spells/attachments
      trigger.get().priority,
      // Units should fire after spells/attachments
      instance.is_unit() || instance.is_hero(),
    )
  });
  secret_normal_triggers.sort_by_key(|trigger| {
    let instance = secret.instance(trigger.instance()).unwrap();
    (
      // Priority should be considered before spells/attachments
      trigger.get().priority,
      // Units should fire after spells/attachments
      instance.is_unit() || instance.is_hero(),
    )
  });
  (secret_early_triggers, secret_normal_triggers)
}
