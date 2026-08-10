#[cfg(feature = "bindings")]
use typescript_definitions::TypescriptDefinition;
#[allow(unused_imports)]
#[cfg(feature = "bindings")]
use wasm_bindgen::prelude::*;

use crate::{
  card::{AttackState, CardAttributesWithBase, Modifier, ModifyHealthReason, ModifyPowerReason},
  client::GameAction,
  effects::OnPlayEffect,
  effects::{EffectType, ResolveTriggerContinuation, SummonTiming},
  extensions::*,
  game::{player_has_room_for_unit, SkyWeaver},
  library::BaseCard,
  live_game::LiveGame,
  model::{CardPool, DamageKind, Trait, Type},
  saturating_u8::SaturatingU8,
  utils::*,
  CardEffect,
};

use card_movement_simulator::{Card, CardInstance, CardLocation, InstanceID, Player, Zone};

use ambassador::{delegatable_trait, Delegate};
use first_class_variants::first_class_variants;
use rand::seq::SliceRandom;
use rand_core::SeedableRng;
use serde::{Deserialize, Serialize};
use std::{convert::TryInto, fmt, rc::Rc};
use strum::IntoEnumIterator;

#[delegatable_trait]
trait ResolvablePhase: Sized {
  fn verify<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, Result<(), ()>>;
  fn execute<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase>;
}

type CardFilterPredicate =
  Rc<dyn Fn(CardAttributesWithBase, Option<CardAttributesWithBase>) -> bool>;

#[first_class_variants(
  derive(Serialize),
  cfg_attr(feature = "bindings", derive(TypescriptDefinition)),
  serde(rename_all = "camelCase")
)]
#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Debug, Clone, Serialize, Delegate)]
#[serde(tag = "type", content = "payload")]
#[delegate(ResolvablePhase)]
pub enum Phase {
  #[derive(Debug, Clone)]
  Cancelled,
  #[derive(Debug, Clone)]
  EndTurn(Player),
  #[derive(Debug, Clone)]
  StartTurn(Player),
  #[derive(Debug, Clone)]
  ModifyCard {
    source: InstanceID,
    card: Card,
    modifier: Modifier,
  },
  #[derive(Debug, Clone)]
  Attack {
    attacker: InstanceID,
    defender: InstanceID,
  },
  #[derive(Debug, Clone)]
  MoveToZone {
    card: Card,
    player: Player,
    zone: Zone,
  },
  #[derive(Clone)]
  Draw {
    from: (Player, CardPool),
    to: (Player, Zone),
    #[serde(skip_serializing)]
    predicate: Option<CardFilterPredicate>,
  },
  #[derive(Clone)]
  Conjure {
    from: Player,
    to: (Player, Zone),
    #[serde(skip_serializing)]
    predicate: Option<CardFilterPredicate>,
  },
  #[derive(Debug, Clone)]
  Damage {
    target: InstanceID,
    amount: SaturatingU8,
    source: InstanceID,
    is_wither: bool,
    lifesteal_from: Option<Player>,
    kind: DamageKind,
  },
  #[derive(Debug, Clone)]
  ChangeMana { player: Player, delta: i32 },
  #[derive(Debug, Clone)]
  ChangeMaxMana { player: Player, delta: i32 },
  #[derive(Debug, Clone)]
  ChangeManaNextTurn { player: Player, delta: i8 },
  #[derive(Debug, Clone)]
  AuraUpdate,
  #[derive(Debug, Clone)]
  ResolveCardEffect {
    base_card: BaseCard,
    id: InstanceID,
    target_id: Option<InstanceID>,
    played_mana_cost: SaturatingU8,
    played_by_unit: bool,
  },
  #[derive(Debug, Clone)]
  ResetCard(Card),
  #[derive(Debug, Clone)]
  Glory(InstanceID, SaturatingU8),
  #[derive(Debug, Clone)]
  Mulligan {
    player: Player,
    to_mulligan: Vec<Card>,
    draw_delta: i8,
  },
  ResolveTrigger {
    id: InstanceID,
    effect: CardEffect,
    effect_type: EffectType,
    #[serde(skip_serializing)]
    fire: Box<ResolveTriggerContinuation>,
  },
  #[derive(Debug, Clone)]
  Overdraw(Player),
  #[derive(Debug, Clone)]
  ResolveCardSelection {
    card_indices: Vec<usize>,
    player: Player,
    is_init_card_selection: bool,
  },
}
impl fmt::Debug for PhaseDraw {
  fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
    write!(f, "Draw {{ from: {:?}, to: {:?} }}", self.from, self.to)
  }
}
impl fmt::Debug for PhaseConjure {
  fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
    write!(f, "Conjure {{ from: {:?}, to: {:?} }}", self.from, self.to)
  }
}

impl fmt::Debug for PhaseResolveTrigger {
  fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
    write!(
      f,
      "PhaseResolveTrigger {{ id: {:?}, effect: {:?}, effect_type: {:?} }}",
      self.id, self.effect, self.effect_type
    )
  }
}

