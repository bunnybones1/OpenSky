use crate::{
  card::{AttackState, Modifier},
  client::GameAction,
  effects::OnPlayEffect,
  extensions::*,
  game::{player_has_room_for_unit, GameStatus, SkyWeaver},
  library::{AttackRestriction, BaseCard},
  live_game::LiveGame,
  model::Rarity,
  phase::{PhaseAttack, PhaseMoveToZone},
  utils::enemy,
  PhaseResolveCardSelection,
};
use card_movement_simulator::{Card, CardInstance, GameState, InstanceID, Player, Zone};
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use std::fmt::{Display, Error, Formatter};

#[cfg(feature = "bindings")]
use {
  crate::library::enchant,
  card_movement_simulator::{arcadeum, PlayerSecret},
  js_sys::{Array, Uint8Array},
  std::collections::HashMap,
  std::convert::TryInto,
  typescript_definitions::TypescriptDefinition,
  wasm_bindgen::{prelude::*, JsValue},
};

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "type")]
pub enum PlayerAction {
  Setup, // starts the game
  Concede,
  EndTurn,
  PlayCard {
    #[serde(rename = "cardID")]
    card_id: InstanceID,
    #[serde(rename = "targetID")]
    target_id: Option<InstanceID>,
  },
  Attack {
    #[serde(rename = "attackerID")]
    attacker_id: InstanceID,
    #[serde(rename = "defenderID")]
    defender_id: InstanceID,
  },
  CommitCardSelection {
    #[serde(rename = "cardIndices")]
    card_indices: Vec<usize>,
  },
  Cheat {
    cheats: Vec<Cheat>,
  },
  // Actions the server can dispatch on behalf of a player
  Timeout,
  Abandon {
    player: Player,
  },
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "type")]
pub enum Cheat {
  AddBaseCardToZone {
    player: Player,
    card: BaseCard,
    zone: Zone,
  },
  ChangeMaxMana {
    player: Player,
    delta: i32,
  },
  SummonBaseUnit {
    player: Player,
    card: BaseCard,
  },
  ApplyModifierToCard {
    card: Card,
    modifier: Modifier,
  },
  AttachBaseCardToParent {
    parent: Card,
    attachment_base: BaseCard,
  },
  MoveCardToZone {
    card: Card,
    new_owner: Player,
    new_zone: Zone,
  },
  DustCardThroughLimboFirst {
    card: Card,
  },
  DustAllCardsInHand {
    player: Player,
  },
  DustAllCardsInDeck {
    player: Player,
  },
  AllCardsInDeckToGraveyard {
    player: Player,
  },
  ModifyCardRarity {
    card: Card,
    rarity: Rarity,
  },
  DrawCard {
    player: Player,
  },
  EffectResolutionActive {
    active: bool,
  },
  DeathCleanupActive {
    active: bool,
  },
  AuraUpdateActive {
    active: bool,
  },
  CrashGame,
  ModifyHeroAbilityCounters {
    player: Player,
    amount_delta: i8,
    max_delta: i8,
  },
  ModifyHeroAbilityCharges {
    player: Player,
    delta: i8,
  },
}

#[cfg_attr(feature = "bindings", wasm_bindgen(typescript_custom_section))]
#[cfg(feature = "bindings")]
const TS_RESOLVED_PHASE_TYPE: &str = r#"
export type PlayerActionType<T extends PlayerAction["type"]> = FindByTag<PlayerAction, {type: T}>
"#;

#[cfg(feature = "bindings")]
#[wasm_bindgen]
pub fn serialize_player_action(action_object: JsValue) -> Uint8Array {
  let action: PlayerAction = arcadeum::utils::from_js(action_object).unwrap();
  let bytes = serde_cbor::to_vec(&action).unwrap();
  let array = Uint8Array::new_with_length(bytes.len().try_into().unwrap());
  let data_array = Array::new();
  for x in bytes.iter() {
    data_array.push(&(*x).into());
  }
  array.set(&data_array, 0);
  array
}

#[cfg(feature = "bindings")]
#[wasm_bindgen(js_name = getUndraggableIDs)]
pub fn get_undraggable_ids_js(
  js_state: JsValue,
  player: Player,
  js_secret: JsValue,
) -> Result<JsValue, JsValue> {
  let state: GameState<SkyWeaver> = arcadeum::utils::from_js(js_state)
    .map_err(|_| "Failed to serialize js_state into SkyWeaver")?;
  let secret: PlayerSecret<SkyWeaver> = arcadeum::utils::from_js(js_secret)
    .map_err(|_| "Failed to serialize js_secret into SkyWeaverSecret")?;

  Ok(arcadeum::utils::to_js(&get_undraggable_ids(
    &state, player, &secret,
  ))?)
}

