use crate::CardSelectionState;
use crate::{
  card::{
    AttackState, CardAttributesWithBase, Modifier, ModifierExpiry, ModifyHealthReason, StoredCard,
  },
  client::GameAction,
  effects::{
    effects_for_card, ActiveTrigger, EarlyTrigger, Effect, NormalTrigger, PhaseModifier, Queue,
    TriggerVariant,
  },
  extensions::*,
  game::{player_has_room_for_unit, AttachmentOverride, GameStatus, GlobalModifier, SkyWeaver},
  library::{enchant, BaseCard, SerializableFilter},
  model::*,
  phase::*,
  saturating_u8::SaturatingU8,
  utils::{enemy, Promisify},
  CardEffect, EffectType, OnPlayEffect,
};
use card_movement_simulator::{
  Card, CardEvent, CardInfo, CardInstance, CardLocation, InstanceID, Player, Zone,
};
use indexmap::IndexMap;
use itertools::Itertools;
use rand::{
  distributions::{Distribution, WeightedError::AllWeightsZero, WeightedIndex},
  seq::{IteratorRandom, SliceRandom},
  Rng, RngCore, SeedableRng,
};
use rand_xorshift::XorShiftRng;
use std::{
  convert::{TryFrom, TryInto},
  ops::{Deref, DerefMut},
  rc::Rc,
};
use strum::IntoEnumIterator;

// crash if we try to execute more than 1,000 phases in one player action.
pub const PHASE_LIMIT: usize = 1_000;
// skip the trigger for that instance, if it has happened more than 13 times in one player action.
pub const TRIGGER_LIMIT: usize = 13;

pub type ActivePublicTriggers = (
  Vec<ActiveTrigger<PhaseModifier>>,
  Vec<ActiveTrigger<EarlyTrigger>>,
  Vec<ActiveTrigger<NormalTrigger>>,
);

pub struct LiveGame<'a> {
  pub game: &'a mut card_movement_simulator::CardGame<SkyWeaver>,
  pub queue: Vec<PhaseResolveTrigger>,
  pub phase_count: usize,
  pub card_execution_context: Vec<InstanceID>,
}
// trait SeekRead: bool + Clone + 'static {}
// impl<T: bool + Clone + 'static> SeekRead for T {}

impl<'a> Deref for LiveGame<'a> {
  type Target = card_movement_simulator::CardGame<SkyWeaver>;

  fn deref(&self) -> &Self::Target {
    self.game
  }
}

impl<'a> DerefMut for LiveGame<'a> {
  fn deref_mut(&mut self) -> &mut Self::Target {
    self.game
  }
}

impl<'a> LiveGame<'a> {
  pub fn context(&mut self) -> &mut card_movement_simulator::Context<SkyWeaver> {
    &mut self.game.context
  }

  /// A Player Action may run one or more Phases.
  /// As those phases run, Trigger Steps will be queued up.
  /// When all the Phases are finished resolving,
  /// we put all the Trigger Steps in the queue into an immutable sequence.
  /// A sequence cannot be interrupted, but its Phases may queue trigger steps into the next sequence.
  /// After each sequence, we cleanup units that are marked for death, and run an aura update step.
  pub async fn resolve_triggers(&mut self) {
    if self.check_game_over().await {
      return;
    }
    if !self.effect_resolution_enabled {
      self.queue.clear();
    }
    let mut trigger_map: IndexMap<InstanceID, usize> = IndexMap::new();
    loop {
      let sequence: Vec<_> = self.queue.drain(..).collect();
      for phase in sequence {
        self.cleanup_dead_units().await;
        let id = phase.id;
        if let Some(count) = trigger_map.get(&id) {
          if count > &TRIGGER_LIMIT {
            continue;
          }
        }
        if self.reveal_from_card(id, |c| c.is_silenced).await {
          continue;
        }

        self.run(phase).await;
        trigger_map.entry(id).and_modify(|c| *c += 1).or_insert(1);

        if self.check_game_over().await {
          return;
        }
      }
      self.cleanup_dead_units().await;
      self.aura_update().await;
      if self.check_game_over().await {
        return;
      }
      if self.queue.is_empty() {
        break;
      }
      if !self.effect_resolution_enabled {
        self.queue.clear();
      }
    }

    let grave_cards: Vec<_> = self
      .player_and_enemy_cards()
      .iter()
      .flat_map(|cards| cards.graveyard().iter())
      .copied()
      .collect();
    for id in grave_cards {
      if self
        .reveal_from_card(id, |c| c.marked_for_death.is_some())
        .await
      {
        self.reset_card(id).await;
      }
    }
  }

  pub fn log(&mut self, action: GameAction) {
    self.context().log(CardEvent::GameEvent { event: action });
  }

  pub async fn create_card(&mut self, player: Player, mut base: BaseCard) -> InstanceID {
    let card_context = self.card_execution_context.last().copied();
    let rarity = if let Some(creator_card) = card_context {
      self.reveal_from_card(creator_card, |c| c.rarity).await
    } else {
      Rarity::Base
    };
    if let Some(swapped_base_card) = self.game.state.player(player).base_card_swaps.get(&base) {
      base = *swapped_base_card;
    }

    let card = self.game.new_card(player, base).await;
    let attach = card
      .instance(self.game, None)
      .expect("Just-instantiated public card is public.")
      .attachment();
    self
      .modify_card(card, vec![Modifier::SetRarity(rarity)])
      .await;
    if let Some(attach) = attach {
      self
        .modify_card(attach, vec![Modifier::SetRarity(rarity)])
        .await;
    }
    self.update_global_modifiers().await;
    card
  }
  pub async fn change_all_base_cards(
    &mut self,
    player: Player,
    old_base: BaseCard,
    new_base: BaseCard,
  ) {
    self
      .state
      .player_mut(player)
      .base_card_swaps
      .insert(old_base, new_base);
    let my_cards = self.player_cards(player);
    let public_hand_cards_with_old_base: Vec<_> = my_cards
      .hand()
      .iter()
      .flatten()
      .filter(|c| c.instance(self, None).unwrap().base() == &old_base)
      .copied()
      .collect();
    let field_cards_with_old_base: Vec<_> = my_cards
      .field()
      .iter()
      .filter(|c| c.instance(self, None).unwrap().base() == &old_base)
      .copied()
      .collect();
    let grave_cards_with_old_base: Vec<_> = my_cards
      .graveyard()
      .iter()
      .filter(|c| c.instance(self, None).unwrap().base() == &old_base)
      .copied()
      .collect();

    for c in field_cards_with_old_base
      .into_iter()
      .chain(grave_cards_with_old_base.clone().into_iter())
      .chain(public_hand_cards_with_old_base.into_iter())
    {
      self.change_base_card(c, new_base).await;
      self
        .game
        .modify_card(c, |mut cc| {
          cc._internal_instance_mut()
            .effects
            .retain(|ccc| ccc != &CardEffect::Intrinsic(old_base));
          cc._internal_instance_mut()
            .effects
            .push(CardEffect::Intrinsic(new_base));
        })
        .await;
    }
    for c in grave_cards_with_old_base.clone().into_iter() {
      self.reset_card(c).await;
    }
    self.context().mutate_secret(player, move |secret| {
      let deck_cards_with_old_base: Vec<_> = secret
        .deck()
        .iter()
        .filter(|c| secret.instance(**c).unwrap().base() == &old_base)
        .copied()
        .collect();
      let hand_cards_with_old_base: Vec<_> = secret
        .hand()
        .iter()
        .flatten()
        .filter(|c| secret.instance(**c).unwrap().base() == &old_base)
        .copied()
        .collect();

      for c in deck_cards_with_old_base
        .into_iter()
        .chain(hand_cards_with_old_base.into_iter())
      {
        secret
          .secret
          .change_base_card(c, secret.log, new_base)
          .expect("Card not in secret deck");
        secret
          .secret
          .modify_card(c, secret.log, |mut cc| {
            cc._internal_instance_mut()
              .effects
              .retain(|ccc| ccc != &CardEffect::Intrinsic(old_base));
            cc._internal_instance_mut()
              .effects
              .push(CardEffect::Intrinsic(new_base));
          })
          .expect("Card must be in secret zone");
      }
    });
  }
  pub async fn create_card_from_stored_card(&mut self, stored_card: StoredCard) -> InstanceID {
    let StoredCard {
      owner,
      card,
      attachment,
    } = stored_card;
    let id = self.game.new_card(owner, card.0).await;
    if let Some(attach) = id.instance(self.game, None).unwrap().attachment() {
      self.dust(attach).await;
    }
    self
      .game
      .modify_card(id, move |mut c| c.copy_instance_and_modifiers(&card.1))
      .await;
    if let Some(attachment) = attachment {
      let attach_id = self.game.new_card(owner, attachment.0).await;
      self
        .game
        .modify_card(attach_id, move |mut c| {
          c.copy_instance_and_modifiers(&attachment.1)
        })
        .await;
      self
        .move_to_zone(attach_id, Zone::Attachment { parent: id.into() })
        .await;
    }

    id
  }