impl Clone for PhaseResolveTrigger {
  fn clone(&self) -> Self {
    PhaseResolveTrigger {
      id: self.id,
      effect: self.effect,
      effect_type: self.effect_type,
      fire: Box::new(|_| {
        Box::pin(async move {
          panic!("You cloned PhaseResolveTrigger and tried to fire the clone.");
        })
      }),
    }
  }
}

#[first_class_variants(
  cfg_attr(feature = "bindings", derive(TypescriptDefinition)),
  derive(Debug, Clone, Deserialize, Serialize),
  serde(rename_all = "camelCase")
)]
#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(tag = "type", content = "payload")]
pub enum ResolvedPhase {
  FailedToResolve,
  EndTurn {
    player: Player,
    turn_count: u16,
  },
  StartTurn {
    player: Player,
    turn_count: u16,
  },
  ModifyCard {
    source: InstanceID,
    card: Card,
    modifier: Modifier,
  },
  Attack {
    attacker: InstanceID,
    defender: InstanceID,
    overkill: SaturatingU8,
  },
  // Important note: if the to Zone is public, card is *always* an ID.
  MoveToZone {
    card: Card,
    from: CardLocation,
    to: (Player, Zone),
  },
  Draw {
    allowed_pool: CardPool,
    from: (Player, CardPool),
    to: (Player, Zone),
    drawn_card: Card,
  },
  Conjure {
    from: Player,
    to: (Player, Zone),
    conjured_card: Card,
  },
  Damage {
    target: InstanceID,
    amount: SaturatingU8,
    overkill: SaturatingU8,
    source: InstanceID,
    is_wither: bool,
    lifesteal_from: Option<Player>,
    kind: DamageKind,
  },
  ChangeMana {
    player: Player,
    delta: i32,
  },
  ChangeMaxMana {
    player: Player,
    delta: i32,
  },
  ChangeManaNextTurn {
    player: Player,
    delta: i8,
  },
  AuraUpdate,
  ResolveCardEffect {
    base_card: BaseCard,
    id: InstanceID,
    target_id: Option<InstanceID>,
    played_mana_cost: SaturatingU8,
    played_by_unit: bool,
  },
  ResetCard(Card),
  Glory(InstanceID, SaturatingU8),
  Mulligan {
    player: Player,
    mulliganed: Vec<Card>,
    drawn: Vec<Card>,
  },
  ResolveTrigger {
    id: InstanceID,
    effect: CardEffect,
    effect_type: EffectType,
  },
  Overdraw {
    player: Player,
    returned_card: Card,
  },

  ResolveCardSelection {
    card_indices: Vec<usize>,
    player: Player,
    is_init_card_selection: bool,
  },
}

impl Phase {
  pub fn resolve<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase> {
    Box::pin(async move {
      if let Ok(()) = self.clone().verify(game).await {
        game.log(GameAction::EnterPhase(self.clone()));
        let resolved_phase = self.execute(game).await;
        game.log(GameAction::ExitPhase(resolved_phase.clone()));
        resolved_phase
      } else {
        ResolvedPhaseFailedToResolve.into()
      }
    })
  }
}

// ==================================================
//       Phase resolution logic implementations
// ==================================================

impl ResolvablePhase for PhaseAuraUpdate {
  fn verify<'a>(self, _: &'a mut LiveGame) -> Promisify<'a, Result<(), ()>> {
    Box::pin(async move { Ok(()) })
  }
  fn execute<'a>(self, _: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase> {
    Box::pin(async move { ResolvedPhaseAuraUpdate {}.into() })
  }
}

impl ResolvablePhase for PhaseModifyCard {
  fn verify<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, Result<(), ()>> {
    let PhaseModifyCard { card, .. } = self;

    Box::pin(async move {
      if let Some(id) = card.id() {
        match game.location(id).location {
          // Don't allow any modifications on cards that are in the Graveyard or Dusted.
          Some((Zone::Dust { .. }, _)) => {
            return Err(());
          }
          Some((Zone::Graveyard, _)) => {
            if id.instance(game, None).unwrap().marked_for_death.is_some() {
              return Err(());
            }
          }
          _ => {}
        }
      }
      Ok(())
    })
  }
  fn execute<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase> {
    let PhaseModifyCard {
      card,
      modifier,
      source,
    } = self;

    let real_source = match modifier {
      Modifier::ModifyHealth(_, Some(ModifyHealthReason::Damage(source, _))) => source,
      _ => source,
    };

    Box::pin(async move {
      let card = game
        .game
        .modify_card(card, |mut c| {
          c.apply_modifier(modifier.clone(), real_source);
        })
        .await;
      if game.reveal_from_card(card, |c| c.is_hero()).await {
        match modifier {
          Modifier::ModifyHealth(amount, _) if amount > 0 => {
            let card_owner = game.owner(card.id().unwrap());
            game.player_mut(card_owner).this_turn_stats.hero_hp_gained += amount as u16;
          }
          _ => {}
        }
      }
      ResolvedPhaseModifyCard {
        card,
        modifier,
        source: real_source,
      }
      .into()
    })
  }
}