#[cfg(feature = "bindings")]
pub fn get_undraggable_ids(
  game: &GameState<SkyWeaver>,
  player: Player,
  secret: &PlayerSecret<SkyWeaver>,
) -> HashMap<InstanceID, PlayerActionError> {
  let mut errors = HashMap::new();
  let player_hand = game
    .player_cards(player)
    .hand()
    .iter()
    .zip(secret.hand().iter())
    .map(|(public_id, secret_id)| {
      public_id
        .or(*secret_id)
        .expect("Hand is missing a card at an index in both public and secret state")
        .instance(game, Some(secret))
        .expect("Instance doesn't exist for hand card")
    });
  let player_field: Vec<&CardInstance<SkyWeaver>> = game.characters(player);
  let player_attached = player_field.clone().into_iter().filter_map(|instance| {
    instance.attachment().map(|id| {
      id.instance(game, Some(secret))
        .expect("Instance doesn't exist for field attachment")
    })
  });
  let opponent_hand = game
    .player_cards(enemy(player))
    .hand()
    .iter()
    .flatten()
    .copied();
  let opponent_field: Vec<&CardInstance<SkyWeaver>> = game.characters(enemy(player));
  let opponent_attached = opponent_field.clone().into_iter().filter_map(|instance| {
    instance.attachment().map(|id| {
      id.instance(game, Some(secret))
        .expect("Instance doesn't exist for field attachment")
    })
  });

  if let GameStatus::GameOver { .. } = game.status {
    for id in player_hand
      .map(CardInstance::id)
      .chain(player_field.into_iter().map(CardInstance::id))
      .chain(player_attached.map(CardInstance::id))
      .chain(opponent_hand)
      .chain(opponent_field.clone().into_iter().map(CardInstance::id))
      .chain(opponent_attached.map(CardInstance::id))
    {
      errors.insert(id, PlayerActionError::GameAlreadyFinished);
    }

    return errors;
  }

  if player != game.current_player {
    for id in player_hand
      .map(CardInstance::id)
      .chain(player_field.into_iter().map(CardInstance::id))
      .chain(player_attached.map(CardInstance::id))
      .chain(opponent_hand)
      .chain(opponent_field.clone().into_iter().map(CardInstance::id))
      .chain(opponent_attached.map(CardInstance::id))
    {
      errors.insert(
        id,
        PlayerActionError::ActedOutOfTurn {
          expected: game.current_player,
          actual: player,
        },
      );
    }

    return errors;
  }

  if !game.players.iter().all(|p| p.done_card_selection) {
    for id in player_hand.map(CardInstance::id).chain(
      player_field.into_iter().map(CardInstance::id).chain(
        player_attached.map(CardInstance::id).chain(
          opponent_hand.chain(
            opponent_field
              .into_iter()
              .map(CardInstance::id)
              .chain(opponent_attached.map(CardInstance::id)),
          ),
        ),
      ),
    ) {
      errors.insert(id, PlayerActionError::DidNotSelectCards(player));
    }

    return errors;
  }

  for id in opponent_hand.chain(
    opponent_field
      .clone()
      .into_iter()
      .map(CardInstance::id)
      .chain(opponent_attached.map(CardInstance::id)),
  ) {
    errors.insert(
      id,
      PlayerActionError::PlayedAnotherPlayersCard {
        expected: player,
        actual: 1 - player,
      },
    );
  }

  let mana = game.player(player).mana;
  let room = player_has_room_for_unit(game, player);
  for card in player_hand.chain(player_attached) {
    if !card.can_be_played {
      errors.insert(card.id(), PlayerActionError::PlayedUnplayableCard);
    } else if card.cost > mana {
      errors.insert(card.id(), PlayerActionError::PlayedWithInsufficientMana);
    } else if !room && card.view.is_unit() {
      errors.insert(card.id(), PlayerActionError::PlayedWithInsufficientRoom);
    }
  }

  for attacker in player_field.clone() {
    if game
      .player_and_enemy_cards()
      .iter()
      .all(|cards| cards.field().iter().all(|id| *id != attacker.id()))
    {
      errors.insert(
        attacker.id(),
        PlayerActionError::AttackedWithNonFieldAttacker,
      );
    } else if game.owner(attacker.id()) != player {
      errors.insert(
        attacker.id(),
        PlayerActionError::AttackedWithAnotherPlayersAttacker,
      );
    } else if attacker.attack_state == AttackState::Sleeping {
      errors.insert(
        attacker.id(),
        PlayerActionError::AttackedWithSleepingAttacker,
      );
    } else if attacker.attack_state == AttackState::Exhausted {
      errors.insert(
        attacker.id(),
        PlayerActionError::AttackedWithExhaustedAttacker,
      );
    }
  }

  for card in player_field {
    if let Some(attachment) = card.attachment() {
      let attachment = attachment
        .instance(game, Some(secret))
        .expect("Instance doesn't exist in public or secret");

      if *attachment.base() == enchant::ROOTS {
        errors.insert(card.id(), PlayerActionError::AttackedWithAttackerWithRoots);
      }
    }
  }

  for card in opponent_field {
    if let Some(attachment) = card.attachment() {
      let attachment = attachment
        .instance(game, Some(secret))
        .expect("Instance doesn't exist in public or secret");

      if *attachment.base() == enchant::ROOTS {
        errors.insert(card.id(), PlayerActionError::AttackedWithAttackerWithRoots);
      }
    }
  }

  errors
}