  pub async fn start_game(&mut self) {
    // Do this very first to work around first await point bug in client

    // get rid of disco odds for cards not in season
    self.game_params.random_deck_odds = self.game_params.random_deck_odds.take().map(|d| {
      d.into_iter()
        .map(|(card, val)| {
          (
            card,
            if card.season() <= self.game_params.season {
              val
            } else {
              0.0
            },
          )
        })
        .collect()
    });

    // Randomness for generating random decks must come from both public state and secret state.
    // If we only used public state, players would be able to infer the opponent's deck, since it'd be created with the same rng.
    // If we only used secret state, players would be able to influence their starting deck by choosing a different random seed.
    // We use both public and secret RNGs instead of just public RNG & some entropy from secret,
    // Because we can't make guarantees that a secret will have any entropy.
    let public_entropy: [u8; 16] = {
      let mut public_random = self.context().random().await;
      let mut public_entropy = [0; 16];
      public_random.fill_bytes(&mut public_entropy);
      public_entropy
    };

    if self.game_params.skip_mulligan {
      for player in 0..=1 {
        self.game_params.player_params[player].mulligan_pool_size = 0;
      }
    }
    let whitelist = self.game_params.card_whitelist.clone();
    let allow_beyond_deck_draw_outside_prisms =
      self.game_params.allow_beyond_deck_draw_outside_prisms;

    // Instantiate and summon the heros
    // we instantiate them first, since most of the game expects
    // 2 heroes to always exist.
    let x = self.card_execution_context.drain(..).collect_vec();
    for player in 0..=1 {
      self.create_card(player, BaseCard::Hero).await;
    }
    self.card_execution_context = x;
    for player in 0..=1 {
      let hero = self.hero_id(player);
      let hero_mods = self.game_params.player_params[usize::from(player)]
        .hero_modifiers
        .clone();
      self.modify_card(hero, hero_mods).await;
      self.summon(hero).await;
      self.ready(hero).await;
      if let Some(tavern_mode) = self.game_params.tavern_mode {
        tavern_mode.apply_game_rules(self, player).await;
        self.game_params.max_turn_count = 999;
      }
      if let Some((starting_spell, modifiers)) = self.game_params.player_params[usize::from(player)]
        .hero_spell
        .clone()
      {
        let attach = self.give_spell(hero, starting_spell).await.unwrap();
        self.modify_card(attach, modifiers).await;
      }
    }
    for p_id in 0..=1 {
      let has_regular_deck = self
        .game
        .context
        .reveal_unique(p_id, |secret| !secret.original_deck.is_empty(), |_| true)
        .await;
      let has_override_deck = !self.game.game_params.player_params[p_id as usize]
        .deck
        .is_empty();
      let override_deck = match (has_regular_deck, has_override_deck) {
        (true, true) => {
          panic!(
            "Player {} was passed both a deck of cards and an override deck.",
            p_id
          )
        }
        (false, true) => Some(
          self.game.game_params.player_params[p_id as usize]
            .deck
            .clone(),
        ),
        (true, false) | (false, false) => None,
      };

      let required_deck_size = self.required_deck_size(p_id);
      // Secretly generate the rest of the cards in your deck.
      let prisms = self.player(p_id).prisms.clone();
      let random_deck_odds = self.game_params.random_deck_odds.clone();
      let season = self.game_params.season;
      self.context().mutate_secret(p_id, |mut secret| {
        let combined_entropy: [u8; 16] = {
          let mut combined_entropy = [0; 16];
          secret.random.fill_bytes(&mut combined_entropy);
          combined_entropy
            .iter_mut()
            .zip(&public_entropy)
            .for_each(|(b, a)| *b ^= *a);
          combined_entropy
        };

        // NOTE: It's very important that we fill decks using the combined rng,
        // not just with secret randomness.
        // See comment at `public_entropy` definition.
        let mut secret_random = XorShiftRng::from_seed(combined_entropy);

        // create the list of cards you're *not* allowed to draw beyond deck.
        secret.singleton_cards_posessed = BaseCard::iter()
          .filter(|c| {
            // if we allow beyond deck draw outside prisms, all cards are ok.
            // else, only cards in your prisms are ok.
            let allowed_for_prism =
              allow_beyond_deck_draw_outside_prisms || prisms.contains(&c.instance().prism);

            // If there's a whitelist, allow only those cards.
            let allowed_by_whitelist = if let Some(whitelist) = &whitelist {
              whitelist.contains(c)
            } else {
              true
            };

            // cards in your deck are never allowed to be conjured
            let not_in_deck = if let Some(deck) = &override_deck {
              !deck.iter().any(|bc| bc.base == *c)
            } else {
              !secret.original_deck.contains(c)
            };

            // cards not in this season cannot be conjured
            let in_season = c.season() <= season;

            let is_allowed = in_season && allowed_for_prism && allowed_by_whitelist && not_in_deck;

            // and since we're building the list of cards *not* allowed, invert is_allowed
            !is_allowed
          })
          .collect();
        if override_deck.is_none() {
          // Filled deck extends original deck.
          secret.filled_deck = secret.original_deck.clone();

          // Fill your deck from your prisms.
          if secret.filled_deck.len() < required_deck_size {
            let card_pool: Vec<_> = BaseCard::iter()
              .filter(|c| {
                let card_already_posessed = secret.singleton_cards_posessed.contains(c);
                let prism_matches = prisms.contains(&c.instance().prism);

                !card_already_posessed && prism_matches
              })
              .collect();
            let mut distribution = WeightedIndex::new(card_pool.iter().map(|c| {
              if let Some(discovery_odds) = &random_deck_odds {
                *discovery_odds
                  .get(c)
                  .expect("Every card in deckbuildable prisms must be in random_deck_odds")
              } else if c.season() <= season {
                100.0
              } else {
                0.0
              }
            }))
            .unwrap();
            let current_deck_len = secret.filled_deck.len();
            let num_cards_to_pick = required_deck_size - current_deck_len;

            for _ in 0..num_cards_to_pick {
              let picked_card_index = distribution.sample(&mut secret_random);
              secret.filled_deck.push(card_pool[picked_card_index]);
              // Then remove this card from the distribution so we can't sample it again.
              if let Some(AllWeightsZero) = distribution
                .update_weights(&[(picked_card_index, &0.0)])
                .err()
              {
                // stop adding cards to the deck when we run out of cards.
                break;
              }
            }
          }

          // Make sure we can't draw a card from our filled deck from beyond deck.
          for card in &secret.secret.secret.filled_deck {
            secret.secret.secret.singleton_cards_posessed.insert(*card);
          }
        }
      });

      // instantiate these new secret cards
      let new_cards = if let Some(deck) = override_deck {
        let mut ids: Vec<Card> = vec![];
        for card in deck {
          let base = card.base;
          let id = self.create_card(p_id, base).await;
          self.modify_card(id, card.modifiers).await;
          ids.push(id.into());
          match card.attachment {
            Some(AttachmentOverride::Remove) => {
              let attach_id = self
                .reveal_from_card(id, |c| c.attachment.map(|c| c.id()))
                .await;
              self
                .dust(attach_id.unwrap_or_else(|| {
                  panic!(
                    "AttachmentOverride::Remove specified on card {:?} without an attachment.",
                    base
                  )
                }))
                .await;
            }
            Some(AttachmentOverride::Override(base, mods)) => {
              let attach = self.give_spell(id, base).await.expect("Attach failed!");
              self.modify_card(attach, mods).await;
            }
            None => {}
          }
        }
        ids
      } else {
        self
          .game
          .new_secret_cards(p_id, |mut secret| {
            for base_card in secret.filled_deck.clone() {
              let id = secret.create_card(base_card, None);
              secret.filled_deck_instances.push(id);
            }
          })
          .await
      };
      // And put them in the deck
      for card in new_cards {
        self.move_to_zone(card, Zone::Deck).await;
      }
    }

    for p_id in 0..=1u8 {
      let init_field = self.game_params.player_params[p_id as usize].field.clone();
      for card in init_field {
        let base = card.base;
        self
          .instantiate_and_run_and_summon(p_id, base, move |game, id| {
            let card = card.clone();
            Box::pin(async move {
              game.modify_card(id, card.modifiers).await;
              match card.attachment {
                Some(AttachmentOverride::Override(attach_base, mods)) => {
                  let spell = game.create_card(p_id, attach_base).await;
                  game.modify_card(spell, mods).await;
                  game
                    .move_to_zone(spell, Zone::Attachment { parent: id })
                    .await;
                }
                Some(AttachmentOverride::Remove) => {
                  let attach_id = game
                    .reveal_from_card(id, |c| c.attachment.map(|c| c.id()))
                    .await;
                  game
                    .dust(attach_id.unwrap_or_else(|| {
                      panic!(
                        "AttachmentOverride::Remove specified on card {:?} without an attachment.",
                        base
                      )
                    }))
                    .await;
                }
                None => {}
              }
            })
          })
          .await;
      }
      let init_graveyard = self.game_params.player_params[p_id as usize]
        .graveyard
        .clone();
      for card in init_graveyard {
        let card = self.create_card(p_id, card).await;
        self.move_to_zone(card, Zone::Graveyard).await;
      }

      let hero_ability = self.player(p_id).hero_ability_base;
      if let Some(card) = hero_ability {
        let card = self.create_card(p_id, card).await;
        self.move_to_zone(card, Zone::HeroAbility).await;
      }
      // If there's not enough cards to do a mulligan phase, skip it.
      if self.game_params.skip_mulligan
        || self.game.player_cards(p_id).deck() < self.required_deck_size(p_id)
      {
        self.player_mut(p_id).done_card_selection = true;
        self
          .run_parallel(
            (0..self.game_params.player_params[p_id as usize].mulligan_choice_size)
              .map(|_| PhaseDraw {
                from: (p_id, CardPool::Anywhere),
                to: (p_id, Zone::Hand { public: false }),
                predicate: Some(std::rc::Rc::new(|_, _| true)),
              })
              .collect(),
          )
          .await;
      } else {
        // Regular card selection phase!
        let mulligan_pool_size = self.game_params.player_params[p_id as usize].mulligan_pool_size;
        let rig_deck_order = self.game_params.rig_deck_order;
        let mulligan_card_ptrs = self
          .new_secret_pointers(p_id, move |mut secret| {
            let mut mul_card_ids = Vec::with_capacity(usize::from(mulligan_pool_size));
            // C593 Niko always appears in your opening card selection.
            if let Some(niko_id) = secret
              .deck()
              .iter()
              .find(|c| {
                *secret.instance(*c).expect("Deck cards are secret").base() == BaseCard::C2039
              })
              .copied()
            {
              mul_card_ids.push(niko_id);
            }

            let num_cards_to_add_to_mulligan = usize::from(mulligan_pool_size) - mul_card_ids.len();
            let valid_deck_cards_for_mulligan: Vec<_> = secret
              .deck()
              .iter()
              .copied()
              // Filter out cards already in selection so we don't end up with duplicates in card selection
              .filter(|id| !mul_card_ids.contains(id))
              .collect();
            if rig_deck_order {
              for card in &valid_deck_cards_for_mulligan[0..num_cards_to_add_to_mulligan] {
                mul_card_ids.push(*card);
              }
            } else {
              for card in valid_deck_cards_for_mulligan
                .into_iter()
                .choose_multiple(&mut secret.random, num_cards_to_add_to_mulligan)
              {
                mul_card_ids.push(card);
              }
            }

            for card in mul_card_ids {
              secret.new_pointer(card);
            }
          })
          .await;
        let mulligan_choice_size =
          self.game_params.player_params[p_id as usize].mulligan_choice_size;
        let hero = self.hero_id(p_id);
        self
          .add_modifier(
            hero,
            hero,
            Modifier::GrantEffect(CardEffect::CardSelection),
            true,
            0,
          )
          .await;
        self
          .begin_choose_for_player(
            p_id,
            mulligan_choice_size as usize,
            mulligan_choice_size as usize,
            None,
            mulligan_card_ptrs,
          )
          .await;
      }
    }
    self.status = GameStatus::Playing;
    self.resolve_triggers().await;

    self.start_game_after_card_selection_completed().await;
  }

  pub async fn start_game_after_card_selection_completed(&mut self) {
    if !self.players.iter().all(|p| p.done_card_selection) {
      return;
    }
    for player in 0..=1 {
      let starting_hand_cards = self.game_params.player_params[usize::from(player)]
        .cards_added_to_hand_after_mulligan
        .clone();
      for (card, modifiers) in starting_hand_cards {
        let created_card = self.create_card(player, card).await;
        self.modify_card(created_card, modifiers).await;
        self
          .move_to_zone(created_card, Zone::Hand { public: true })
          .await;
      }
    }

    if self.game_params.skip_first_turn_start {
      self.resolve_triggers().await;
    } else {
      self.run(PhaseStartTurn(self.current_player)).await;
    }
    if self.game_params.krampus_mode {
      let mut rng = self.context().random().await;
      let krampus_player: Player = if rng.gen() { 0 } else { 1 };
      self
        .instantiate_and_summon(krampus_player, BaseCard::C30065)
        .await;
    }

    // emit init events for hero abils :)
    for p in 0..=1 {
      self.change_max_mana(p, 0).await;
      self.change_mana(p, 0).await;
    }
  }

  pub fn get_active_public_triggers(&self) -> ActivePublicTriggers {
    let active_effects: Vec<_> = self
      .player_and_enemy_cards()
      .iter()
      .enumerate()
      .flat_map(|(player, cards)| {
        cards
          .field()
          .iter()
          .map(move |id| (player, (Zone::Field, *id)))
      })
      .chain(
        self
          .player_and_enemy_cards()
          .iter()
          .enumerate()
          .flat_map(|(player, cards)| {
            cards
              .graveyard()
              .iter()
              .map(move |id| (player, (Zone::Graveyard, *id)))
          }),
      )
      .chain(
        self
          .player_and_enemy_cards()
          .iter()
          .enumerate()
          .flat_map(|(player, cards)| {
            cards
              .casting()
              .iter()
              .map(move |id| (player, (Zone::Casting, *id)))
          }),
      )
      .chain(
        self
          .player_and_enemy_cards()
          .iter()
          .enumerate()
          .flat_map(|(player, cards)| {
            cards
              .hand()
              .iter()
              .filter_map(move |id| id.map(|id| (player, (Zone::Hand { public: true }, id))))
          }),
      )
      .chain(
        self
          .player_and_enemy_cards()
          .iter()
          .enumerate()
          .flat_map(|(player, cards)| {
            cards
              .hero_ability()
              .iter()
              .map(move |id| (player, (Zone::HeroAbility, *id)))
          }),
      )
      .flat_map(|(player, (zone, id))| {
        std::iter::once((player, (zone, id))).chain(
          id.instance(self, None)
            .expect("Cards in public zones are public")
            .attachment()
            .map(|attach_id| (player, (Zone::Attachment { parent: id.into() }, attach_id))),
        )
      })
      .sorted_by_key(|(p, _)| {
        // current player's effects always fire before opponent's effects.
        *p != usize::from(self.current_player)
      })
      .flat_map(|(_, (zone, id))| {
        let card = id
          .instance(self, None)
          .expect("Public trigger cards are public.");

        effects_for_card(id, card, zone)
          .into_iter()
          .map(move |(id, base)| (id, base, zone, card))
      })
      .collect();
    let mut phase_modifiers: Vec<ActiveTrigger<PhaseModifier>> = Vec::new();
    let mut early_triggers: Vec<ActiveTrigger<EarlyTrigger>> = Vec::new();
    let mut normal_triggers: Vec<ActiveTrigger<NormalTrigger>> = Vec::new();
    for (id, effect_provider, zone, card) in active_effects {
      if let Some(triggers) = match &effect_provider.effect() {
        Effect::Unit { triggers, .. } => Some(triggers),
        Effect::Spell { triggers, .. } => Some(triggers),
        Effect::HeroAbility { triggers, .. } => Some(triggers),
        Effect::None | Effect::Enchant { .. } => None,
      } {
        for (effect_index, trigger) in triggers.iter().enumerate() {
          if trigger.is_active(zone, card) {
            match trigger {
              TriggerVariant::Normal(_) => {
                normal_triggers.push(ActiveTrigger::new(id, effect_provider, effect_index))
              }
              TriggerVariant::Early(_) => {
                early_triggers.push(ActiveTrigger::new(id, effect_provider, effect_index))
              }
              TriggerVariant::PhaseModifier(_) => {
                phase_modifiers.push(ActiveTrigger::new(id, effect_provider, effect_index))
              }
              TriggerVariant::SecretEarly(..) | TriggerVariant::SecretNormal(..) => {}
            }
          }
        }
      }
    }

    // NOTE: booleans sort to [false, true]

    // TODO de-duplicate these identical functions
    phase_modifiers.sort_by_key(|trigger| {
      let instance = trigger.card_effect().source_card().instance();
      (
        // Priority should be considered before spells/attachments
        trigger.get().priority,
        // Units should fire after spells/attachments
        instance.is_unit() || instance.is_hero(),
      )
    });
    early_triggers.sort_by_key(|trigger| {
      let instance = trigger.card_effect().source_card().instance();
      (
        // Priority should be considered before spells/attachments
        trigger.get().priority,
        // Units should fire after spells/attachments
        instance.is_unit() || instance.is_hero(),
      )
    });
    normal_triggers.sort_by_key(|trigger| {
      let instance = trigger.card_effect().source_card().instance();
      (
        // Priority should be considered before spells/attachments
        trigger.get().priority,
        // Units should fire after spells/attachments
        instance.is_unit() || instance.is_hero(),
      )
    });
    (phase_modifiers, early_triggers, normal_triggers)
  }

  /// Runs all triggered effects & resolves the phase itself, then returns the resolved phase.
  pub async fn run(&mut self, phase: impl Into<Phase>) -> ResolvedPhase {
    let phase_list: Vec<Phase> = vec![phase.into()];
    self
      .run_parallel(phase_list)
      .await
      .drain(..)
      .next()
      .unwrap()
  }