impl ResolvablePhase for PhaseAttack {
  fn verify<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, Result<(), ()>> {
    Box::pin(async move {
      let Self {
        attacker, defender, ..
      } = self;

      if match attacker.instance(game, None) {
        None => true,
        Some(card) => {
          let attacker_on_field = game
            .player_cards(game.owner(attacker))
            .field()
            .contains(&attacker);

          card.marked_for_death.is_some() || !attacker_on_field
        }
      } || match defender.instance(game, None) {
        None => true,
        Some(card) => {
          let defender_on_field = game
            .player_cards(game.owner(defender))
            .field()
            .contains(&defender);
          card.marked_for_death.is_some() || !defender_on_field
        }
      } {
        Err(())
      } else {
        Ok(())
      }
    })
  }
  fn execute<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase> {
    let Self { attacker, defender } = self;
    Box::pin(async move {
      let attacker_power = game.reveal_from_card(attacker, |c| c.power).await;

      let (defender_is_hero, defender_power) = game
        .reveal_from_card(defender, |c| (c.is_hero(), c.power))
        .await;
      let attacker_is_hero = game.reveal_from_card(attacker, |c| c.is_hero()).await;

      // hit defender
      let (damage_dealt, overkill) = game
        .combat_damage(defender, attacker_power.into(), attacker, false)
        .await;

      // hit attacker back
      if !defender_is_hero {
        game
          .combat_damage(attacker, defender_power.into(), defender, true)
          .await;
      }
      if defender_is_hero && damage_dealt > 0 {
        game.run(PhaseGlory(attacker, damage_dealt)).await;
      }

      if attacker_is_hero {
        let owner = game.owner(attacker);
        game.player_mut(owner).this_turn_stats.hero_attacked = true;
        game.player_mut(owner).this_turn_stats.num_hero_attacks += 1;
      }
      ResolvedPhaseAttack {
        attacker,
        defender,
        overkill,
      }
      .into()
    })
  }
}

impl ResolvablePhase for PhaseChangeMana {
  fn verify<'a>(self, _: &'a mut LiveGame) -> Promisify<'a, Result<(), ()>> {
    Box::pin(async move { Ok(()) })
  }
  fn execute<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase> {
    let Self { player, delta } = self;
    Box::pin(async move {
      game.player_mut(player).mana += delta;
      ResolvedPhaseChangeMana { player, delta }.into()
    })
  }
}

impl ResolvablePhase for PhaseChangeMaxMana {
  fn verify<'a>(self, _: &'a mut LiveGame) -> Promisify<'a, Result<(), ()>> {
    Box::pin(async move { Ok(()) })
  }
  fn execute<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase> {
    let Self { player, delta } = self;
    Box::pin(async move {
      game.player_mut(player).max_mana = std::cmp::min(
        game.player(player).max_mana + delta,
        game.game_params.max_mana_crystals,
      );
      ResolvedPhaseChangeMaxMana { player, delta }.into()
    })
  }
}

impl ResolvablePhase for PhaseChangeManaNextTurn {
  fn verify<'a>(self, _: &'a mut LiveGame) -> Promisify<'a, Result<(), ()>> {
    Box::pin(async move { Ok(()) })
  }
  fn execute<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase> {
    let Self { player, delta } = self;
    Box::pin(async move {
      game.player_mut(player).extra_mana_next_turn += delta;
      ResolvedPhaseChangeManaNextTurn { player, delta }.into()
    })
  }
}