#[cfg(feature = "bindings")]
#[wasm_bindgen(js_name = validatePlayerAction)]
pub fn validate_player_action_js(
  js_state: JsValue,
  player: Player,
  js_action: JsValue,
  js_secret: JsValue,
) -> Result<(), JsValue> {
  let state: GameState<SkyWeaver> = arcadeum::utils::from_js(js_state)
    .map_err(|_| "Failed to serialize js_state into SkyWeaver")?;
  let action: PlayerAction = arcadeum::utils::from_js(js_action)
    .map_err(|_| "Failed to serialize js_action into PlayerAction")?;
  let secret: PlayerSecret<SkyWeaver> = arcadeum::utils::from_js(js_secret)
    .map_err(|_| "Failed to serialize js_secret into SkyWeaverSecret")?;

  validate_player_action_with_secret(&state, player, &action, &secret).map_err(|error| {
    arcadeum::utils::to_js(&error).unwrap_or_else(|error| JsValue::from_str(&error))
  })
}

#[cfg(feature = "bindings")]
pub fn validate_player_action_with_secret(
  game: &GameState<SkyWeaver>,
  player: Player,
  action: &PlayerAction,
  secret: &PlayerSecret<SkyWeaver>,
) -> Result<(), PlayerActionError> {
  validate_player_action(game, player, action)?;
  if let PlayerAction::CommitCardSelection { card_indices } = action {
    if let Some(card_selection_state) = &secret.card_selection_state {
      // validate choose, either return Ok, or Err
      return if card_indices.len() > usize::from(card_selection_state.max_choices)
        || card_indices.len() < usize::from(card_selection_state.min_choices)
      {
        Err(PlayerActionError::SelectedWrongNumberOfCards {
          expected: usize::from(card_selection_state.max_choices),
          actual: card_indices.len(),
        })
      } else if card_indices.iter().unique().count() != card_indices.len() {
        Err(PlayerActionError::DuplicateIndexInCardSelection)
      } else if card_indices
        .iter()
        .any(|index| *index >= secret.card_selection().len())
      {
        Err(PlayerActionError::InvalidIndexInCardSelection)
      } else {
        Ok(())
      };
    }
    return Err(PlayerActionError::AlreadySelectedCards(player));
  }

  if let PlayerAction::PlayCard { card_id, target_id } = action {
    let card = card_id
      .instance(game, Some(secret))
      .ok_or(PlayerActionError::PlayedNonExistentCard)?;
    if !card.can_be_played {
      return Err(PlayerActionError::PlayedUnplayableCard);
    } else if card.view.cost > game.players[usize::from(player)].mana {
      return Err(PlayerActionError::PlayedWithInsufficientMana);
    } else if card.view.is_unit() && !player_has_room_for_unit(game, player) {
      return Err(PlayerActionError::PlayedWithInsufficientRoom);
    } else if let Some(target_id) = target_id {
      match card.base().intrinsic_effect().on_play() {
        OnPlayEffect::MaybeTargeted { .. } if card.is_silenced => {
          return Err(PlayerActionError::PlayedNonTargetingCardWithTarget)
        } // can't target with a silenced card
        OnPlayEffect::Targeted { does_target, .. }
        | OnPlayEffect::MaybeTargeted { does_target, .. } => {
          let target = target_id
            .instance(game, None)
            .expect("Targets must be revealed");
          if game.owner(*target_id) == player {
            if !target.can_be_targeted_by_owner {
              return Err(PlayerActionError::PlayedTargetingCardOnTargetUntargetableByPlayer);
            }
          } else if !target.can_be_targeted_by_enemy {
            return Err(PlayerActionError::PlayedTargetingCardOnTargetUntargetableByOpponent);
          }
          if !does_target(game, secret, player, *card_id, *target_id) {
            return Err(PlayerActionError::PlayedTargetingCardOnInvalidTarget);
          }
        }
        _ => return Err(PlayerActionError::PlayedNonTargetingCardWithTarget),
      }
    } else if let OnPlayEffect::Targeted { .. } = card.base().intrinsic_effect().on_play() {
      return Err(PlayerActionError::PlayedTargetingCardWithoutTarget);
    }
  }

  Ok(())
}