  /// Runs Phase modifiers, EarlyTriggers, Phase resolution, and queues Triggers.
  /// Returns a ResolvedPhase for each Phase passed in.
  pub async fn run_parallel(&mut self, phases: Vec<impl Into<Phase>>) -> Vec<ResolvedPhase> {
    if phases.is_empty() {
      return vec![];
    }
    let phases: Vec<Phase> = phases.into_iter().map(|v| v.into()).collect();

    let is_multi_phase = phases.len() > 1;
    if is_multi_phase {
      self.log(GameAction::EnterParallelPhases);
    }

    // Prepare and order triggers
    let (phase_modifiers, early_triggers, normal_triggers) = self.get_active_public_triggers();

    let mut resolved_phases: Vec<ResolvedPhase> = Vec::new();

    for mut phase in phases {
      let mut early_triggers = early_triggers.clone();
      let mut normal_triggers = normal_triggers.clone();
      self.phase_count += 1;
      if self.phase_count > PHASE_LIMIT {
        panic!(
          "Tried to execute more than {} phases in a single player action!",
          PHASE_LIMIT
        )
      }

      // Run all phase modifiers, get the resulting modified phase.
      for phase_modifier in &phase_modifiers {
        let old = phase.clone();
        if let Some(new_phase) = (phase_modifier.get().run)(
          self,
          phase_modifier.instance(),
          &old,
          phase_modifier.card_effect(),
        )
        .await
        {
          self.log(GameAction::PhaseModified {
            old,
            new: new_phase.clone(),
            effect_type: phase_modifier.get().effect_type,
            source: phase_modifier.instance(),
          });
          phase = new_phase;
        }
      }

      // Handle interlaced secret & public EarlyTriggers (for auras specifically)
      // TODO Do we need to handle interlaced secret & public other kinds of triggers too?
      {
        let mut priority_index = i8::MIN;
        for player in 0..2 {
          self.context.mutate_secret(player, |mut secret| {
            let secret_early_triggers = crate::effects::get_active_secret_triggers(&secret).0;
            secret.secret_early_triggers.push(secret_early_triggers);
          });
        }

        loop {
          let next_public_priority = early_triggers
            .iter()
            .map(|t| t.get().priority)
            .find(|p| *p > priority_index)
            .unwrap_or(i8::MAX);

          for player in &[self.game.current_player, enemy(self.game.current_player)] {
            let state = &self.game.state;
            let context = &mut self.game.context;
            context.mutate_secret(*player, |mut secret| {
              let secret_early = &mut secret
                .secret_early_triggers
                .last_mut()
                .expect("secret_early_triggers must have at least one value here!");

              let index_of_secret_item_gt_next_public_priority = secret_early
                .iter()
                .position(|t| t.get().priority > next_public_priority)
                .unwrap_or(secret_early.len());

              let secret_items_priority_lt_next_public_priority: Vec<_> = secret_early
                .drain(..index_of_secret_item_gt_next_public_priority)
                .collect();

              for trigger in secret_items_priority_lt_next_public_priority {
                (trigger.get().run)(
                  state,
                  secret.secret,
                  secret.random,
                  secret.log,
                  trigger.instance(),
                  phase.clone(),
                );
              }
            });
          }
          if early_triggers.is_empty() {
            break;
          }
          let index_of_last_public_item_with_next_public_priority = 1
            + early_triggers
              .iter()
              .rposition(|t| t.get().priority == next_public_priority)
              .expect("Since the array !is_empty(), this will never fail.");
          let public_items_lt_eq_next_public_priority: Vec<_> = early_triggers
            .drain(..index_of_last_public_item_with_next_public_priority)
            .collect();
          for trigger in public_items_lt_eq_next_public_priority {
            (trigger.get().run)(
              self,
              trigger.instance(),
              phase.clone(),
              trigger.card_effect(),
            )
            .await;
          }

          priority_index = next_public_priority;
        }
        for player in 0..2 {
          self.context.mutate_secret(player, |mut secret| {
            secret.secret_early_triggers.pop();
          });
        }
      }

      let resolved_phase = phase.resolve(self).await;
      resolved_phases.push(resolved_phase.clone());
      // A summoned unit can trigger on its own summon event
      if let Ok(ResolvedPhaseMoveToZone {
        card,
        to: (_, Zone::Field),
        ..
      }) = <&_>::try_from(&resolved_phase)
      {
        let (id, effects) = self
          .reveal_from_card(*card, |c| (c.id(), c.effects.clone()))
          .await;
        for effect in effects {
          if let Effect::Unit { triggers, .. } = effect.effect() {
            for (trigger_index, trigger) in triggers.iter().enumerate() {
              if let TriggerVariant::Normal(_) = trigger {
                normal_triggers.push(ActiveTrigger::new(id, effect, trigger_index));
              }
            }
          }
        }
      }
      // Queue all normal triggers
      for trigger in &normal_triggers {
        let mut queue = Queue::default();
        (trigger.get().run)(
          self,
          &mut queue,
          trigger.instance(),
          resolved_phase.clone(),
          trigger.card_effect(),
        )
        .await;
        for fire in queue.into_inner() {
          self.queue.push(PhaseResolveTrigger {
            id: trigger.instance(),
            effect: trigger.card_effect(),
            effect_type: trigger.get().effect_type,
            fire,
          });
        }
      }
      // Run all secret normal triggers
      for player in 0..2 {
        let state = &self.game.state;
        let context = &mut self.game.context;
        context.mutate_secret(player, |secret| {
          let secret_normal_triggers = crate::effects::get_active_secret_triggers(&secret).1;
          for trigger in secret_normal_triggers {
            (trigger.get().run)(
              state,
              secret.secret,
              secret.random,
              secret.log,
              trigger.instance(),
              resolved_phase.clone(),
            );
          }
        });
      }
    }
    if is_multi_phase {
      self.log(GameAction::ExitParallelPhases);
    }
    resolved_phases
  }

  pub async fn check_game_over(&mut self) -> bool {
    // Check for a new game over, but don't mess with the results if we already have one.
    if !self.is_game_over() {
      let p1_id = self.hero_id(0);
      let is_p1_dead = self
        .game
        .reveal_from_card(p1_id, |hero| hero.marked_for_death.is_some())
        .await;
      let p2_id = self.hero_id(1);
      let is_p2_dead = self
        .game
        .reveal_from_card(p2_id, |hero| hero.marked_for_death.is_some())
        .await;
      match (is_p1_dead, is_p2_dead) {
        (true, true) => {
          // a tie!
          self.status = GameStatus::GameOver { winner: None };
        }
        (true, false) => {
          // p1 is dead, so p2 wins!
          self.status = GameStatus::GameOver { winner: Some(1) };
        }
        (false, true) => {
          // p2 is dead, so p1 wins!
          self.status = GameStatus::GameOver { winner: Some(0) };
        }
        (false, false) => {
          // nobody's dead :^)
        }
      }
    }
    self.is_game_over()
  }

  pub async fn pass_turn(&mut self) {
    self.run(PhaseEndTurn(self.current_player)).await;
    self.resolve_triggers().await;
    self.current_player = enemy(self.current_player);
    self.run(PhaseStartTurn(self.current_player)).await;
  }

  pub async fn damage_many(
    &mut self,
    targets: &[InstanceID],
    amount: u8,
    source: InstanceID,
  ) -> Vec<SaturatingU8> {
    let mut damage_phases = vec![];
    for unit_id in targets {
      damage_phases.push(
        self
          .build_damage(*unit_id, amount, source, DamageKind::CardEffect)
          .await,
      );
    }
    self
      .run_parallel(damage_phases)
      .await
      .iter()
      .map(|phase| {
        if let Ok(ResolvedPhaseDamage { amount, .. }) = <&_>::try_from(phase) {
          *amount
        } else {
          0.into()
        }
      })
      .collect()
  }

  pub async fn damage(
    &mut self,
    target: InstanceID,
    amount: u8,
    source: InstanceID,
  ) -> (SaturatingU8, SaturatingU8) {
    let damage_phase = self
      .build_damage(target, amount, source, DamageKind::CardEffect)
      .await;
    if let Ok(ResolvedPhaseDamage {
      amount, overkill, ..
    }) = self.run(damage_phase).await.try_into()
    {
      (amount, overkill)
    } else {
      (0.into(), 0.into())
    }
  }

  pub async fn combat_damage(
    &mut self,
    target: InstanceID,
    amount: u8,
    source: InstanceID,
    is_retaliation: bool,
  ) -> (SaturatingU8, SaturatingU8) {
    let damage_phase = self
      .build_damage(
        target,
        amount,
        source,
        DamageKind::Combat { is_retaliation },
      )
      .await;
    if let Ok(ResolvedPhaseDamage {
      amount, overkill, ..
    }) = self.run(damage_phase).await.try_into()
    {
      (amount, overkill)
    } else {
      (0.into(), 0.into())
    }
  }

  pub async fn build_damage(
    &mut self,
    target: InstanceID,
    amount: u8,
    source: InstanceID,
    kind: DamageKind,
  ) -> PhaseDamage {
    let (has_wither, has_lifesteal) = self
      .game
      .reveal_from_card(source, |c| {
        (
          c.traits.contains(&Trait::Wither),
          c.traits.contains(&Trait::Lifesteal),
        )
      })
      .await;

    let lifesteal_from = if has_lifesteal {
      Some(enemy(self.owner(source)))
    } else {
      None
    };

    PhaseDamage {
      target,
      amount: amount.into(),
      source,
      is_wither: has_wither,
      lifesteal_from,
      kind,
    }
  }

  pub async fn heal(&mut self, target: impl Into<Card> + Copy, amount: u8) -> SaturatingU8 {
    if let Ok(ResolvedPhaseModifyCard {
      card,
      modifier: Modifier::ModifyHealth(amount, _),
      ..
    }) = self
      .run(PhaseModifyCard {
        card: target.into(),
        modifier: Modifier::ModifyHealth(SaturatingU8::from(amount).into(), None),
        source: *self.card_execution_context.last().unwrap(),
      })
      .await
      .try_into()
    {
      if card.eq(target).unwrap_or(false) {
        amount.into()
      } else {
        0.into()
      }
    } else {
      0.into()
    }
  }

  pub async fn move_to_zone(&mut self, card: impl Into<Card>, zone: Zone) -> bool {
    let card = card.into();
    let player = self.reveal_from_card(card, |c| c.owner).await;
    if let Ok(ResolvedPhaseMoveToZone {
      card: n_card,
      to: (n_player, n_zone),
      ..
    }) = self
      .run(PhaseMoveToZone { card, zone, player })
      .await
      .try_into()
    {
      card.eq(n_card).unwrap_or(false) && zone.eq(n_zone).unwrap_or(false) && player == n_player
    } else {
      false
    }
  }
  pub async fn move_to_zone_many(&mut self, cards: Vec<Card>, zone: Zone) -> Vec<ResolvedPhase> {
    let move_phases: Vec<_> = self
      .reveal_from_cards(cards.clone(), |c| c.owner)
      .await
      .iter()
      .zip(cards.iter())
      .map(|(&player, &card)| PhaseMoveToZone { card, zone, player })
      .collect();
    self.run_parallel(move_phases).await
  }
  pub async fn bounce(&mut self, card_id: InstanceID) {
    self
      .move_to_zone(card_id, Zone::Hand { public: true })
      .await;
  }
  pub async fn bounce_many(&mut self, cards: Vec<InstanceID>) {
    self
      .move_to_zone_many(
        cards.iter().map_into().collect(),
        Zone::Hand { public: true },
      )
      .await;
  }

  /// Execute the text on a given card, with an optional target.
  pub async fn resolve_card_effect_as_player(
    &mut self,
    id: InstanceID,
    target_id: Option<InstanceID>,
    played_mana_cost: SaturatingU8,
  ) {
    let base_card = id.instance(self, None).map(|c| *c.base());
    if let Some(base_card) = base_card {
      self
        .run(PhaseResolveCardEffect {
          base_card,
          id,
          target_id,
          played_mana_cost,
          played_by_unit: false,
        })
        .await;
    }
  }
  /// Execute the text on a given card, with an optional target.
  pub async fn resolve_card_effect_as_unit(
    &mut self,
    id: InstanceID,
    target_id: Option<InstanceID>,
    played_mana_cost: SaturatingU8,
  ) {
    let base_card = id.instance(self, None).map(|c| *c.base());
    if let Some(base_card) = base_card {
      self.aura_update().await;
      self
        .run(PhaseResolveCardEffect {
          base_card,
          id,
          target_id,
          played_mana_cost,
          played_by_unit: true,
        })
        .await;
    }
  }

  pub async fn kill(&mut self, card_id: InstanceID) {
    let ctx = *self.card_execution_context.last().unwrap();
    self
      .modify_card_single(card_id, Modifier::MarkedForDeath(ctx))
      .await;
  }
  pub async fn kill_many(&mut self, ids: Vec<InstanceID>) {
    let ctx = *self.card_execution_context.last().unwrap();
    let kill_phases: Vec<_> = ids
      .into_iter()
      .map(|id| PhaseModifyCard {
        card: id.into(),
        modifier: Modifier::MarkedForDeath(ctx),
        source: ctx,
      })
      .collect();
    self.run_parallel(kill_phases).await;
  }

  pub async fn draw_any_card(&mut self, player: Player) -> Option<Card> {
    if let Ok(ResolvedPhaseDraw { drawn_card, .. }) = self
      .run(PhaseDraw {
        from: (player, CardPool::Anywhere),
        to: (player, Zone::Hand { public: false }),
        predicate: None,
      })
      .await
      .try_into()
    {
      Some(drawn_card)
    } else {
      None
    }
  }

  pub async fn draw(
    &mut self,
    player: Player,
    predicate: impl Fn(CardAttributesWithBase, Option<CardAttributesWithBase>) -> bool + 'static,
  ) -> Option<Card> {
    if let Ok(ResolvedPhaseDraw { drawn_card, .. }) = self
      .run(PhaseDraw {
        from: (player, CardPool::Anywhere),
        to: (player, Zone::Hand { public: false }),
        predicate: Some(Rc::new(predicate)),
      })
      .await
      .try_into()
    {
      Some(drawn_card)
    } else {
      None
    }
  }