impl ResolvablePhase for PhaseDamage {
  fn verify<'a>(self, _: &'a mut LiveGame) -> Promisify<'a, Result<(), ()>> {
    Box::pin(async move { Ok(()) })
  }
  fn execute<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase> {
    let Self {
      target,
      amount,
      source,
      is_wither,
      lifesteal_from,
      kind,
    } = self;
    Box::pin(async move {
      let start_hp = game.reveal_from_card(target, |c| c.health).await;
      eprintln!("Damage from {:?} to {:?}: {:?}", source, target, amount);
      let modifier_applied = game
        .modify_card_single(
          target,
          Modifier::ModifyHealth(
            -i8::from(amount),
            Some(ModifyHealthReason::Damage(source, kind)),
          ),
        )
        .await;

      let damage_applied: SaturatingU8 = match modifier_applied {
        ResolvedPhase::ModifyCard(ResolvedPhaseModifyCard {
          card,
          modifier: Modifier::ModifyHealth(amount, _),
          ..
        }) if card.id() == Some(target) && amount < 0 => (-amount).try_into().unwrap(),
        _ => 0.into(),
      };

      if is_wither {
        game
          .modify_card_single(
            target,
            Modifier::ModifyPower(-i8::from(damage_applied), Some(ModifyPowerReason::Wither)),
          )
          .await;
      }

      if game.reveal_from_card(target, |t| t.is_hero()).await {
        let hero_owner = game.owner(target);
        if damage_applied > 0 {
          game.player_mut(hero_owner).this_turn_stats.hero_was_damaged = true;
          game.player_mut(hero_owner).this_turn_stats.hero_hp_lost += u16::from(damage_applied);

          game
            .player_mut(hero_owner)
            .game_stats
            .total_hero_health_lost += u16::from(damage_applied);

          // lifesteal_from only works on heroes. You can't lifesteal_from your own hero.
          if let Some(damager_enemy_player) = lifesteal_from {
            let hero_id = game.hero_id(damager_enemy_player);
            if hero_id == target {
              let healed_hero_id = game.hero_id(enemy(damager_enemy_player));
              game
                .modify_card_single(
                  healed_hero_id,
                  Modifier::ModifyHealth(
                    damage_applied.into(),
                    Some(ModifyHealthReason::Lifesteal(target)),
                  ),
                )
                .await;
            }
          }
        }
      }
      let hp_post_damage = i8::from(start_hp) - i8::from(damage_applied);
      let overkill = if hp_post_damage < 0 {
        -hp_post_damage
      } else {
        0
      }
      .into();

      ResolvedPhaseDamage {
        target,
        amount: damage_applied,
        overkill,
        source,
        is_wither,
        lifesteal_from,
        kind,
      }
      .into()
    })
  }
}

pub fn draw_predicate_restrictions(
  zone: Zone,
) -> impl Fn(CardAttributesWithBase) -> bool + Clone + 'static {
  move |c: CardAttributesWithBase| match zone {
    Zone::Attachment { .. } => c.r#type != Type::Unit,
    Zone::Field => c.is_unit(),
    _ => true,
  }
}