pub fn validate_player_action(
  game: &GameState<SkyWeaver>,
  player: Player,
  action: &PlayerAction,
) -> Result<(), PlayerActionError> {
  if let GameStatus::GameOver { .. } = game.status {
    return Err(PlayerActionError::GameAlreadyFinished);
  }

  if player != game.current_player
    && !matches!(
      action,
      PlayerAction::Concede | PlayerAction::CommitCardSelection { .. } | PlayerAction::Cheat { .. }
    )
  {
    return Err(PlayerActionError::ActedOutOfTurn {
      expected: game.current_player,
      actual: player,
    });
  }

  let is_done_card_selection = game.players[player as usize].done_card_selection;
  if let PlayerAction::CommitCardSelection { card_indices } = action {
    if !is_done_card_selection {
      return if card_indices.len()
        != usize::from(game.game_params.player_params[player as usize].mulligan_choice_size)
      {
        Err(PlayerActionError::SelectedWrongNumberOfCards {
          expected: usize::from(
            game.game_params.player_params[player as usize].mulligan_choice_size,
          ),
          actual: card_indices.len(),
        })
      } else if card_indices.iter().unique().count() != card_indices.len() {
        Err(PlayerActionError::DuplicateIndexInCardSelection)
      } else if card_indices.iter().any(|index| {
        *index >= (game.game_params.player_params[player as usize].mulligan_pool_size as _)
      }) {
        Err(PlayerActionError::InvalidIndexInCardSelection)
      } else {
        Ok(())
      };
    }

    return Ok(());
  }

  if !matches!(action, PlayerAction::Concede) && !game.players.iter().all(|p| p.done_card_selection)
  {
    return Err(PlayerActionError::DidNotSelectCards(player));
  }

  match action {
    PlayerAction::Setup | PlayerAction::Timeout | PlayerAction::Abandon { .. } => {
      Err(PlayerActionError::DidOwnerAction {
        player,
        action: action.clone(),
      })
    }
    PlayerAction::Concede => Ok(()),
    PlayerAction::EndTurn => Ok(()),
    // TODO:
    // The real solution to playing cards with secret information
    // is to maintain a merkle tree of hashed cards, and submit the revealed card along with this action.
    // For now, we're using a hack where we kill the cheater at execution time in `apply` instead of checking mana cost, etc. at verify
    PlayerAction::PlayCard { card_id, target_id } => {
      if !game.exists(card_id) {
        return Err(PlayerActionError::PlayedNonExistentCard);
      }

      if game.owner(*card_id) != player {
        return Err(PlayerActionError::PlayedAnotherPlayersCard {
          expected: player,
          actual: game.owner(*card_id),
        });
      }

      if let Some(target_id) = target_id {
        // target must exist in the public state
        if target_id.instance(game, None).is_none() {
          return Err(PlayerActionError::PlayedCardOnNonExistentTarget(*target_id));
        }
        // and target must be on the field
        if !game
          .player_and_enemy_cards()
          .iter()
          .any(|cards| cards.field().iter().any(|id| id == target_id))
        {
          return Err(PlayerActionError::PlayedTargetingCardOnInvalidTarget);
        }
      }
      Ok(())
    }
    PlayerAction::Attack {
      attacker_id,
      defender_id,
    } => {
      match (
        attacker_id.instance(game, None),
        defender_id.instance(game, None),
      ) {
        (None, Some(_)) => Err(PlayerActionError::AttackedWithNonExistentAttacker),
        (Some(_), None) => Err(PlayerActionError::AttackedNonExistentDefender),
        (None, None) => Err(PlayerActionError::AttackedWithNonExistentAttackerAndDefender),
        (Some(_), _) if !game.player_cards(player).field().contains(attacker_id) => {
          Err(PlayerActionError::AttackedWithNonFieldAttacker)
        }
        (Some(_), _)
          if !game
            .player_cards(enemy(player))
            .field()
            .contains(defender_id) =>
        {
          Err(PlayerActionError::AttackedNonFieldDefender)
        }
        (Some(attacker), Some(defender)) => {
          if game.owner(*attacker_id) != player {
            Err(PlayerActionError::AttackedWithAnotherPlayersAttacker)
          } else if game.owner(*defender_id) == player {
            Err(PlayerActionError::AttackedOwnDefender)
          } else if attacker.attack_state == AttackState::Sleeping {
            Err(PlayerActionError::AttackedWithSleepingAttacker)
          } else if attacker.attack_state == AttackState::Exhausted {
            Err(PlayerActionError::AttackedWithExhaustedAttacker)
          } else {
            let defender_field = game.player_cards(game.owner(*defender_id)).field();
            for restriction in attacker.attack_restrictions.clone().into_iter() {
              let allowed = restriction.filter(defender, defender_field);
              if !allowed {
                return Err(match restriction {
                  AttackRestriction::Blind => {
                    PlayerActionError::AttackedNonFrontUnitWithBlindAttacker
                  }
                  AttackRestriction::GuardOnField => PlayerActionError::AttackedGuardedHero,
                  AttackRestriction::HeroNotHitStealth => PlayerActionError::AttackedStealthUnit,
                  AttackRestriction::Dash => PlayerActionError::AttackedHeroWithDash,
                });
              }
            }
            Ok(())
          }
        }
      }
    }
    PlayerAction::CommitCardSelection { .. } => {
      unreachable!("{}:{}:{}", file!(), line!(), column!())
    }
    PlayerAction::Cheat { .. } => {
      if !game.game_params.cheats_allowed {
        Err(PlayerActionError::Cheated)
      } else {
        Ok(())
      }
    }
  }
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Serialize)]
#[serde(tag = "playerActionErrorType", content = "detail")]
pub enum PlayerActionError {
  GameAlreadyFinished,
  AlreadySelectedCards(Player),
  SelectedWrongNumberOfCards {
    expected: usize,
    actual: usize,
  },
  DuplicateIndexInCardSelection,
  InvalidIndexInCardSelection,
  ActedOutOfTurn {
    expected: Player,
    actual: Player,
  },
  DidNotSelectCards(Player),
  DidOwnerAction {
    player: Player,
    action: PlayerAction,
  },
  PlayedNonExistentCard,
  PlayedOrphanedAttachedSpell,
  PlayedNonFieldAttachedSpell(Zone),
  PlayedAnotherPlayersCard {
    expected: Player,
    actual: Player,
  },
  PlayedCardOnNonExistentTarget(InstanceID),
  AttackedWithNonExistentAttacker,
  AttackedNonExistentDefender,
  AttackedWithNonExistentAttackerAndDefender,
  AttackedWithNonFieldAttacker,
  AttackedNonFieldDefender,
  AttackedWithAnotherPlayersAttacker,
  AttackedOwnDefender,
  AttackedWithSleepingAttacker,
  AttackedWithExhaustedAttacker,
  AttackedGuardedHero,
  AttackedStealthUnit,
  AttackedHeroWithDash,
  AttackedNonFrontUnitWithBlindAttacker,
  AttackedWithAttackerWithRoots,
  Cheated,
  PlayedUnplayableCard,
  PlayedWithInsufficientMana,
  PlayedWithInsufficientRoom,
  PlayedTargetingCardOnTargetUntargetableByPlayer,
  PlayedTargetingCardOnTargetUntargetableByOpponent,
  PlayedTargetingCardOnInvalidTarget,
  PlayedNonTargetingCardWithTarget,
  PlayedTargetingCardWithoutTarget,
}