  /// Draw a card from prisms without fatigue damage.
  pub async fn conjure(
    &mut self,
    player: Player,
    predicate: impl Fn(CardAttributesWithBase, Option<CardAttributesWithBase>) -> bool + 'static,
  ) -> Option<Card> {
    if let Ok(ResolvedPhaseConjure { conjured_card, .. }) = self
      .run(PhaseConjure {
        from: player,
        to: (player, Zone::Hand { public: false }),
        predicate: Some(Rc::new(predicate)),
      })
      .await
      .try_into()
    {
      Some(conjured_card)
    } else {
      None
    }
  }

  /// Draw a card from enemy prisms without fatigue damage.
  pub async fn conjure_from_enemy(
    &mut self,
    player: Player,
    predicate: impl Fn(CardAttributesWithBase, Option<CardAttributesWithBase>) -> bool + 'static,
  ) -> Option<Card> {
    if let Ok(ResolvedPhaseConjure { conjured_card, .. }) = self
      .run(PhaseConjure {
        from: enemy(player),
        to: (player, Zone::Hand { public: true }),
        predicate: Some(Rc::new(predicate)),
      })
      .await
      .try_into()
    {
      Some(conjured_card)
    } else {
      None
    }
  }

  /// This will draw from your deck for Xc or less, e.g. 3c,2c,1c, then look in prisms for 3c,2c,1c.
  pub async fn draw_high_cost_x_or_less(
    &mut self,
    from: Player,
    to: (Player, Zone),
    cost: u8,
    filter: impl Fn(CardAttributesWithBase, Option<CardAttributesWithBase>) -> bool + 'static + Clone,
  ) -> Option<Card> {
    let restrictions = draw_predicate_restrictions(to.1);

    let filter = move |c: CardAttributesWithBase, a: Option<CardAttributesWithBase>| {
      c.cost <= cost && filter(c.clone(), a) && restrictions(c)
    };

    let matching_x_in_deck = self
      .game
      .context
      .reveal_unique(
        from,
        {
          let filter = filter.clone();

          move |secret| {
            secret
              .deck()
              .iter()
              .filter_map(|id| {
                let card = secret.instance(id).expect("Deck cards are secret");
                let attachment = card.attachment().and_then(|s_id| secret.instance(s_id));
                if filter(card.into(), attachment.map(|c| c.into())) {
                  Some(card.cost)
                } else {
                  None
                }
              })
              .max()
          }
        },
        |_| true,
      )
      .await;

    let draw_cost = if let Some(x) = matching_x_in_deck {
      x
    } else {
      let matching_x_beyond_deck = {
        let bf = filter.clone();
        self
          .context()
          .reveal_unique(
            from,
            move |secret| {
              BaseCard::iter()
                .filter_map(|b| {
                  if !secret.singleton_cards_posessed.contains(&b)
                    && bf(
                      CardAttributesWithBase {
                        attributes: b.instance(),
                        base: b,
                      },
                      b.attached_spell().map(|base_id| CardAttributesWithBase {
                        attributes: base_id.instance(),
                        base: base_id,
                      }),
                    )
                  {
                    Some(b.instance().cost)
                  } else {
                    None
                  }
                })
                .max()
            },
            |_| true,
          )
          .await
      };
      matching_x_beyond_deck?
    };
    if let Ok(ResolvedPhaseDraw { drawn_card, .. }) = self
      .run(PhaseDraw {
        from: (from, CardPool::Anywhere),
        to,
        predicate: Some(Rc::new(move |c, bc| c.cost == draw_cost && filter(c, bc))),
      })
      .await
      .try_into()
    {
      return Some(drawn_card);
    }
    None
  }

  pub async fn fight(&mut self, attacker: InstanceID, defender: InstanceID) -> SaturatingU8 {
    if let Ok(ResolvedPhaseAttack { overkill, .. }) = self
      .run(PhaseAttack { attacker, defender })
      .await
      .try_into()
    {
      overkill
    } else {
      0.into()
    }
  }

  pub async fn cleanup_dead_units(&mut self) {
    if !self.death_cleanup_enabled {
      return;
    }
    let grave_moves: Vec<_> = self
      .all_units_including_dead::<&CardInstance<SkyWeaver>>()
      .into_iter()
      .filter(|unit| unit.marked_for_death.is_some())
      .map(|c| c.id())
      .filter_map(|id| {
        let CardLocation { player, location } = self.location(id);
        if let Some((Zone::Field, _)) = location {
          Some(PhaseMoveToZone {
            card: id.into(),
            zone: Zone::Graveyard,
            player,
          })
        } else {
          None
        }
      })
      .collect();

    self.run_parallel(grave_moves).await;
  }

  pub async fn aura_update(&mut self) {
    if !self.aura_update_enabled {
      return;
    }
    self.context.log(CardEvent::GameEvent {
      event: GameAction::EnterAuraUpdate,
    });
    let turn_count = self.turn_count;
    for player in 0..2 {
      let field_ids = self.player_cards(player).field().clone();
      for card in field_ids {
        let base_reset_cost = {
          let c = card.instance(self, None).unwrap();
          let base_cost = c.base().instance().cost;
          let curr_cost = c.cost;
          if base_cost == curr_cost {
            None
          } else {
            Some(base_cost)
          }
        };
        if let Some(cost) = base_reset_cost {
          self.modify_card_single(card, Modifier::SetCost(cost)).await;
        }
      }

      // Remove modifiers from public cards
      let public_cards_with_modifiers: Vec<_> = self
        .player_cards(player)
        .field()
        .iter()
        .chain(self.player_cards(player).hero_ability().iter())
        .chain(self.player_cards(player).hand().iter().flatten())
        .flat_map(|id| {
          std::iter::once(*id).chain(
            id.instance(self, None)
              .expect("This card is public.")
              .attachment()
              .into_iter(),
          )
        })
        .collect();
      for id in public_cards_with_modifiers {
        self
          .game
          .modify_card(id, move |mut c| {
            c.remove_expired_modifiers(turn_count);
          })
          .await;
      }

      self.context.mutate_secret(player, |secret| {
        let secret_cards_and_attachments: Vec<_> = secret
          .hand()
          .iter()
          .flatten()
          .chain(secret.deck().iter())
          .flat_map(|id| {
            std::iter::once(*id).chain(
              secret
                .instance(id)
                .expect("This card is in the secret.")
                .attachment()
                .into_iter(),
            )
          })
          .collect();
        for card in secret_cards_and_attachments {
          secret
            .secret
            .modify_card(card, secret.log, |mut c| {
              c.remove_expired_modifiers(turn_count)
            })
            .expect("This card is in the secret, so this won't fail.");
        }
      });
    }

    self.update_global_modifiers().await;

    for player in 0..=1 {
      self.player_mut(player).banner_size = 1;
      self.player_mut(player).inspire_repeat = 1;
      self.player_mut(player).glory_repeat = 1;
    }
    self.run(PhaseAuraUpdate).await;

    self.context.log(CardEvent::GameEvent {
      event: GameAction::ExitAuraUpdate,
    });
  }

  pub async fn update_global_modifiers(&mut self) {
    for player in 0..2 {
      for modifier in self.game.players[player as usize]
        .global_card_modifiers
        .clone()
      {
        self.context.mutate_secret(player, |secret| {
          let matching_global_modifier_cards = secret
            .deck()
            .iter()
            .chain(secret.hand().iter().flatten())
            .copied()
            .filter_map(|id| {
              let CardLocation {
                player: owner,
                location,
              } = secret.location(id);
              let location = location.unwrap();

              let instance = secret.instance(id).unwrap();
              let attachment = instance
                .attachment()
                .map(|attachment| secret.instance(attachment).unwrap());

              modifier
                .filter
                .filter(&CardInfo {
                  instance,
                  owner,
                  zone: location.0,
                  attachment,
                })
                .then(|| {
                  let modifier_counter = instance
                    .temporary_modifiers
                    .iter()
                    .filter(|tm| {
                      if let Modifier::GlobalModifierSource {
                        source: tm_source,
                        modifier: tm_modifier,
                      } = &tm.modifier
                      {
                        modifier.source == *tm_source && modifier.modifiers.contains(tm_modifier)
                      } else {
                        false
                      }
                    })
                    .count();
                  (id, modifier_counter)
                })
            })
            .collect_vec();

          for (c, mut modifier_counter) in matching_global_modifier_cards {
            for m in &modifier.modifiers {
              if modifier_counter != modifier.modifiers.len() {
                secret
                  .secret
                  .modify_card(c, secret.log, |mut cm| {
                    cm.add_modifier(
                      modifier.source,
                      0,
                      Modifier::GlobalModifierSource {
                        source: modifier.source,
                        modifier: Box::new(m.clone()),
                      },
                      ModifierExpiry::Never { copyable: true },
                    );
                    cm.apply_modifier(m.clone(), modifier.source);
                  })
                  .unwrap();
                modifier_counter += 1;
              }
            }
          }
        });

        let matching_global_modifier_cards = self
          .player_cards(player)
          .hand()
          .iter()
          .flatten()
          .chain(self.player_cards(player).field().iter())
          .chain(self.player_cards(player).limbo().iter())
          .chain(
            self
              .characters::<&CardInstance<SkyWeaver>>(player)
              .into_iter()
              .filter_map(|c| c.attachment())
              .collect_vec()
              .iter(),
          )
          .copied()
          .filter_map(|id| {
            let CardLocation {
              player: owner,
              location,
            } = self.location(id);
            let location = location.unwrap();

            let instance = id.instance(self, None).unwrap();
            let attachment = instance
              .attachment()
              .map(|attachment| attachment.instance(self, None).unwrap());

            modifier
              .filter
              .filter(&CardInfo {
                instance,
                owner,
                zone: location.0,
                attachment,
              })
              .then(|| {
                let mod_count = instance
                  .temporary_modifiers
                  .iter()
                  .filter(|tm| {
                    if let Modifier::GlobalModifierSource {
                      source: tm_source,
                      modifier: tm_modifier,
                    } = &tm.modifier
                    {
                      modifier.source == *tm_source && modifier.modifiers.contains(tm_modifier)
                    } else {
                      false
                    }
                  })
                  .count();
                (id, mod_count)
              })
          })
          .collect_vec();
        for (c, num_existing_mods_from_source) in matching_global_modifier_cards {
          let mut modifier_counter = num_existing_mods_from_source;
          self.card_execution_context.push(modifier.source);
          for m in &modifier.modifiers {
            if modifier_counter != modifier.modifiers.len() {
              self
                .add_modifier(
                  c,
                  modifier.source,
                  Modifier::GlobalModifierSource {
                    source: modifier.source,
                    modifier: Box::new(m.clone()),
                  },
                  true,
                  0,
                )
                .await;
              modifier_counter += 1;
              self.modify_card_single(c, m.clone()).await;
            }
          }
          assert_eq!(self.card_execution_context.pop(), Some(modifier.source));
        }
      }
    }
  }

  pub async fn change_mana(&mut self, player: Player, delta: i32) {
    self.run(PhaseChangeMana { player, delta }).await;
  }
  pub async fn set_mana(&mut self, player: Player, value: i32) {
    let current_mana: i32 = self.player(player).mana.into();
    let delta = value - current_mana;
    self.run(PhaseChangeMana { player, delta }).await;
  }
  pub async fn change_max_mana(&mut self, player: Player, delta: i32) {
    self.run(PhaseChangeMaxMana { player, delta }).await;
  }
  pub async fn reset_card(&mut self, card: impl Into<Card>) {
    self.run(PhaseResetCard(card.into())).await;
  }