impl ResolvablePhase for PhaseDraw {
  fn verify<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, Result<(), ()>> {
    Box::pin(async move {
      if self.to.1.is_field() && !player_has_room_for_unit(game, self.to.0) {
        return Err(());
      }
      if let Zone::Attachment { parent } = self.to.1 {
        // Don't bother trying to draw onto lead units.
        if game.is_unit_on_field_with_lead(parent) {
          return Err(());
        }
      }
      Ok(())
    })
  }
  fn execute<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase> {
    let Self {
      from: (from_player, pool),
      to: (to_player, zone),
      predicate,
    } = self;
    Box::pin(async move {
      if let Zone::Attachment { parent } = zone {
        if game
          .reveal_from_card(parent, |c| c.marked_for_death.is_some())
          .await
        {
          return ResolvedPhaseFailedToResolve.into();
        }
      }

      let random = game.context().random().await;

      let search_deck = match pool {
        CardPool::Prisms => false,
        CardPool::Anywhere | CardPool::Deck => true,
      };
      let search_prisms = match pool {
        CardPool::Deck => false,
        CardPool::Anywhere | CardPool::Prisms => true,
      };
      let deal_fatigue_damage = matches!(pool, CardPool::Anywhere);

      let card_filter = {
        let cloned_predicate = predicate.unwrap_or_else(|| std::rc::Rc::new(|_, _| true));
        let restrictions = draw_predicate_restrictions(zone);
        move |c: CardAttributesWithBase, a: Option<CardAttributesWithBase>| {
          restrictions(c.clone()) && cloned_predicate(c, a)
        }
      };

      if search_deck {
        let card_filter = card_filter.clone();
        let rig_deck_order = game.game_params.rig_deck_order;
        let deck_index_to_draw = game
          .context()
          .reveal_unique(
            from_player,
            {
              // https://github.com/rust-random/rand/issues/104#issuecomment-252499548
              let random = rand_xorshift::XorShiftRng::from_rng(random).unwrap();

              move |secret| {
                let cards_matching_predicate: Vec<_> = secret
                  .deck()
                  .iter()
                  .enumerate()
                  .filter(|(_, id)| {
                    // Prevent weird double-draw recursion caused by interaction with
                    // draw inside on_detach/on_attach.
                    if secret.cards_about_to_be_drawn.contains(id) {
                      return false;
                    }
                    let card = secret
                      .instance(*id)
                      .expect("Deck cards should always exist in secret");
                    let attachment = card.attachment().map(|s_id| {
                      secret
                        .instance(s_id)
                        .expect("Attachments to deck cards are in this secret.")
                    });
                    card_filter(card.into(), attachment.map(Into::into))
                  })
                  .collect();
                // Try drawing from the deck first
                if rig_deck_order {
                  cards_matching_predicate.get(0)
                } else {
                  cards_matching_predicate.choose(&mut random.clone())
                }
                .map(|(index, _)| index)
                .copied()
              }
            },
            |_| true,
          )
          .await;

        if let Some(deck_index) = deck_index_to_draw {
          let deck_pointer = game.deck_card(from_player, deck_index);

          game.context().mutate_secret(from_player, |mut secret| {
            let id = secret
              .instance(deck_pointer)
              .expect("This player knows the ID of the card being drawn.")
              .id();
            secret.cards_about_to_be_drawn.push(id);
          });

          let move_result = game
            .run(PhaseMoveToZone {
              card: deck_pointer,
              player: to_player,
              zone,
            })
            .await;

          game.context().mutate_secret(from_player, |mut secret| {
            secret.cards_about_to_be_drawn.pop();
          });

          return if let Ok(ResolvedPhaseMoveToZone { card, to, .. }) = move_result.try_into() {
            ResolvedPhaseDraw {
              allowed_pool: pool,
              from: (from_player, CardPool::Deck),
              to,
              drawn_card: card,
            }
          } else {
            ResolvedPhaseDraw {
              allowed_pool: pool,
              from: (from_player, CardPool::Deck),
              to: game
                .reveal_from_card(deck_pointer, |c| (c.owner, c.zone))
                .await,
              drawn_card: deck_pointer,
            }
          }
          .into();
        }
      }

      // Nothing matching in the deck, draw from prisms instead
      if search_prisms {
        let random = rand_xorshift::XorShiftRng::from_rng(game.context().random().await).unwrap();

        let card_filter = card_filter.clone();

        let conjured_card = game
          .new_secret_cards(from_player, move |mut secret| {
            let conjurable_base_cards: Vec<_> = BaseCard::iter()
              .filter(|b| {
                !secret.singleton_cards_posessed.contains(b) && {
                  card_filter(
                    CardAttributesWithBase {
                      attributes: b.instance(),
                      base: *b,
                    },
                    b.attached_spell().map(|base| CardAttributesWithBase {
                      attributes: base.instance(),
                      base,
                    }),
                  )
                }
              })
              .collect();
            let chosen_base_card = conjurable_base_cards.choose(&mut random.clone()).copied();
            if let Some(chosen_base_card) = chosen_base_card {
              secret.singleton_cards_posessed.insert(chosen_base_card);
              secret.create_card(chosen_base_card, None);
            }
          })
          .await
          .into_iter()
          .next();
        if let Some(drawn_card) = conjured_card {
          if deal_fatigue_damage {
            game.fatigue(to_player).await;
          }
          let move_result = game
            .run(PhaseMoveToZone {
              card: drawn_card,
              player: to_player,
              zone,
            })
            .await;
          return if let Ok(ResolvedPhaseMoveToZone { card, to, .. }) = move_result.try_into() {
            ResolvedPhaseDraw {
              allowed_pool: pool,
              from: (from_player, CardPool::Prisms),
              to,
              drawn_card: card,
            }
          } else {
            ResolvedPhaseDraw {
              allowed_pool: pool,
              from: (from_player, CardPool::Prisms),
              to: game
                .reveal_from_card(drawn_card, |c| (c.owner, c.zone))
                .await,
              drawn_card,
            }
          }
          .into();
        }
      }
      // nothing to conjure :(
      ResolvedPhaseFailedToResolve.into()
    })
  }
}

impl ResolvablePhase for PhaseConjure {
  fn verify<'a>(self, _: &'a mut LiveGame) -> Promisify<'a, Result<(), ()>> {
    Box::pin(async move { Ok(()) })
  }
  fn execute<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase> {
    let Self {
      from,
      to,
      predicate,
    } = self;
    Box::pin(async move {
      if let Ok(ResolvedPhaseDraw { drawn_card, .. }) = game
        .run(PhaseDraw {
          from: (from, CardPool::Prisms),
          to,
          predicate,
        })
        .await
        .try_into()
      {
        ResolvedPhaseConjure {
          from,
          to,
          conjured_card: drawn_card,
        }
        .into()
      } else {
        ResolvedPhaseFailedToResolve.into()
      }
    })
  }
}

impl ResolvablePhase for PhaseOverdraw {
  fn verify<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, Result<(), ()>> {
    Box::pin(async move {
      let Self(player) = self;
      if game.player_cards(player).hand().is_empty() {
        Err(())
      } else {
        Ok(())
      }
    })
  }
  fn execute<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase> {
    let Self(player) = self;
    Box::pin(async move {
      let oldest_card_in_hand = game.hand_card(player, 0);
      game.move_to_zone(oldest_card_in_hand, Zone::Deck).await;
      ResolvedPhaseOverdraw {
        player,
        returned_card: oldest_card_in_hand,
      }
      .into()
    })
  }
}

impl ResolvablePhase for PhaseEndTurn {
  fn verify<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, Result<(), ()>> {
    Box::pin(async move {
      let Self(player) = self;
      if player == game.current_player {
        Ok(())
      } else {
        Err(()) // we tried to end a turn for the wrong player, hmm
      }
    })
  }
  fn execute<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase> {
    let Self(player) = self;
    Box::pin(async move {
      game
        .player_mut(1 - player)
        .hero_ability_casts_or_triggers_since_last_turn_start = 0;
      ResolvedPhaseEndTurn {
        player,
        turn_count: game.turn_count,
      }
      .into()
    })
  }
}