impl Display for PlayerActionError {
  fn fmt(&self, f: &mut Formatter) -> Result<(), Error> {
    match self {
      Self::GameAlreadyFinished => write!(f, "Game already finished."),
      Self::AlreadySelectedCards(player) => {
        write!(f, "Player {} is already done card selection.", player)
      }
      Self::SelectedWrongNumberOfCards { expected, actual } => write!(
        f,
        "Tried to commit selection of {} cards, expected {}.",
        actual, expected
      ),
      Self::DuplicateIndexInCardSelection => write!(f, "Index not unique in card selection."),
      Self::InvalidIndexInCardSelection => write!(f, "Invalid index in card selection."),
      Self::ActedOutOfTurn { expected, actual } => write!(
        f,
        "Expected move from Player {}, got Player {}",
        expected, actual
      ),
      Self::DidNotSelectCards(player) => write!(f, "Player {} is not done card selection.", player),
      Self::DidOwnerAction { player, action } => {
        write!(f, "Player {} did owner action {:?}.", player, action)
      }
      Self::PlayedNonExistentCard => write!(f, "Card doesn't exist"),
      Self::PlayedOrphanedAttachedSpell => write!(f, "Parent Card doesn't exist"),
      Self::PlayedNonFieldAttachedSpell(zone) => write!(
        f,
        "Attached spell's parent zone is {:?}, expected Field",
        zone
      ),
      Self::PlayedAnotherPlayersCard { expected, actual } => write!(
        f,
        "Card has wrong owner. Expected Player {}, got Player {}.",
        expected, actual
      ),
      Self::PlayedCardOnNonExistentTarget(card) => write!(f, "Target {:?} doesn't exist.", card),
      Self::AttackedWithNonExistentAttacker => write!(f, "Attacker doesn't exist."),
      Self::AttackedNonExistentDefender => write!(f, "Defender doesn't exist."),
      Self::AttackedWithNonExistentAttackerAndDefender => {
        write!(f, "Neither attacker nor defender exist.")
      }
      Self::AttackedWithNonFieldAttacker => write!(f, "Attacker isn't on field."),
      Self::AttackedNonFieldDefender => write!(f, "Defender isn't on field."),
      Self::AttackedWithAnotherPlayersAttacker => write!(f, "Player doesn't own attacker."),
      Self::AttackedOwnDefender => write!(f, "Player owns defender."),
      Self::AttackedWithSleepingAttacker => write!(f, "Attacker can't attack."),
      Self::AttackedWithExhaustedAttacker => write!(f, "Attacker can't attack."),
      Self::AttackedGuardedHero => write!(
        f,
        "Defender is hero, and its owner has Guard tokens on the field."
      ),
      Self::AttackedHeroWithDash => write!(f, "Defender is hero, but unit is dashing."),
      Self::AttackedStealthUnit => write!(f, "Can't attack a stealthed unit."),
      Self::AttackedNonFrontUnitWithBlindAttacker => write!(
        f,
        "Attacker has C1017 Blind, and didn't target the enemy at the far right of the field."
      ),
      Self::AttackedWithAttackerWithRoots => write!(f, "Attacker has C104 Roots."),
      Self::Cheated => write!(f, "Cheats aren't allowed in this game."),
      Self::PlayedUnplayableCard => write!(f, "Unplayable card."),
      Self::PlayedWithInsufficientMana => write!(f, "Not enough mana."),
      Self::PlayedWithInsufficientRoom => write!(f, "Not enough room."),
      Self::PlayedTargetingCardOnTargetUntargetableByPlayer => {
        write!(f, "Cannot be targeted by player.")
      }
      Self::PlayedTargetingCardOnTargetUntargetableByOpponent => {
        write!(f, "Cannot be targeted by opponent")
      }
      Self::PlayedTargetingCardOnInvalidTarget => write!(f, "Invalid target."),
      Self::PlayedNonTargetingCardWithTarget => write!(f, "Target selected."),
      Self::PlayedTargetingCardWithoutTarget => write!(f, "No target selected."),
    }
  }
}