  pub async fn summon(&mut self, ptr: impl Into<Card>) {
    self.move_to_zone(ptr, Zone::Field).await;
  }
  pub async fn instantiate_and_run_and_summon<F>(
    &mut self,
    player: Player,
    base_card: BaseCard,
    run: F,
  ) -> Option<InstanceID>
  where
    for<'b> F: Fn(&'b mut LiveGame, Card) -> Promisify<'b, ()>,
  {
    if player_has_room_for_unit(self, player) {
      let id = self.create_card(player, base_card).await;
      run(self, id.into()).await;
      self.summon(id).await;
      Some(id)
    } else {
      None
    }
  }

  pub async fn instantiate_and_summon(
    &mut self,
    player: Player,
    base_card: BaseCard,
  ) -> Option<InstanceID> {
    self
      .instantiate_and_run_and_summon(player, base_card, |_, _| Box::pin(async {}))
      .await
  }
  pub async fn draw_into_play(
    &mut self,
    player: Player,
    predicate: impl Fn(CardAttributesWithBase, Option<CardAttributesWithBase>) -> bool + 'static,
  ) -> Option<Card> {
    if let Ok(ResolvedPhaseDraw { drawn_card, .. }) = self
      .run(PhaseDraw {
        from: (player, CardPool::Anywhere),
        to: (player, Zone::Field),
        predicate: Some(Rc::new(predicate)),
      })
      .await
      .try_into()
    {
      Some(drawn_card)
    } else {
      None
    }
  }

  pub async fn draw_and_cast_spell(&mut self, player: Player) -> Option<Card> {
    if let Ok(ResolvedPhaseDraw { drawn_card, .. }) = self
      .run(PhaseDraw {
        from: (player, CardPool::Anywhere),
        to: (player, Zone::Casting),
        predicate: Some(Rc::new(|c, _| c.is_spell())),
      })
      .await
      .try_into()
    {
      Some(drawn_card)
    } else {
      None
    }
  }

  pub async fn dust(&mut self, card: impl Into<Card>) -> bool {
    self.move_to_zone(card, Zone::Dust { public: true }).await
  }
  pub async fn dust_many(&mut self, cards: Vec<Card>) -> Vec<ResolvedPhase> {
    self
      .move_to_zone_many(cards, Zone::Dust { public: true })
      .await
  }

  pub async fn fatigue(&mut self, player: Player) {
    let hero = self.hero_id(player);
    self
      .modify_card_single(
        hero,
        Modifier::ModifyHealth(-1, Some(ModifyHealthReason::Fatigue)),
      )
      .await;
  }

  pub async fn modify_card(
    &mut self,
    card: impl Into<Card>,
    modifiers: Vec<Modifier>,
  ) -> Vec<ResolvedPhase> {
    let card = card.into();
    let src = self.card_execution_context.last().copied();
    if let Some(src) = src {
      let phases: Vec<_> = modifiers
        .into_iter()
        .map(|modifier| PhaseModifyCard {
          card,
          modifier,
          source: src,
        })
        .collect();
      self.run_parallel(phases).await
    } else {
      vec![]
    }
  }
  pub async fn modify_card_internal(
    &mut self,
    card: impl Into<Card>,
    modifiers: Vec<Modifier>,
  ) -> Vec<ResolvedPhase> {
    let card = card.into();
    let source = *self.card_execution_context.last().unwrap();
    let phases: Vec<_> = modifiers
      .into_iter()
      .map(|modifier| PhaseModifyCard {
        card,
        modifier,
        source,
      })
      .collect();
    self.run_parallel(phases).await
  }

  pub async fn modify_card_single(
    &mut self,
    card: impl Into<Card>,
    modifier: Modifier,
  ) -> ResolvedPhase {
    let card = card.into();
    self
      .run(PhaseModifyCard {
        card,
        modifier,
        source: *self.card_execution_context.last().unwrap(),
      })
      .await
  }

  pub async fn change_power(&mut self, card: impl Into<Card>, power_change: i8) -> ResolvedPhase {
    let card = card.into();
    self
      .run(PhaseModifyCard {
        card,
        modifier: Modifier::ModifyPower(power_change, None),
        source: *self.card_execution_context.last().unwrap(),
      })
      .await
  }

  pub async fn change_health(&mut self, card: impl Into<Card>, health_change: i8) -> ResolvedPhase {
    let card = card.into();
    self
      .run(PhaseModifyCard {
        card,
        modifier: Modifier::ModifyHealth(health_change, None),
        source: *self.card_execution_context.last().unwrap(),
      })
      .await
  }

  pub async fn berf(
    &mut self,
    card: impl Into<Card>,
    power_change: i8,
    health_change: i8,
  ) -> Vec<ResolvedPhase> {
    let card = card.into();
    self
      .run_parallel(vec![
        PhaseModifyCard {
          card,
          modifier: Modifier::ModifyPower(power_change, None),
          source: *self.card_execution_context.last().unwrap(),
        },
        PhaseModifyCard {
          card,
          modifier: Modifier::ModifyHealth(health_change, None),
          source: *self.card_execution_context.last().unwrap(),
        },
      ])
      .await
  }

  pub async fn add_modifier(
    &mut self,
    id: impl Into<Card>,
    source: InstanceID,
    modifier: Modifier,
    copyable: bool,
    priority: i8,
  ) {
    self
      .game
      .modify_card(id, |mut c| {
        c.add_modifier(
          source,
          priority,
          modifier.clone(),
          ModifierExpiry::Never { copyable },
        );
      })
      .await;
  }

  pub async fn add_aura_modifier(
    &mut self,
    card: impl Into<Card>,
    source: InstanceID,
    modifier: Modifier,
    priority: i8,
  ) {
    self
      .game
      .modify_card(card, |mut c| {
        c.add_aura_modifier(source, modifier.clone(), priority);
      })
      .await;
  }
  pub async fn add_aura_modifiers(
    &mut self,
    card: impl Into<Card>,
    source: InstanceID,
    modifiers: Vec<Modifier>,
    priority: i8,
  ) {
    self
      .game
      .modify_card(card, |mut c| {
        for modifier in modifiers.clone() {
          c.add_aura_modifier(source, modifier, priority);
        }
      })
      .await;
  }

  pub async fn remove_x_cost_modifiers(&mut self, ptr: impl Into<Card>) {
    self
      .game
      .modify_card(ptr, move |mut c| {
        c.remove_x_cost_modifiers();
      })
      .await;
  }
  pub async fn remove_modifiers_from_source(&mut self, ptr: impl Into<Card>, source: InstanceID) {
    self
      .game
      .modify_card(ptr, move |mut c| {
        c.remove_modifiers_from(source);
      })
      .await;
  }
  /// Give a card a modifier for N turns.
  /// At the end of each of its owner's turns, including the one it was applied,
  /// decrement the turns counter. If it's 0, remove the modifier.
  pub async fn grant_modifier_for_turns(
    &mut self,
    ptr: impl Into<Card>,
    source: InstanceID,
    modifier: Modifier,
    priority: i8,
    turns: u8,
  ) {
    let current_turn = self.turn_count;
    self
      .game
      .modify_card(ptr, |mut c| {
        c.add_modifier(
          source,
          priority,
          modifier.clone(),
          ModifierExpiry::OnTurn(current_turn + u16::from(turns)),
        );
      })
      .await;
  }

  /// Damage a random character with >0 HP for `damage` damage.
  pub async fn smart_random_damage(
    &mut self,
    targets: Vec<InstanceID>,
    damage: u8,
    source: InstanceID,
  ) -> Option<InstanceID> {
    let mut valid_targets = vec![];
    for character in targets {
      let marked_for_death = character
        .instance(self, None)
        .expect("Characters are public.")
        .marked_for_death;
      if marked_for_death.is_none() {
        valid_targets.push(character);
      }
    }

    let character_to_damage = valid_targets
      .choose(&mut self.game.context.random().await)
      .copied();
    if let Some(character_to_damage) = character_to_damage {
      self.damage(character_to_damage, damage, source).await;
      Some(character_to_damage)
    } else {
      None
    }
  }

  /// Decrease the HP of a random character with > 0 HP by `damage`.
  pub async fn smart_random_decrease_hp(
    &mut self,
    damage: SaturatingU8,
    targets: Vec<InstanceID>,
  ) -> Option<InstanceID> {
    let mut valid_targets = vec![];
    for character in targets {
      let marked_for_death = character
        .instance(self, None)
        .expect("Characters are public.")
        .marked_for_death;
      if marked_for_death.is_none() {
        valid_targets.push(character);
      }
    }

    let character_to_modify = valid_targets
      .choose(&mut self.game.context.random().await)
      .copied();
    if let Some(character_to_modify) = character_to_modify {
      self
        .modify_card(
          character_to_modify,
          vec![Modifier::ModifyHealth(-i8::from(damage), None)],
        )
        .await;
      Some(character_to_modify)
    } else {
      None
    }
  }

  /// Apply `modifiers` to a random character with >0 HP's HP.
  pub async fn smart_random_modify(
    &mut self,
    modifiers: Vec<Modifier>,
    targets: Vec<InstanceID>,
  ) -> Option<InstanceID> {
    let mut valid_targets = vec![];
    for character in targets {
      let marked_for_death = character
        .instance(self, None)
        .expect("Characters are public.")
        .marked_for_death;
      if marked_for_death.is_none() {
        valid_targets.push(character);
      }
    }

    let character_to_modify = valid_targets
      .choose(&mut self.game.context.random().await)
      .copied();
    if let Some(character_to_modify) = character_to_modify {
      self.modify_card(character_to_modify, modifiers).await;
      Some(character_to_modify)
    } else {
      None
    }
  }

  /// Attack a random character with >0 HP
  pub async fn smart_random_fight_unit(
    &mut self,
    attacker: InstanceID,
    targets: Vec<InstanceID>,
  ) -> Option<InstanceID> {
    if self
      .reveal_from_card(attacker, |c| c.zone.ne(Zone::Field).unwrap_or(true))
      .await
    {
      return None;
    }
    let mut valid_targets = vec![];
    for character in targets {
      let marked_for_death = character
        .instance(self, None)
        .expect("Characters are public.")
        .marked_for_death;
      if marked_for_death.is_none() {
        valid_targets.push(character);
      }
    }

    let character_to_attack = valid_targets
      .choose(&mut self.game.context.random().await)
      .copied();
    if let Some(character_to_attack) = character_to_attack {
      self.fight(attacker, character_to_attack).await;
      Some(character_to_attack)
    } else {
      None
    }
  }

  /// Give a smart random card an attachment, with priority given to
  /// units without that same card attached.
  pub async fn smart_random_attach(
    &mut self,
    attachment: BaseCard,
    targets: Vec<InstanceID>,
  ) -> Option<InstanceID> {
    if let Some(character_to_attach_to) = self.get_attach_smart_random(attachment, targets).await {
      self.give_spell(character_to_attach_to, attachment).await;
      Some(character_to_attach_to)
    } else {
      None
    }
  }

  /// Pick a smart random card to give an attachment, with priority given to
  /// units without that same card attached.
  pub async fn get_attach_smart_random(
    &mut self,
    attachment: BaseCard,
    targets: Vec<InstanceID>,
  ) -> Option<InstanceID> {
    let mut valid_targets = vec![];
    for character in targets {
      let instance = character
        .instance(self, None)
        .expect("Characters are public.");
      let marked_for_death = instance.marked_for_death;
      let has_this_attach = instance.attachment().map_or(false, |attach| {
        *attach
          .instance(self, None)
          .expect("Attachments on characters are public")
          .base()
          == attachment
      });
      if marked_for_death.is_none() && !has_this_attach {
        valid_targets.push(character);
      }
    }

    valid_targets
      .choose(&mut self.game.context.random().await)
      .copied()
  }

  /// Move some cards from this player's hand to their deck, then draw that many cards.
  pub async fn mulligan_hand_with_filter(
    &mut self,
    player: Player,
    filter: impl Fn(card_movement_simulator::CardInfo<SkyWeaver>) -> bool + Clone + 'static,
  ) {
    let hand = self.hand_cards(player);
    let to_mulligan = self.filter_cards(hand, filter).await;
    self
      .run(PhaseMulligan {
        player,
        to_mulligan,
        draw_delta: 0,
      })
      .await;
  }

  /// Move this player's hand to their deck, then draw that many cards.
  pub async fn mulligan_hand(&mut self, player: Player) {
    let to_mulligan: Vec<_> = (0..self.player_cards(player).hand().len())
      .map(|i| self.hand_card(player, i))
      .collect();
    self
      .run(PhaseMulligan {
        player,
        to_mulligan,
        draw_delta: 0,
      })
      .await;
  }

  pub async fn mulligan_card(&mut self, card: Card) {
    let player = self.reveal_from_card(card, |c| c.owner).await;
    self
      .run(PhaseMulligan {
        player,
        to_mulligan: vec![card],
        draw_delta: 0,
      })
      .await;
  }

  /// Grant one or more units an attachment.
  /// Skips dead units.
  pub async fn give_spell_many(&mut self, units: &[Card], spell: BaseCard) -> Vec<ResolvedPhase> {
    let mut attach: Vec<PhaseMoveToZone> = Vec::new();
    for unit_ptr in units {
      let owner = self.reveal_from_card(*unit_ptr, |c| c.owner).await;
      let card = self.create_card(owner, spell).await;
      attach.push(PhaseMoveToZone {
        card: card.into(),
        player: owner,
        zone: Zone::Attachment { parent: *unit_ptr },
      })
    }
    self.run_parallel(attach).await
  }

  /// Grant one unit an attachment.
  /// Skips dead units & units with Lead on-field
  pub async fn give_spell(&mut self, unit: impl Into<Card>, spell: BaseCard) -> Option<Card> {
    self.give_spell_with_modifiers(unit, spell, vec![]).await
  }

  /// Grant one unit an attachment.
  /// Skips dead units & units with Lead on-field
  pub async fn give_spell_with_modifiers(
    &mut self,
    unit: impl Into<Card>,
    spell: BaseCard,
    modifiers: Vec<Modifier>,
  ) -> Option<Card> {
    let unit = unit.into();
    let owner = self.reveal_from_card(unit, |c| c.owner).await;

    let card = self.create_card(owner, spell).await;
    self.modify_card(card, modifiers).await;
    let attach_worked = self
      .move_to_zone(card, Zone::Attachment { parent: unit })
      .await;
    if attach_worked {
      Some(card.into())
    } else {
      // if we failed to attach,
      // send it from limbo -> graveyard.
      self.dust(card).await;
      None
    }
  }

  pub async fn draw_spell_onto(
    &mut self,
    parent: impl Into<Card>,
    predicate: impl Fn(CardAttributesWithBase, Option<CardAttributesWithBase>) -> bool + 'static,
  ) -> Option<Card> {
    let parent = parent.into();
    let owner = self.reveal_from_card(parent, |c| c.owner).await;
    if let Ok(ResolvedPhaseDraw { drawn_card, .. }) = self
      .run(PhaseDraw {
        from: (owner, CardPool::Anywhere),
        to: (owner, Zone::Attachment { parent }),
        predicate: Some(std::rc::Rc::new(move |c, a| predicate(c, a))),
      })
      .await
      .try_into()
    {
      Some(drawn_card)
    } else {
      None
    }
  }

  pub async fn conjure_spell_onto(
    &mut self,
    parent: impl Into<Card>,
    predicate: impl Fn(CardAttributesWithBase, Option<CardAttributesWithBase>) -> bool + 'static,
  ) -> Option<Card> {
    let parent = parent.into();
    let owner = self.reveal_from_card(parent, |c| c.owner).await;
    if let Ok(ResolvedPhaseConjure { conjured_card, .. }) = self
      .run(PhaseConjure {
        from: owner,
        to: (owner, Zone::Attachment { parent }),
        predicate: Some(std::rc::Rc::new(move |c, b| predicate(c, b))),
      })
      .await
      .try_into()
    {
      Some(conjured_card)
    } else {
      None
    }
  }

  pub async fn draw_low_cost_spell_onto(
    &mut self,
    parent: impl Into<Card>,
    predicate: impl Fn(CardAttributesWithBase, Option<CardAttributesWithBase>) -> bool + Clone + 'static,
  ) -> Option<Card> {
    let parent = parent.into();
    let owner = self.reveal_from_card(parent, |c| c.owner).await;
    let cloned_predicate = predicate.clone();
    if let Some(min_cost) = self
      .low_cost_in_draw_pool(
        owner,
        move |c, b| cloned_predicate(c, b),
        Zone::Attachment { parent },
      )
      .await
    {
      self
        .draw_spell_onto(parent, move |c, b| c.cost == min_cost && predicate(c, b))
        .await
    } else {
      None
    }
  }

  pub async fn draw_low_cost(
    &mut self,
    from: Player,
    to: (Player, Zone),
    predicate: impl Fn(CardAttributesWithBase, Option<CardAttributesWithBase>) -> bool + Clone + 'static,
  ) -> Option<Card> {
    let cloned_predicate = predicate.clone();
    if let Some(min_cost) = self
      .low_cost_in_draw_pool(from, move |c, b| cloned_predicate(c, b), to.1)
      .await
    {
      if let Ok(ResolvedPhaseDraw { drawn_card, .. }) = self
        .run(PhaseDraw {
          from: (from, CardPool::Anywhere),
          to,
          predicate: Some(Rc::new(move |c, b| c.cost == min_cost && predicate(c, b))),
        })
        .await
        .try_into()
      {
        Some(drawn_card)
      } else {
        None
      }
    } else {
      None
    }
  }

  pub async fn draw_high_cost(
    &mut self,
    from: Player,
    to: (Player, Zone),
    predicate: impl Fn(CardAttributesWithBase, Option<CardAttributesWithBase>) -> bool + Clone + 'static,
  ) -> Option<Card> {
    let cloned_predicate = predicate.clone();
    if let Some(min_cost) = self
      .high_cost_in_pool(
        from,
        move |c, b| cloned_predicate(c, b),
        CardPool::Anywhere,
        to.1,
      )
      .await
    {
      if let Ok(ResolvedPhaseDraw { drawn_card, .. }) = self
        .run(PhaseDraw {
          from: (from, CardPool::Anywhere),
          to,
          predicate: Some(Rc::new(move |c, b| c.cost == min_cost && predicate(c, b))),
        })
        .await
        .try_into()
      {
        Some(drawn_card)
      } else {
        None
      }
    } else {
      None
    }
  }

  pub async fn sleep(&mut self, unit: InstanceID) {
    self
      .modify_card_single(unit, Modifier::SetAttackState(AttackState::Sleeping))
      .await;
  }

  pub async fn ready(&mut self, unit: impl Into<Card>) {
    let unit = unit.into();
    self
      .modify_card(
        unit,
        vec![
          Modifier::SetAttackState(AttackState::Ready),
          Modifier::SetDidAttack(false),
        ],
      )
      .await;
  }

  pub async fn discard(&mut self, card: Card) {
    self.move_to_zone(card, Zone::Graveyard).await;
  }

  pub async fn discard_many(&mut self, cards: Vec<Card>) {
    self.move_to_zone_many(cards, Zone::Graveyard).await;
  }

  // TODO make this & min fn the same with an arg for max/min
  // TODO fix secrecy - this reveals the highest cost in your conjure pool.
  pub async fn high_cost_in_pool(
    &mut self,
    owner: Player,
    original_filter: impl Fn(CardAttributesWithBase, Option<CardAttributesWithBase>) -> bool
      + Clone
      + 'static,
    from_pool: CardPool,
    to_zone: Zone,
  ) -> Option<SaturatingU8> {
    let card_filter = {
      let restrictions = draw_predicate_restrictions(to_zone);
      move |c: CardAttributesWithBase, a: Option<CardAttributesWithBase>| {
        restrictions(c.clone()) && original_filter(c, a)
      }
    };

    if matches!(from_pool, CardPool::Deck | CardPool::Anywhere) {
      let filter = card_filter.clone();
      let deck_max_cost = self
        .game
        .context
        .reveal_unique(
          owner,
          move |secret| {
            secret
              .deck()
              .iter()
              .filter_map(|deck_id| {
                let card = secret
                  .instance(deck_id)
                  .expect("Deck card should be in secret.");
                let attach = card.attachment().map(|attach_id| {
                  let attach = secret
                    .instance(attach_id)
                    .expect("Secret has attach if it has parent");
                  CardAttributesWithBase {
                    attributes: attach,
                    base: *attach.base(),
                  }
                });

                let card_attrs = CardAttributesWithBase {
                  attributes: card,
                  base: *card.base(),
                };

                if filter(card_attrs, attach) {
                  Some(card.cost)
                } else {
                  None
                }
              })
              .max()
          },
          |_| true,
        )
        .await;

      if deck_max_cost.is_some() {
        return deck_max_cost;
      }
    }

    if matches!(from_pool, CardPool::Prisms | CardPool::Anywhere) {
      return self
        .context()
        .reveal_unique(
          owner,
          move |secret| {
            let filter = card_filter.clone();
            BaseCard::iter()
              .filter(|b| !secret.singleton_cards_posessed.contains(b))
              .filter_map(|b| {
                let attributes = b.instance();
                let card = CardAttributesWithBase {
                  attributes,
                  base: b,
                };
                let attach = b.attached_spell().map(|c| CardAttributesWithBase {
                  attributes: c.instance(),
                  base: c,
                });
                if filter(card, attach) {
                  Some(attributes.cost)
                } else {
                  None
                }
              })
              .max()
          },
          |_| true,
        )
        .await;
    }
    None
  }

  pub async fn low_cost_in_draw_pool(
    &mut self,
    owner: Player,
    original_filter: impl Fn(CardAttributesWithBase, Option<CardAttributesWithBase>) -> bool
      + Clone
      + 'static,
    to_zone: Zone,
  ) -> Option<SaturatingU8> {
    let o_f = original_filter.clone();
    let card_filter = {
      let restrictions = draw_predicate_restrictions(to_zone);
      move |c: CardAttributesWithBase, a: Option<CardAttributesWithBase>| {
        o_f(c.clone(), a) && restrictions(c)
      }
    };

    let filter = card_filter.clone();
    let deck_min_cost = self
      .game
      .context
      .reveal_unique(
        owner,
        move |secret| {
          secret
            .deck()
            .iter()
            .filter_map(|deck_id| {
              let card = secret
                .instance(deck_id)
                .expect("Deck card should be in secret.");
              let attach = card.attachment().map(|attach_id| {
                let attach = secret
                  .instance(attach_id)
                  .expect("Secret has attach if it has parent");
                CardAttributesWithBase {
                  attributes: attach,
                  base: *attach.base(),
                }
              });

              let card_attrs = CardAttributesWithBase {
                attributes: card,
                base: *card.base(),
              };

              if filter(card_attrs, attach) {
                Some(card.cost)
              } else {
                None
              }
            })
            .min()
        },
        |_| true,
      )
      .await;

    if deck_min_cost.is_some() {
      return deck_min_cost;
    }

    self
      .low_cost_in_conjure_pool(owner, original_filter, to_zone)
      .await
  }

  pub async fn low_cost_in_conjure_pool(
    &mut self,
    owner: Player,
    original_filter: impl Fn(CardAttributesWithBase, Option<CardAttributesWithBase>) -> bool
      + Clone
      + 'static,
    to_zone: Zone,
  ) -> Option<SaturatingU8> {
    let card_filter = {
      let restrictions = draw_predicate_restrictions(to_zone);
      move |c: CardAttributesWithBase, a: Option<CardAttributesWithBase>| {
        original_filter(c.clone(), a) && restrictions(c)
      }
    };
    self
      .context()
      .reveal_unique(
        owner,
        move |secret| {
          let filter = card_filter.clone();
          BaseCard::iter()
            .filter(|b| !secret.singleton_cards_posessed.contains(b))
            .filter_map(move |b| {
              let instance = b.instance();
              let attachment = b.attached_spell().map(|s_id| (s_id, s_id.instance()));
              if filter(
                CardAttributesWithBase {
                  attributes: instance,
                  base: b,
                },
                attachment.map(|(attachment_base, attachment)| CardAttributesWithBase {
                  attributes: attachment,
                  base: attachment_base,
                }),
              ) {
                Some(instance.cost)
              } else {
                None
              }
            })
            .min()
        },
        |_| true,
      )
      .await
  }

  pub async fn reveal_card(&mut self, ptr: impl Into<Card>) -> Option<InstanceID> {
    let ptr = ptr.into();
    let player_whose_hand_this_ptr_is_secret_in = self
      .reveal_from_card(ptr, |c| {
        if c.zone.eq(Zone::Hand { public: false }).unwrap_or(false) {
          Some(c.owner)
        } else {
          None
        }
      })
      .await;
    if let Some(player) = player_whose_hand_this_ptr_is_secret_in {
      let res = self
        .run(PhaseMoveToZone {
          card: ptr,
          player,
          zone: Zone::Hand { public: true },
        })
        .await;
      if let Ok(ResolvedPhaseMoveToZone { card, .. }) = res.try_into() {
        return card.id();
      }
    }
    None
  }

  pub async fn reveal_card_many(&mut self, ptrs: &[Card]) {
    for ptr in ptrs {
      self.reveal_card(*ptr).await;
    }
  }
  pub async fn reveal_random_hand_card(&mut self, player: u8) {
    let hand_hidden: Vec<_> = self
      .player_cards(player)
      .hand()
      .clone()
      .into_iter()
      .enumerate()
      .filter_map(|(index, c)| match c {
        None => Some(self.hand_card(player, index)),
        Some(..) => None,
      })
      .collect();
    if hand_hidden.is_empty() {
      return;
    }
    let mut random = self.context().random().await;
    let picked = hand_hidden
      .choose(&mut random)
      .expect("Got None from choosing from a non-empty list...");
    self.reveal_card(*picked).await;
  }

  pub fn required_deck_size(&self, p_id: Player) -> usize {
    usize::from(if self.game_params.fill_decks_to_prism_size {
      if self.player(p_id).prisms.len() == 1 {
        self.game_params.single_prism_deck_size
      } else {
        self.game_params.dual_prism_deck_size
      }
    } else if self.game_params.skip_mulligan {
      0
    } else {
      self.game_params.player_params[p_id as usize].mulligan_choice_size
    })
  }

  pub async fn dust_top_dead_card(
    &mut self,
    player: Player,
    filter: impl Fn(&&CardInstance<SkyWeaver>) -> bool,
  ) -> Option<BaseCard> {
    let top_dead_card = self
      .graveyard::<&CardInstance<SkyWeaver>>(player)
      .into_iter()
      .find(filter)
      .map(|c| (c.id(), *c.base()));
    if let Some((card, base)) = top_dead_card {
      if self.dust(card).await {
        return Some(base);
      }
    }
    None
  }

  pub fn top_highest_cost_dead_card(
    &mut self,
    player: Player,
    filter: impl Fn(&&CardInstance<SkyWeaver>) -> bool,
  ) -> Option<InstanceID> {
    self
      .graveyard::<&CardInstance<SkyWeaver>>(player)
      .into_iter()
      .filter(filter)
      .fold(None, |max, current| {
        let (max_cost, id) = max.unwrap_or((current.cost, current.id()));
        Some(if current.cost > max_cost {
          (current.cost, current.id())
        } else {
          (max_cost, id)
        })
      })
      .map(|(_, id)| id)
  }

  // todo deduplicate code between these functions
  pub async fn give_deck_cards(
    &mut self,
    player: Player,
    filter: impl Fn(&CardInstance<SkyWeaver>) -> bool,
    modifiers: Vec<Modifier>,
    my_id: InstanceID,
  ) {
    self.context().mutate_secret(player, |mut secret| {
      let matching_deck_cards: Vec<_> = secret
        .deck()
        .iter()
        .filter(|c| filter(secret.instance(**c).unwrap()))
        .copied()
        .collect();
      secret.log(CardEvent::GameEvent {
        event: GameAction::EnterParallelPhases,
      });
      for card in matching_deck_cards {
        for modifier in modifiers.clone() {
          secret
            .secret
            .apply_modifier(card.into(), modifier, my_id, secret.log)
            .unwrap();
        }
      }
      secret.log(CardEvent::GameEvent {
        event: GameAction::ExitParallelPhases,
      });
    });
  }

  // todo deduplicate code between these functions
  pub async fn give_hand_cards(
    &mut self,
    player: Player,
    filter: impl Fn(&CardInstance<SkyWeaver>) -> bool,
    modifiers: Vec<Modifier>,
    my_id: InstanceID,
  ) {
    let public_hand_modifiers: Vec<_> = self
      .player_cards(player)
      .hand()
      .iter()
      .flatten()
      .filter_map(|id| {
        if filter(id.instance(self, None).unwrap()) {
          Some(modifiers.iter().map(move |m| PhaseModifyCard {
            card: id.into(),
            modifier: m.clone(),
            source: my_id,
          }))
        } else {
          None
        }
      })
      .flatten()
      .collect();
    self.run_parallel(public_hand_modifiers).await;

    self.context().mutate_secret(player, |mut secret| {
      let matching_hand_card: Vec<_> = secret
        .hand()
        .iter()
        .flatten()
        .filter(|c| filter(secret.instance(**c).unwrap()))
        .copied()
        .collect();
      secret.log(CardEvent::GameEvent {
        event: GameAction::EnterParallelPhases,
      });
      for card in matching_hand_card {
        for modifier in modifiers.clone() {
          secret
            .secret
            .apply_modifier(card.into(), modifier, my_id, secret.log)
            .unwrap();
        }
      }
      secret.log(CardEvent::GameEvent {
        event: GameAction::ExitParallelPhases,
      });
    });
  }

  pub async fn aura_hand_cards(
    &mut self,
    player: Player,
    source: InstanceID,
    filter: impl Fn(&CardInstance<SkyWeaver>) -> bool,
    modifiers: Vec<Modifier>,
    priority: i8,
  ) {
    let public_hand: Vec<InstanceID> = self
      .player_cards(player)
      .hand()
      .iter()
      .flatten()
      .copied()
      .collect();
    for id in public_hand {
      if filter(id.instance(self, None).unwrap()) {
        self
          .add_aura_modifiers(id, source, modifiers.clone(), priority)
          .await;
      }
    }

    self.context().mutate_secret(player, |secret| {
      let matching_hand_card: Vec<_> = secret
        .hand()
        .iter()
        .flatten()
        .filter(|c| filter(secret.instance(**c).unwrap()))
        .copied()
        .collect();
      for card in matching_hand_card {
        secret
          .secret
          .modify_card(card, secret.log, |mut c| {
            for modifier in modifiers.clone() {
              c.add_aura_modifier(source, modifier, priority);
            }
          })
          .unwrap()
      }
    });
  }

  pub async fn give_hand_attachments(
    &mut self,
    player: Player,
    parent_filter: impl Fn(&CardInstance<SkyWeaver>) -> bool,
    attachment_filter: impl Fn(&CardInstance<SkyWeaver>) -> bool,
    modifiers: Vec<Modifier>,
    my_id: InstanceID,
  ) {
    let public_hand: Vec<InstanceID> = self
      .player_cards(player)
      .hand()
      .iter()
      .flatten()
      .copied()
      .collect();
    for id in public_hand {
      let parent_instance = id.instance(self, None).unwrap();
      let attach_id = parent_instance.attachment();
      if let Some(attach_id) = attach_id {
        if parent_filter(parent_instance)
          && attachment_filter(attach_id.instance(self, None).unwrap())
        {
          self.modify_card(attach_id, modifiers.clone()).await;
        }
      }
    }

    self.context().mutate_secret(player, |secret| {
      let matching_hand_attachments: Vec<_> = secret
        .hand()
        .iter()
        .flatten()
        .filter_map(|c| {
          let parent_instance = secret.instance(c).unwrap();
          let attach_id = parent_instance.attachment();
          if let Some(attach_id) = attach_id {
            if parent_filter(parent_instance)
              && attachment_filter(secret.instance(attach_id).unwrap())
            {
              return Some(attach_id);
            }
          }
          None
        })
        .collect();
      for card in matching_hand_attachments {
        for modifier in modifiers.clone() {
          secret
            .secret
            .apply_modifier(card.into(), modifier, my_id, secret.log)
            .unwrap();
        }
      }
    });
  }

  pub async fn aura_hand_attachments(
    &mut self,
    player: Player,
    source: InstanceID,
    parent_filter: impl Fn(&CardInstance<SkyWeaver>) -> bool,
    attachment_filter: impl Fn(&CardInstance<SkyWeaver>) -> bool,
    modifiers: Vec<Modifier>,
    priority: i8,
  ) {
    let public_hand: Vec<InstanceID> = self
      .player_cards(player)
      .hand()
      .iter()
      .flatten()
      .copied()
      .collect();
    for id in public_hand {
      let parent_instance = id.instance(self, None).unwrap();
      let attach_id = parent_instance.attachment();
      if let Some(attach_id) = attach_id {
        if parent_filter(parent_instance)
          && attachment_filter(attach_id.instance(self, None).unwrap())
        {
          self
            .add_aura_modifiers(attach_id, source, modifiers.clone(), priority)
            .await;
        }
      }
    }

    self.context().mutate_secret(player, |secret| {
      let matching_hand_attachments: Vec<_> = secret
        .hand()
        .iter()
        .flatten()
        .filter_map(|c| {
          let parent_instance = secret.instance(c).unwrap();
          let attach_id = parent_instance.attachment();
          if let Some(attach_id) = attach_id {
            if parent_filter(parent_instance)
              && attachment_filter(secret.instance(attach_id).unwrap())
            {
              return Some(attach_id);
            }
          }
          None
        })
        .collect();
      for card in matching_hand_attachments {
        secret
          .secret
          .modify_card(card, secret.log, |mut c| {
            for modifier in modifiers.clone() {
              c.add_aura_modifier(source, modifier, priority);
            }
          })
          .unwrap()
      }
    });
  }

  pub async fn aura_cards_have(
    &mut self,
    player: Player,
    source: InstanceID,
    filter: impl Fn(&CardInstance<SkyWeaver>) -> bool + Clone,
    modifiers: Vec<Modifier>,
    priority: i8,
  ) {
    let filter_clone = filter.clone();
    self
      .aura_hand_cards(
        player,
        source,
        move |c| filter_clone(c),
        modifiers.clone(),
        priority,
      )
      .await;
    let filter_clone = filter.clone();
    self
      .aura_hand_attachments(
        player,
        source,
        |_| true,
        move |c| filter_clone(c),
        modifiers.clone(),
        priority,
      )
      .await;
    let filter_clone = filter.clone();
    let spells: Vec<Card> = self
      .attachments_on_characters::<&CardInstance<SkyWeaver>>(player)
      .into_iter()
      .filter(move |c| filter_clone(c))
      .map_into()
      .collect();
    for spell in spells {
      for modifier in &modifiers {
        self
          .add_aura_modifier(spell, source, modifier.clone(), 0)
          .await;
      }
    }

    let casting_and_limbo_cards: Vec<InstanceID> = self
      .public_limbo_cards(player)
      .iter()
      .chain(self.casting_cards(player).iter())
      .map_into()
      .copied()
      .collect();

    for casting_or_limbo_card in casting_and_limbo_cards {
      if filter(casting_or_limbo_card.instance(self, None).unwrap()) {
        for modifier in &modifiers {
          self
            .add_aura_modifier(casting_or_limbo_card, source, modifier.clone(), 0)
            .await;
        }
      }
    }
  }
  pub async fn aura_characters_have(
    &mut self,
    player: Player,
    source: InstanceID,
    filter: impl Fn(&CardInstance<SkyWeaver>) -> bool + Clone,
    modifiers: Vec<Modifier>,
    priority: i8,
  ) {
    let filter_clone = filter.clone();
    let units: Vec<Card> = self
      .characters::<&CardInstance<SkyWeaver>>(player)
      .into_iter()
      .filter(move |c| filter_clone(c))
      .map_into()
      .collect();
    for unit in units {
      for modifier in &modifiers {
        self
          .add_aura_modifier(unit, source, modifier.clone(), priority)
          .await;
      }
    }
  }

  pub async fn lowest_cost_in_hand(
    &mut self,
    player: Player,
    filter: impl Fn(&&CardInstance<SkyWeaver>) -> bool + Clone + 'static,
  ) -> Option<SaturatingU8> {
    let low_cost_pu = self
      .player_cards(player)
      .hand()
      .iter()
      .flatten()
      .map(|id| id.instance(self, None).unwrap())
      .filter(filter.clone())
      .map(|c| c.cost)
      .min();

    self
      .context()
      .reveal_unique(
        player,
        move |secret| {
          low_cost_pu
            .into_iter()
            .chain(
              secret
                .hand()
                .iter()
                .flatten()
                .map(|id| secret.instance(id).unwrap())
                .filter(filter.clone())
                .map(|c| c.cost),
            )
            .min()
        },
        |_| true,
      )
      .await
  }

  pub async fn highest_cost_in_hand(
    &mut self,
    player: Player,
    filter: impl Fn(&&CardInstance<SkyWeaver>) -> bool + Clone + 'static,
  ) -> Option<SaturatingU8> {
    let high_cost_public = self
      .player_cards(player)
      .hand()
      .iter()
      .flatten()
      .map(|id| id.instance(self, None).unwrap())
      .filter(filter.clone())
      .map(|c| c.cost)
      .max();

    self
      .context()
      .reveal_unique(
        player,
        move |secret| {
          high_cost_public
            .into_iter()
            .chain(
              secret
                .hand()
                .iter()
                .flatten()
                .map(|id| secret.instance(id).unwrap())
                .filter(filter.clone())
                .map(|c| c.cost),
            )
            .max()
        },
        |_| true,
      )
      .await
  }

  pub async fn copy_card_with_rarity(&mut self, card: impl Into<Card>, deep: bool) -> Card {
    self.game.copy_card(card, deep).await
  }

  pub async fn copy_card(&mut self, card: impl Into<Card>, deep: bool) -> Card {
    let card_context = self.card_execution_context.last().copied();
    let rarity = if let Some(creator_card) = card_context {
      self.reveal_from_card(creator_card, |c| c.rarity).await
    } else {
      Rarity::Base
    };

    let copy = self.copy_card_with_rarity(card, deep).await;

    let attach = self.reveal_from_card(copy, |c| c.attachment()).await;
    self
      .modify_card(copy, vec![Modifier::SetRarity(rarity)])
      .await;
    if let Some(attach) = attach {
      self
        .modify_card(attach, vec![Modifier::SetRarity(rarity)])
        .await;
    }
    copy
  }

  pub async fn is_unit_leftmost_field_copy_of_itself(&mut self, unit: InstanceID) -> bool {
    let owner = self.owner(unit);
    let my_base = self.reveal_from_card(unit, |c| *c.base()).await;
    let id_of_leftmost_copy_of_my_base_on_field = self
      .characters::<&CardInstance<SkyWeaver>>(owner)
      .into_iter()
      .find(move |c| *c.base() == my_base)
      .map(|c| c.id());
    if let Some(leftmost_id) = id_of_leftmost_copy_of_my_base_on_field {
      if leftmost_id != unit {
        return false;
      }
    }
    true
  }

  pub async fn add_to_hand(&mut self, player: Player, card: BaseCard) {
    let card = self.create_card(player, card).await;
    self.move_to_zone(card, Zone::Hand { public: true }).await;
  }

  pub fn is_unit_on_field_with_lead(&self, unit: Card) -> bool {
    if let Some(id) = unit.id() {
      if let Some((Zone::Field, _)) = self.location(id).location {
        let instance = id
          .instance(self, None)
          .expect("Units on the field are in public state");
        if let Some(attachment) = instance.attachment() {
          let attach_instance = attachment
            .instance(self, None)
            .expect("Attachments of units on the field are in public state");
          let lead = enchant::LEAD;
          if *attach_instance.base() == lead {
            // If the card is on the field, and it has lead, don't even bother trying to attach.
            return true;
          }
        }
      }
    }
    false
  }

  pub async fn leftmost_hand_card_matching(
    &mut self,
    owner: Player,
    filter: impl Fn(CardAttributesWithBase, Option<CardAttributesWithBase>) -> bool + 'static + Clone,
  ) -> Option<Card> {
    let left_matching_public_index = self
      .player_cards(owner)
      .hand()
      .iter()
      .enumerate()
      .filter_map(|(index, c)| c.map(|c| (index, c)))
      .filter_map(|(index, id)| {
        let card = id
          .instance(self, None)
          .expect("Public hand cards are public");
        let attachment = card.attachment().map(|s_id| {
          s_id
            .instance(self, None)
            .expect("Attachments on public cards are public")
        });
        if filter(card.into(), attachment.map(|c| c.into())) {
          Some(index)
        } else {
          None
        }
      })
      .min();
    let left_matching_in_hand_index = self
      .context()
      .reveal_unique(
        owner,
        move |secret| {
          left_matching_public_index
            .into_iter()
            .chain(
              secret
                .hand()
                .iter()
                .enumerate()
                .filter_map(|(index, c)| c.map(|c| (index, c)))
                .filter_map(|(index, id)| {
                  let card = secret.instance(id).expect("Secret hand cards are secret");
                  let attachment = card.attachment().and_then(|s_id| secret.instance(s_id));
                  if filter(card.into(), attachment.map(|c| c.into())) {
                    Some(index)
                  } else {
                    None
                  }
                }),
            )
            .min()
        },
        |_| true,
      )
      .await;

    left_matching_in_hand_index.map(|idx| self.hand_card(owner, idx))
  }

  // TODO dedupe this
  pub async fn random_hand_card_matching(
    &mut self,
    owner: Player,
    filter: impl Fn(CardAttributesWithBase, Option<CardAttributesWithBase>) -> bool + 'static + Clone,
  ) -> Option<Card> {
    let matching_public_indicies = self
      .player_cards(owner)
      .hand()
      .iter()
      .enumerate()
      .filter_map(|(index, c)| c.map(|c| (index, c)))
      .filter_map(|(index, id)| {
        let card = id
          .instance(self, None)
          .expect("Public hand cards are public");
        let attachment = card.attachment().map(|s_id| {
          s_id
            .instance(self, None)
            .expect("Attachments on public cards are public")
        });
        if filter(card.into(), attachment.map(|c| c.into())) {
          Some(index)
        } else {
          None
        }
      })
      .collect_vec();
    let public_entropy = self.get_entropy().await;
    let matching_in_hand_rng_index = self
      .context()
      .reveal_unique(
        owner,
        move |secret| {
          let allowed_cards = matching_public_indicies
            .iter()
            .copied()
            .chain(
              secret
                .hand()
                .iter()
                .enumerate()
                .filter_map(|(index, c)| c.map(|c| (index, c)))
                .filter_map(|(index, id)| {
                  let card = secret.instance(id).expect("Secret hand cards are secret");
                  let attachment = card.attachment().and_then(|s_id| secret.instance(s_id));
                  if filter(card.into(), attachment.map(|c| c.into())) {
                    Some(index)
                  } else {
                    None
                  }
                }),
            )
            .collect_vec();
          let mut randomness = rand_xorshift::XorShiftRng::from_seed(public_entropy);
          allowed_cards.choose(&mut randomness).cloned()
        },
        |_| true,
      )
      .await;

    matching_in_hand_rng_index.map(|idx| self.hand_card(owner, idx))
  }

  pub async fn get_entropy(&mut self) -> [u8; 16] {
    let mut randomness = self.context().random().await;
    let mut public_entropy = [0; 16];
    randomness.fill_bytes(&mut public_entropy);
    public_entropy
  }

  pub async fn lowest_stat_cards_in_hand_indexes(
    &mut self,
    owner: Player,
    filter: impl Fn(CardAttributesWithBase, Option<CardAttributesWithBase>) -> bool + 'static + Clone,
    stat_map: impl Fn(CardAttributesWithBase, Option<CardAttributesWithBase>) -> SaturatingU8
      + 'static
      + Clone,
  ) -> Vec<usize> {
    if self.player_cards(owner).hand().is_empty() {
      return Vec::new();
    }
    let public_hand_stats = self
      .player_cards(owner)
      .hand()
      .iter()
      .enumerate()
      .flat_map(|(index, id)| {
        id.and_then(|id| {
          let card = id
            .instance(self, None)
            .expect("Public hand cards are public");
          let attachment = card.attachment().map(|s_id| {
            s_id
              .instance(self, None)
              .expect("Attachments on public cards are public")
          });
          if filter(card.into(), attachment.map(|c| c.into())) {
            Some((index, stat_map(card.into(), attachment.map(|c| c.into()))))
          } else {
            None
          }
        })
      })
      .collect_vec();
    let lowest_public_stat = public_hand_stats.iter().map(|(_, stat)| *stat).min();
    let mut hand_indexes = self
      .context()
      .reveal_unique(
        owner,
        move |secret| {
          let secret_hand = secret
            .hand()
            .iter()
            .map(|c| c.map(|id| secret.instance(id).unwrap()));
          let lowest_secret_stat = secret_hand
            .clone()
            .flatten()
            .flat_map(|id| {
              let card = secret.instance(id).expect("Secret hand cards are secret");
              let attachment = card.attachment().and_then(|s_id| secret.instance(s_id));
              if filter(card.into(), attachment.map(|c| c.into())) {
                Some(stat_map(card.into(), attachment.map(|c| c.into())))
              } else {
                None
              }
            })
            .min();
          let lowest_stat = lowest_public_stat
            .unwrap_or_else(|| 99.into())
            .min(lowest_secret_stat.unwrap_or_else(|| 99.into()));
          secret_hand
            .enumerate()
            .flat_map(|(index, c)| {
              c.and_then(|c| {
                let card = secret.instance(c).expect("Secret hand cards are secret");
                let attachment = card.attachment().and_then(|s_id| secret.instance(s_id));
                filter(card.into(), attachment.map(|c| c.into())).then_some(c)
              })
              .map(|c| {
                (index, {
                  let attachment = c.attachment().and_then(|s_id| secret.instance(s_id));
                  stat_map(c.into(), attachment.map(|c| c.into()))
                })
              })
            })
            .chain(public_hand_stats.clone())
            .filter_map(|(index, stat)| {
              if stat == lowest_stat {
                Some(index)
              } else {
                None
              }
            })
            .collect_vec()
        },
        |_| true,
      )
      .await;
    hand_indexes.sort_unstable();
    hand_indexes
  }

  pub async fn change_mana_next_turn(&mut self, player: Player, delta: i8, source: InstanceID) {
    self
      .grant_modifier_for_turns(
        self.hero_id(player),
        source,
        Modifier::ChangeMana(delta),
        0,
        2,
      )
      .await;
    self.run(PhaseChangeManaNextTurn { player, delta }).await;
  }

  pub fn is_on_field(&self, id: InstanceID) -> bool {
    self
      .location(id)
      .location
      .map(|z| z.0.is_field())
      .unwrap_or(false)
  }

  pub fn is_alive_on_field(&self, id: InstanceID) -> bool {
    self.is_on_field(id)
      && id
        .instance(self, None)
        .expect("Field units are public")
        .marked_for_death
        .is_none()
  }

  pub async fn lowest_health_character(
    &mut self,
    player: Player,
    filter: impl Fn(&&CardInstance<SkyWeaver>) -> bool + 'static + Clone,
  ) -> Option<InstanceID> {
    let enemy_units = self.characters::<InstanceID>(player);
    let lowest_hp = enemy_units
      .iter()
      .filter(|c| filter(&c.instance(self, None).unwrap()))
      .filter_map(|c| {
        let instance = c.instance(self, None).unwrap();
        if instance.marked_for_death.is_some() {
          None
        } else {
          Some(instance.health)
        }
      })
      .min();
    let low_health_enemy_units: Vec<InstanceID> = enemy_units
      .into_iter()
      .filter(|c| filter(&c.instance(self, None).unwrap()))
      .filter(|c| Some(c.instance(self, None).unwrap().health) == lowest_hp)
      .collect();

    if low_health_enemy_units.len() > 1 {
      let mut rng = self.context().random().await;
      low_health_enemy_units.choose(&mut rng)
    } else {
      low_health_enemy_units.get(0)
    }
    .copied()
  }
  pub fn add_global_modifier(
    &mut self,
    player: Player,
    source: InstanceID,
    modifiers: Vec<Modifier>,
    filter: SerializableFilter,
  ) {
    let modifier = GlobalModifier {
      modifiers,
      source,
      filter,
    };

    let existing_source_modifiers =
      self
        .player(player)
        .global_card_modifiers
        .iter()
        .find_map(|m| {
          if m.source == source {
            Some(m.modifiers.clone())
          } else {
            None
          }
        });
    if !existing_source_modifiers
      .clone()
      .unwrap_or(vec![])
      .is_empty()
    {
      let mut updated_modifiers = modifier.modifiers.clone();
      self
        .player_mut(player)
        .global_card_modifiers
        .retain(|m| m.source != source);
      for m in existing_source_modifiers.clone().unwrap_or(vec![]) {
        updated_modifiers.push(m);
      }
      self
        .player_mut(player)
        .global_card_modifiers
        .push(GlobalModifier {
          modifiers: updated_modifiers,
          source,
          filter,
        });
    } else {
      self.player_mut(player).global_card_modifiers.push(modifier);
    }
  }
  pub fn remove_global_modifier_from_source(&mut self, player: Player, source: InstanceID) {
    self
      .player_mut(player)
      .global_card_modifiers
      .retain(|m| m.source != source);
  }
  pub async fn run_instant_trigger<F>(
    &mut self,
    base_card: BaseCard,
    my_id: InstanceID,
    effect_type: EffectType,
    func: F,
  ) where
    for<'b> F: FnOnce(&'b mut LiveGame) -> Promisify<'b, ()> + 'b,
  {
    self
      .run(crate::phase::PhaseResolveTrigger {
        id: my_id,
        effect: CardEffect::Intrinsic(base_card),
        effect_type,
        fire: Box::new(move |game| {
          Box::pin(async move {
            func(game).await;
          })
        }),
      })
      .await;
  }
  /// Creates a copy of `card` and casts it as a unit with an optional target.
  pub async fn cast_spell_copy_as_unit(
    &mut self,
    card: InstanceID,
    target_option: Option<InstanceID>,
  ) {
    let copy = self.copy_card(card, true).await;
    self
      .modify_card_single(copy, Modifier::UnmarkForDeath)
      .await;
    let (id, mana_cost) = self.reveal_from_card(copy, |c| (c.id(), c.cost)).await;

    self.move_to_zone(copy, Zone::Casting).await;
    if let Some(target_option) = target_option {
      if self
        .reveal_from_card(target_option, |c| !c.zone.is_field())
        .await
      {
        self.move_to_zone(copy, Zone::Graveyard).await;
        return;
      }

      self
        .resolve_card_effect_as_unit(id, Some(target_option), mana_cost)
        .await;
    } else {
      self.resolve_card_effect_as_unit(id, None, mana_cost).await;
    }

    if self.reveal_from_card(copy, |c| c.zone.is_casting()).await {
      self.move_to_zone(copy, Zone::Graveyard).await;
    }
  }

  pub async fn cast_spell_on_enemies(
    &mut self,
    card: InstanceID,
    filter: impl Fn(&&CardInstance<SkyWeaver>) -> bool + 'static + Clone,
    target_lowest_health: bool,
    only_target_enemies: bool,
  ) {
    let owner = self.owner(card);
    let card_instance = card.instance(self, None).unwrap();
    let card_base = card_instance.base();
    let is_x_cost = card_instance.is_x_cost;
    let cost = if is_x_cost {
      0
    } else {
      i8::from(card_instance.cost)
    };
    match card_base.intrinsic_effect().on_play() {
      OnPlayEffect::Targeted { does_target, .. } => {
        let game_clone: card_movement_simulator::GameState<SkyWeaver> = Clone::clone(&***self);
        let filter_clone = filter.clone();
        let any_potential_targets = self
          .context()
          .reveal_unique(
            owner,
            move |secret| {
              game_clone
                .all_characters::<&CardInstance<SkyWeaver>>()
                .into_iter()
                .filter(filter_clone.clone())
                .filter_map(|target| {
                  let can_be_targeted = if game_clone.owner(target.id()) == owner {
                    target.can_be_targeted_by_owner
                  } else {
                    target.can_be_targeted_by_enemy
                  };

                  (can_be_targeted && does_target(&game_clone, secret, owner, card, target.id()))
                    .then_some(target.id())
                })
                .collect_vec()
            },
            |_| true,
          )
          .await;
        let any_potential_targets = any_potential_targets
          .iter()
          .filter(|c| {
            let contains_enemy_units = any_potential_targets
              .iter()
              .find(|c| self.owner(**c) == enemy(owner));
            if contains_enemy_units.is_some() {
              self.owner(**c) == enemy(owner)
            } else {
              !only_target_enemies
            }
          })
          .collect_vec();
        match any_potential_targets.len().cmp(&1) {
          std::cmp::Ordering::Equal => {
            self.move_to_zone(card, Zone::Casting).await;
            self
              .resolve_card_effect_as_unit(card, Some(*any_potential_targets[0]), cost.into())
              .await;
          }
          std::cmp::Ordering::Greater => {
            let mut rng = self.context.random().await;

            let target = if target_lowest_health {
              let lowest_hp = any_potential_targets
                .iter()
                .filter(|c| filter(&c.instance(self, None).unwrap()))
                .filter_map(|c| {
                  let instance = c.instance(self, None).unwrap();
                  if instance.marked_for_death.is_some() {
                    None
                  } else {
                    Some(instance.health)
                  }
                })
                .min();
              let low_health_enemy_units: Vec<&InstanceID> = any_potential_targets
                .into_iter()
                .filter(|c| filter(&c.instance(self, None).unwrap()))
                .filter(|c| Some(c.instance(self, None).unwrap().health) == lowest_hp)
                .collect_vec();

              if low_health_enemy_units.len() > 1 {
                let mut rng = self.context().random().await;
                low_health_enemy_units.choose(&mut rng)
              } else {
                low_health_enemy_units.get(0)
              }
              .copied()
              .expect("There should be at least one target")
            } else {
              *any_potential_targets.choose(&mut rng).unwrap()
            };
            self.move_to_zone(card, Zone::Casting).await;
            self
              .resolve_card_effect_as_unit(card, Some(*target), cost.into())
              .await;
          }
          std::cmp::Ordering::Less => {}
        }
        if self.reveal_from_card(card, |c| c.zone.is_casting()).await {
          self.move_to_zone(card, Zone::Graveyard).await;
        }
      }
      OnPlayEffect::Untargeted { .. } => {
        self.move_to_zone(card, Zone::Casting).await;
        self
          .resolve_card_effect_as_unit(card, None, cost.into())
          .await;
        if self.reveal_from_card(card, |c| c.zone.is_casting()).await {
          self.move_to_zone(card, Zone::Graveyard).await;
        }
      }
      _ => {}
    }
  }
  pub async fn begin_choose(
    &mut self,
    min_choices: usize,
    max_choices: usize,
    target: Option<InstanceID>,
    cards: Vec<impl Into<Card>>,
  ) {
    let player = self.current_player;
    self
      .begin_choose_for_player(player, min_choices, max_choices, target, cards)
      .await;
  }
  pub async fn begin_choose_for_player(
    &mut self,
    player: Player,
    min_choices: usize,
    max_choices: usize,
    target: Option<InstanceID>,
    cards: Vec<impl Into<Card>>,
  ) {
    self.is_current_player_selecting_cards = true;

    let move_to_card_selection_phases = cards
      .into_iter()
      .map(|c| PhaseMoveToZone {
        card: c.into(),
        zone: Zone::CardSelection,
        player,
      })
      .collect_vec();
    self.run_parallel(move_to_card_selection_phases).await;

    self.context().mutate_secret(player, move |secret| {
      secret.secret.card_selection_state = Some(CardSelectionState {
        min_choices,
        max_choices,
        target,
      });
    });
  }
  pub async fn steal_health(
    &mut self,
    target: impl Into<Card>,
    source: impl Into<Card>,
    amount: i8,
  ) -> i8 {
    let target = target.into();
    let target_health = self.reveal_from_card(target, |c| c.health).await;
    self
      .modify_card_single(target, Modifier::ModifyHealth(-amount, None))
      .await;

    let delta = if target_health < amount {
      target_health.into()
    } else {
      amount
    };
    self
      .modify_card_single(source, Modifier::ModifyHealth(delta, None))
      .await;

    delta
  }
  pub async fn steal_power(
    &mut self,
    target: impl Into<Card>,
    source: impl Into<Card>,
    amount: i8,
  ) -> i8 {
    let target = target.into();
    let target_power = self.reveal_from_card(target, |c| c.power).await;
    self
      .modify_card_single(target, Modifier::ModifyPower(-amount, None))
      .await;

    let delta = if target_power < amount {
      target_power.into()
    } else {
      amount
    };
    self
      .modify_card_single(source, Modifier::ModifyPower(delta, None))
      .await;

    delta
  }
}