impl ResolvablePhase for PhaseStartTurn {
  fn verify<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, Result<(), ()>> {
    Box::pin(async move {
      let Self(player) = self;
      if player == game.current_player {
        Ok(())
      } else {
        Err(()) // we tried to start a turn for the wrong player, hmm
      }
    })
  }
  fn execute<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase> {
    let Self(player) = self;
    Box::pin(async move {
      // Kinda like an upkeep phase, tbh.
      game.turn_count += 1;

      // Reset turn-based stats
      for p in 0..2 {
        game.player_mut(p).this_turn_stats = Default::default();
        game.player_mut(p).this_turn_stats.hero_hp_at_turn_start = game.hero(p).health;
      }
      if game.turn_count > 1 {
        game.change_max_mana(player, 1).await;
        game
          .set_mana(
            player,
            i32::from(game.player(player).max_mana)
              + i32::from(game.player(player).extra_mana_next_turn),
          )
          .await;
      }

      game.player_mut(player).extra_mana_next_turn = 0;
      if !(game.turn_count == 1 && game.game_params.player_params[player as usize].skip_first_draw)
      {
        game.draw_any_card(player).await;
      }
      let characters = game.player_cards(player).field().clone();
      for character in characters {
        game.ready(character).await;
      }
      if game.turn_count >= game.game_params.max_turn_count {
        for p in 0..=1 {
          let hero = game.hero_id(p);
          game
            .modify_card_single(hero, Modifier::MarkedForDeath(hero))
            .await;
        }
      }
      if let Some(tavern_mode) = game.game_params.tavern_mode {
        tavern_mode
          .queue_boss_mode_moves(game, player, game.turn_count)
          .await;
      }
      ResolvedPhaseStartTurn {
        player,
        turn_count: game.turn_count,
      }
      .into()
    })
  }
}

impl ResolvablePhase for PhaseMoveToZone {
  fn verify<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, Result<(), ()>> {
    Box::pin(async move {
      let Self {
        player: to_player,
        zone: to_zone,
        ..
      } = self;

      // Cards can only be moved to field if there's room.
      if to_zone.is_field() && !player_has_room_for_unit(game.game, to_player) {
        return Err(());
      }

      Ok(())
    })
  }

  fn execute<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase> {
    Box::pin(async move {
      let Self {
        card,
        player: to_player,
        zone: to_zone,
      } = self;

      let cant_move = game
        .game
        .reveal_from_card(card, move |c| {
          // heroes can only move from limbo -> field
          let is_hero = c.is_hero() && !to_zone.is_field();

          // Dusted cards can't move.
          let is_dust = c.zone.is_dust();

          is_hero || is_dust
        })
        .await;
      if cant_move {
        return ResolvedPhaseFailedToResolve.into();
      }

      // Determine if we need to reset the card after moving it.
      // It should be reset when moving from field to non-dust-or-graveyard, or from graveyard to anywhere else.
      let should_reset = game
        .game
        .reveal_from_card(card, move |c| match c.zone {
          Zone::Field => !(to_zone.is_field() || to_zone.is_graveyard() || to_zone.is_dust()),
          Zone::Graveyard => !to_zone.is_graveyard() && c.marked_for_death.is_some(),
          _ => false,
        })
        .await;
      let max_field_age = game
        .characters::<&CardInstance<SkyWeaver>>(to_player)
        .into_iter()
        .map(|c| c.field_age)
        .max();

      // Reset the card if needed.
      if should_reset {
        game.reset_card(card).await;
      }

      if to_zone.is_graveyard() {
        let killer = *game.card_execution_context.last().unwrap();
        game
          .modify_card_single(card, Modifier::MarkedForDeath(killer))
          .await;
      }

      // If we know from public state that this move would end up dusting a card,
      // explicitly dust it beforehand, so we get a SkyWeaver dust event in public state.
      if let Zone::Attachment { parent } = to_zone {
        let mut parent_id = parent.id();
        if parent_id.is_none() {
          //reveal ID publically if the card is in a public zone
          parent_id = game
            .reveal_from_card(parent, |c| {
              if c
                .zone
                .is_public()
                .expect("Parent to an attachment can never be an attachment.")
              {
                Some(c.id())
              } else {
                None
              }
            })
            .await;
        }
        if let Some(parent_id) = parent_id {
          if let Some(public_parent) = parent_id.instance(game, None) {
            if let Some(parent_attach) = public_parent.attachment() {
              game.dust(parent_attach).await;
            }
          }
        }
      }

      if to_zone.is_field() {
        game
          .game
          .modify_card(card, move |mut c| {
            c.field_age = max_field_age.map(|x| x + 1).unwrap_or(0);
          })
          .await;
      }

      // Actually move the card!
      let (from, id) = match game.game.move_card(card, to_player, to_zone).await {
        Ok(from) => from,
        Err(_) => return ResolvedPhaseFailedToResolve.into(),
      };
      // The card is now in its new zone.

      if from.location.map(|z| z.0.is_field()).unwrap_or(false) && to_zone.is_graveyard() {
        game
          .player_mut(from.player)
          .this_turn_stats
          .allies_died
          .push(id.expect("Moving field -> Grave should reveal ID."));
      }

      // Overdraw: If the player's hand is too big now, take the oldest card and put it back in their deck.
      if game.game.player_cards(to_player).hand().len()
        > usize::from(game.game_params.max_hand_size)
      {
        game.run(PhaseOverdraw(to_player)).await;
      }

      let card = id.map(Into::into).unwrap_or(card);

      // Reset sleep when entering field.
      if to_zone.is_field() {
        game
          .modify_card(
            card,
            vec![
              Modifier::SetAttackState(AttackState::Sleeping),
              Modifier::SetDidAttack(false),
            ],
          )
          .await;
        game
          .player_mut(to_player)
          .this_turn_stats
          .units_summoned
          .push(id.expect("moved to field, it must exist"));
      }

      game.update_global_modifiers().await;

      ResolvedPhaseMoveToZone {
        card,
        from,
        to: (to_player, to_zone),
      }
      .into()
    })
  }
}