pub async fn run_player_action(game: &mut LiveGame<'_>, player: Player, action: PlayerAction) {
  match action {
    PlayerAction::Setup => unreachable!("{}:{}:{}", file!(), line!(), column!()),
    PlayerAction::Timeout => unreachable!("{}:{}:{}", file!(), line!(), column!()),
    PlayerAction::Abandon { .. } | PlayerAction::Concede => {
      let hero_id = game.hero_id(player);
      game
        .modify_card_single(hero_id, Modifier::MarkedForDeath(hero_id))
        .await;
    }
    PlayerAction::CommitCardSelection { card_indices } => {
      game
        .run(PhaseResolveCardSelection {
          player,
          card_indices,
          is_init_card_selection: !game.player(player).done_card_selection,
        })
        .await;
    }
    PlayerAction::EndTurn => {
      if game.is_current_player_selecting_cards {
        let min_choices = game
          .context
          .reveal_unique(
            player,
            |s| {
              s.card_selection_state
                .as_ref()
                .expect("player is selecting cards without card selection state")
                .min_choices
            },
            |_| true,
          )
          .await;

        game
          .run(PhaseResolveCardSelection {
            player,
            card_indices: (0..=min_choices).collect(),
            is_init_card_selection: false,
          })
          .await;
      }
      game.pass_turn().await;
    }
    PlayerAction::PlayCard { card_id, target_id } => {
      let (cost, is_unit, is_hero_ability, base, can_be_played, is_silenced, is_x_cost, charges) =
        game
          .game
          .reveal_from_card(card_id, |c| {
            (
              c.cost,
              c.is_unit(),
              c.is_hero_ability(),
              *c.base(),
              c.can_be_played,
              c.is_silenced,
              c.is_x_cost,
              c.charges,
            )
          })
          .await;

      // TODO move this back into verify_player_action
      // temporary hack to kill you if you played an invalid card
      #[allow(clippy::if_same_then_else)]
      let was_allowed_to_play_this = {
        if !can_be_played {
          false
        } else if game.players[player as usize].mana < cost {
          /*
          format!(
            "Not enough mana. Card costs {}, but player only has {}",
            card_revealed.view.cost, game.players[player as usize].mana
          );
          */
          false
        } else if is_unit && !player_has_room_for_unit(game, player) {
          /*
          format!(
            "No room on the board. Max board size is {}",
            game.game_params.max_board_units
          );
          */
          false
        } else if is_hero_ability && ((charges.is_some() && charges.unwrap() <= 0) || (is_silenced))
        {
          false
        } else {
          let is_playable = {
            let is_in_hand_or_hero_ability = game
              .reveal_from_card(card_id, |c| c.zone.is_hand() || c.zone.is_hero_ability())
              .await;

            is_in_hand_or_hero_ability || {
              let parent = game.game.reveal_parent(card_id).await;

              if let Some(parent) = parent {
                game.reveal_from_card(parent, |c| c.zone.is_field()).await
              } else {
                false
              }
            }
          };

          is_playable
            && match (base.intrinsic_effect().on_play(), target_id) {
              (OnPlayEffect::Targeted { .. }, None) => {
                false
                //"Card targets, and no target was passed."
              }
              (OnPlayEffect::Targeted { does_target, .. }, Some(target_id))
              | (OnPlayEffect::MaybeTargeted { does_target, .. }, Some(target_id))
                if !{
                  let c = target_id
                    .instance(game, None)
                    .expect("Target doesn't exist.");
                  if game.owner(target_id) == player {
                    c.can_be_targeted_by_owner
                  } else {
                    c.can_be_targeted_by_enemy
                  }
                } || {
                  let game_clone: card_movement_simulator::GameState<SkyWeaver> =
                    Clone::clone(&***game);
                  game
                    .context()
                    .reveal_unique(
                      player,
                      move |secret| !does_target(&game_clone, secret, player, card_id, target_id),
                      |_| true,
                    )
                    .await
                } =>
              {
                false
                //"Target isn't valid for this effect."
              }
              (OnPlayEffect::Untargeted { .. }, Some(_)) => {
                false
                //"Card doesn't target, and a target was passed."
              }
              (OnPlayEffect::MaybeTargeted { does_target, .. }, None) => {
                let game_clone: card_movement_simulator::GameState<SkyWeaver> =
                  Clone::clone(&***game);
                let any_potential_targets = !is_silenced
                  && game
                    .context()
                    .reveal_unique(
                      player,
                      move |secret| {
                        game_clone
                          .all_characters::<&CardInstance<SkyWeaver>>()
                          .into_iter()
                          .any(|target| {
                            (if game_clone.owner(target.id()) == player {
                              target.can_be_targeted_by_owner
                            } else {
                              target.can_be_targeted_by_enemy
                            }) && does_target(&game_clone, secret, player, card_id, target.id())
                          })
                      },
                      |_| true,
                    )
                    .await;

                !any_potential_targets
              }
              _ => true,
            }
        }
      };

      if !was_allowed_to_play_this {
        // You cheat, you lose!
        let hero_id = game.hero_id(player);
        game
          .modify_card_single(hero_id, Modifier::CheatedByPlayingIllegalHandCard)
          .await;
      } else {
        if game
          .reveal_from_card(card_id, |c| !c.is_hero_ability())
          .await
        {
          game.move_to_zone(card_id, Zone::Casting).await;
        }
        // we got past runtime allowed to play checks, continue!
        if !is_x_cost {
          game.change_mana(player, -i32::from(cost)).await;
        }
        game
          .resolve_card_effect_as_player(card_id, target_id, cost)
          .await;
        if game.player_cards(player).casting().contains(&card_id)
          || game.player_cards(player).hero_ability().contains(&card_id)
        {
          let card = card_id
            .instance(game, None)
            .expect("Cards in casting zone are always public.");
          if card.is_enchant() {
            game.dust(card_id).await;
          } else if card.is_hero_ability() {
            game
              .player_mut(player)
              .hero_ability_casts_or_triggers_since_last_turn_start += 1;
            game
              .modify_card_single(card_id, Modifier::ModifyCharges(-1))
              .await;
          } else {
            game.move_to_zone(card_id, Zone::Graveyard).await;
          }
        }
      }
    }
    PlayerAction::Attack {
      attacker_id,
      defender_id,
    } => {
      game
        .modify_card_single(
          attacker_id,
          Modifier::SetAttackState(AttackState::Exhausted),
        )
        .await;
      game
        .modify_card_single(attacker_id, Modifier::SetDidAttack(true))
        .await;
      game
        .run(PhaseAttack {
          attacker: attacker_id,
          defender: defender_id,
        })
        .await;
    }
    PlayerAction::Cheat { cheats } => {
      for cheat in cheats {
        match cheat {
          Cheat::AddBaseCardToZone { player, card, zone } => {
            if card.season() > game.game_params.season {
              return;
            }
            let id = game.create_card(player, card).await;
            game.move_to_zone(id, zone).await;
          }
          Cheat::ChangeMaxMana { player, delta } => {
            game.change_max_mana(player, delta).await;
            let max: i32 = game.player(player).max_mana.into();
            game.set_mana(player, max).await;
          }
          Cheat::SummonBaseUnit { player, card } => {
            if card.season() > game.game_params.season {
              return;
            }
            if player_has_room_for_unit(game, player) {
              let id = game.create_card(player, card).await;
              game.summon(id).await;
            }
          }
          Cheat::ApplyModifierToCard { card, modifier } => {
            game.modify_card(card, vec![modifier]).await;
          }
          Cheat::AttachBaseCardToParent {
            parent,
            attachment_base,
          } => {
            if attachment_base.season() > game.game_params.season {
              return;
            }
            let can_host_attach = game
              .reveal_from_card(parent, |c| c.is_unit() || c.is_hero())
              .await;
            if !can_host_attach {
              return;
            }
            let is_valid_attach =
              attachment_base.instance().is_spell() || attachment_base.instance().is_enchant();
            if !is_valid_attach {
              return;
            }

            let player = game.reveal_from_card(parent, |parent| parent.owner).await;
            let new_attachment = game.create_card(player, attachment_base).await;
            game
              .move_to_zone(new_attachment, Zone::Attachment { parent })
              .await;
          }
          Cheat::MoveCardToZone {
            card,
            new_owner,
            new_zone,
          } => {
            game
              .run(PhaseMoveToZone {
                card,
                zone: new_zone,
                player: new_owner,
              })
              .await;
          }
          Cheat::DustCardThroughLimboFirst { card } => {
            let player = game.reveal_from_card(card, |card| card.owner).await;
            game
              .run(PhaseMoveToZone {
                card,
                zone: Zone::Limbo { public: true },
                player,
              })
              .await;
            game
              .run(PhaseMoveToZone {
                card,
                zone: Zone::Dust { public: true },
                player,
              })
              .await;
          }
          Cheat::DustAllCardsInHand { player } => {
            let hand_cards = game.hand_cards(player);
            game.dust_many(hand_cards).await;
          }
          Cheat::DustAllCardsInDeck { player } => {
            let deck_cards = game.deck_cards(player);
            game.dust_many(deck_cards).await;
          }
          Cheat::AllCardsInDeckToGraveyard { player } => {
            let deck_cards = game.deck_cards(player);
            game.move_to_zone_many(deck_cards, Zone::Graveyard).await;
          }
          Cheat::ModifyCardRarity { card, rarity } => {
            game
              .modify_card(card, vec![Modifier::SetRarity(rarity)])
              .await;
          }
          Cheat::DrawCard { player } => {
            game.draw_any_card(player).await;
          }
          Cheat::DeathCleanupActive { active } => {
            game.death_cleanup_enabled = active;
          }
          Cheat::AuraUpdateActive { active } => {
            game.aura_update_enabled = active;
          }
          Cheat::EffectResolutionActive { active } => {
            game.effect_resolution_enabled = active;
          }
          Cheat::CrashGame => {
            panic!(
              "CrashGame cheat applied. FLAGRANT SYSTEM ERROR. Computer Over. Virus = Very Yes."
            )
          }
          Cheat::ModifyHeroAbilityCounters {
            player,
            amount_delta,
            max_delta,
          } => {
            let card = game.player_cards(player).hero_ability();
            if card.len() != 1 {
              return;
            }
            let card = card[0];
            game
              .modify_card_single(card, Modifier::ModifyCounters(amount_delta))
              .await;
            game
              .modify_card_single(card, Modifier::ModifyMaxCounters(max_delta))
              .await;
          }
          Cheat::ModifyHeroAbilityCharges { player, delta } => {
            let card = game.player_cards(player).hero_ability();
            if card.len() != 1 {
              return;
            }
            let card = card[0];
            game
              .modify_card_single(card, Modifier::ModifyCharges(delta))
              .await;
          }
        }
      }
    }
  }

  game.log(GameAction::FinishCardResolution);

  if let GameStatus::Playing = game.status {
    game.resolve_triggers().await;
  }

  if let GameStatus::Playing = game.status {
    let limbo_count: usize = game
      .player_and_enemy_cards()
      .iter()
      .map(|cards| cards.limbo().len())
      .sum();
    assert!(
      !limbo_count > 0,
      "{:#?} cards in Limbo zone at end of player action!",
      limbo_count
    );
    let casting_count: usize = game
      .player_and_enemy_cards()
      .iter()
      .map(|cards| cards.casting().len())
      .sum();
    assert!(
      !casting_count > 0,
      "{:#?} cards in Casting zone at end of player action!",
      casting_count
    );
  }
}