impl ResolvablePhase for PhaseResolveCardEffect {
  fn verify<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, Result<(), ()>> {
    Box::pin(async move {
      let Self { id, target_id, .. } = self;
      let card = id.instance(game, None).ok_or(())?;
      let player = game.owner(id);
      let on_play = card.base().intrinsic_effect().on_play();
      match (on_play, target_id) {
        (OnPlayEffect::Targeted { does_target, .. }, Some(target_id))
        | (OnPlayEffect::MaybeTargeted { does_target, .. }, Some(target_id))
          if !{
            let game_clone: card_movement_simulator::GameState<SkyWeaver> = Clone::clone(&***game);

            let verify_target = game
              .context()
              .reveal_unique(
                player,
                move |secret| does_target(&game_clone, secret, player, id, target_id),
                |_| true,
              )
              .await;
            let c = target_id
              .instance(game, None)
              .expect("Target doesn't exist.");
            let can_be_targeted = if game.owner(target_id) == player {
              c.can_be_targeted_by_owner
            } else {
              c.can_be_targeted_by_enemy
            };
            verify_target && can_be_targeted
          } =>
        {
          Err(())
        }
        (OnPlayEffect::Targeted { .. }, None)
        | (OnPlayEffect::Untargeted { .. }, Some(_))
        | (OnPlayEffect::None, Some(_)) => Err(()),
        _ => Ok(()),
      }
    })
  }
  fn execute<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase> {
    let Self {
      base_card,
      id,
      target_id,
      played_mana_cost,
      played_by_unit,
    } = self;
    Box::pin(async move {
      let card = id.instance(game, None).unwrap();
      let on_play = card.base().intrinsic_effect().on_play();
      let summon_timing = card.base().intrinsic_effect().summon_timing();
      let owner = game.owner(id);
      let is_silenced = card.view.is_silenced;
      let is_spell = card.view.is_spell();
      let is_unit = card.view.is_unit();
      let has_banner = card.view.traits.contains(&Trait::Banner);

      if is_spell && has_banner {
        // banner on spells grants the caster's hero extra power for this turn
        let banner_size: i8 = game.player(owner).banner_size.try_into().unwrap();
        let hero_id = game.hero_id(owner);
        game
          .grant_modifier_for_turns(
            hero_id,
            id,
            Modifier::ModifyPower(banner_size, Some(ModifyPowerReason::Banner)),
            0,
            1,
          )
          .await;
      }

      if summon_timing == Some(SummonTiming::BeforeText) || (summon_timing.is_none() && is_unit) {
        // `Play:` units have an implicit "Summon this unit." at some point during their effect.
        // Then, we run an aura update to ensure banner, etc, is up-to-date
        game.summon(id).await;
        game.aura_update().await;
      }

      // Skip the effect if it's silenced.
      if !is_silenced {
        game.card_execution_context.push(id);
        // Assume that the target we're passed is a valid one.
        match (on_play, target_id) {
          (OnPlayEffect::Targeted { mutate, .. }, Some(target)) => {
            mutate(game, id, target, owner).await;
          }
          (OnPlayEffect::MaybeTargeted { mutate, .. }, target) => {
            mutate(game, id, target, owner).await;
          }
          (OnPlayEffect::Untargeted { mutate }, None) => {
            mutate(game, id, owner).await;
          }
          (OnPlayEffect::None, None) => {
            // nothing to do!
          }
          (on_play, _) => unreachable!(
            "These PhaseResolveCardEffect arms are eliminated in `verify`. {:?} {:?}",
            match on_play {
              OnPlayEffect::Targeted { .. } => "Targeted",
              OnPlayEffect::Untargeted { .. } => "Untargeted",
              OnPlayEffect::MaybeTargeted { .. } => "MaybeTargeted",
              OnPlayEffect::None => "None",
            },
            target_id
          ),
        };
        assert_eq!(game.card_execution_context.pop(), Some(id));
      }
      if summon_timing == Some(SummonTiming::AfterText)
        || (summon_timing == Some(SummonTiming::Manual) && is_silenced)
      {
        // `Play:` units have an implicit "Summon this unit." at some point during their effect.
        // Then, we run an aura update to ensure banner, etc, is up-to-date
        game.summon(id).await;
        game.aura_update().await;
      }
      if is_spell {
        game.player_mut(owner).this_turn_stats.num_spells_cast += 1;
      }
      game
        .player_mut(owner)
        .this_turn_stats
        .base_cards_played
        .push(base_card);

      ResolvedPhaseResolveCardEffect {
        base_card,
        id,
        target_id,
        played_mana_cost,
        played_by_unit,
      }
      .into()
    })
  }
}

impl ResolvablePhase for PhaseResetCard {
  fn verify<'a>(self, _: &'a mut LiveGame) -> Promisify<'a, Result<(), ()>> {
    Box::pin(async move { Ok(()) })
  }
  fn execute<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase> {
    let Self(ptr) = self;
    Box::pin(async move {
      game.game.reset_card(ptr).await;
      ResolvedPhaseResetCard(ptr).into()
    })
  }
}

impl ResolvablePhase for PhaseGlory {
  fn verify<'a>(self, _: &'a mut LiveGame) -> Promisify<'a, Result<(), ()>> {
    Box::pin(async move { Ok(()) })
  }
  fn execute<'a>(self, _: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase> {
    let Self(id, damage) = self;
    Box::pin(async move { ResolvedPhaseGlory(id, damage).into() })
  }
}

impl ResolvablePhase for PhaseCancelled {
  fn verify<'a>(self, _: &'a mut LiveGame) -> Promisify<'a, Result<(), ()>> {
    Box::pin(async move { Err(()) })
  }
  fn execute<'a>(self, _: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase> {
    unreachable!("A cancelled phase should never resolve.");
  }
}

impl ResolvablePhase for PhaseMulligan {
  fn verify<'a>(self, _: &'a mut LiveGame) -> Promisify<'a, Result<(), ()>> {
    Box::pin(async move { Ok(()) })
  }
  fn execute<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase> {
    Box::pin(async move {
      let Self {
        player,
        to_mulligan,
        draw_delta,
      } = self;

      let mulliganed: Vec<_> = game
        .game
        .filter_cards(to_mulligan, move |c| {
          if let Zone::Hand { .. } = c.zone {
            c.owner == player
          } else {
            false
          }
        })
        .await;

      let count = (mulliganed.len() as i8).saturating_add(draw_delta);

      for card in mulliganed.clone() {
        game.move_to_zone(card, Zone::Deck).await;
      }

      let mut drawn = vec![];
      for _ in 0..count {
        if let Some(drawn_card) = game.draw_any_card(player).await {
          drawn.push(drawn_card);
        }
      }

      ResolvedPhaseMulligan {
        mulliganed,
        drawn,
        player,
      }
      .into()
    })
  }
}

impl ResolvablePhase for PhaseResolveTrigger {
  fn verify<'a>(self, _: &'a mut LiveGame) -> Promisify<'a, Result<(), ()>> {
    Box::pin(async move { Ok(()) })
  }
  fn execute<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase> {
    Box::pin(async move {
      let PhaseResolveTrigger {
        id,
        effect,
        effect_type,
        fire,
      } = self;
      game.card_execution_context.push(id);
      fire(game).await;
      let owner = game.owner(id);
      if game.reveal_from_card(id, |c| c.is_hero_ability()).await
        && effect_type != EffectType::Sunrise
      {
        game
          .player_mut(owner)
          .hero_ability_casts_or_triggers_since_last_turn_start += 1;
      }
      assert_eq!(game.card_execution_context.pop(), Some(id));
      ResolvedPhaseResolveTrigger {
        id,
        effect,
        effect_type,
      }
      .into()
    })
  }
}

impl ResolvablePhase for PhaseResolveCardSelection {
  fn verify<'a>(self, _: &'a mut LiveGame) -> Promisify<'a, Result<(), ()>> {
    Box::pin(async move { Ok(()) })
  }
  fn execute<'a>(self, game: &'a mut LiveGame) -> Promisify<'a, ResolvedPhase> {
    let Self {
      player,
      card_indices,
      is_init_card_selection,
    } = self;

    Box::pin(async move {
      game.is_current_player_selecting_cards = false;
      ResolvedPhaseResolveCardSelection {
        player,
        card_indices,
        is_init_card_selection,
      }
      .into()
    })
  }
}
