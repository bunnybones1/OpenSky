use crate::{
  effects::OnPlayEffect,
  extensions::*,
  game::{player_has_room_for_unit, GameStatus, SkyWeaver},
  library::BaseCard,
  model::Prism,
  phase::{Phase, ResolvedPhase},
  player_action::PlayerAction,
  utils::enemy,
  EffectType, Rarity,
};
use card_movement_simulator::{arcadeum, CardInstance, InstanceID, Player};
use indexmap::IndexMap;
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use serde_big_array::big_array;

#[cfg(feature = "bindings")]
use {
  crate::{GameParams, PlayerSeed},
  card_movement_simulator::GameState,
  js_sys::{Array, Uint8Array},
  std::{convert::TryInto, mem::size_of},
  typescript_definitions::TypescriptDefinition,
  wasm_bindgen::{prelude::*, JsValue},
};

big_array! {
    Signature;
    65,
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Debug, Serialize, Clone)]
#[serde(tag = "type", content = "payload")]
pub enum GameAction {
  EnterPlayerAction(Option<Player>, PlayerAction),
  FinishCardResolution,
  ExitPlayerAction(Option<Player>, PlayerAction),
  EnterPhase(Phase),
  ExitPhase(ResolvedPhase),

  EnterParallelPhases,
  ExitParallelPhases,

  PhaseModified {
    old: Phase,
    new: Phase,
    source: InstanceID,
    effect_type: EffectType,
  },

  EnterAuraUpdate,
  ExitAuraUpdate,
}

#[cfg_attr(feature = "bindings", wasm_bindgen(typescript_custom_section))]
#[cfg(feature = "bindings")]
const TS_SKYWEAVER_GAME: &str = r#"
// Constructs a SkyWeaver game state from player private seeds
export function create_new_skyweaver_game(
    game_params: GameParams,
    p1_seed: PublicSeed,
    p2_seed: PublicSeed,
): GameState<SkyWeaver>;
"#;
#[cfg(feature = "bindings")]
#[wasm_bindgen(skip_typescript)]
pub fn create_new_skyweaver_game(
  js_game_params: JsValue,
  js_p1seed: JsValue,
  js_p2seed: JsValue,
) -> Result<JsValue, JsValue> {
  let game_params: GameParams = arcadeum::utils::from_js(js_game_params)
    .map_err(|err| format!("Invalid GameParams: {}", err))?;

  let p1seed: PublicSeed = arcadeum::utils::from_js(js_p1seed)
    .map_err(|err| format!("Invalid Player 1 PublicSeed: {}", err))?;

  let p2seed: PublicSeed = arcadeum::utils::from_js(js_p2seed)
    .map_err(|err| format!("Invalid Player 2 PublicSeed: {:?}", err))?;

  let state = SkyWeaver::new(
    game_params.clone(),
    PlayerSeed {
      prisms: p1seed.prisms,
      hero_ability: p1seed.hero_ability,
    },
    PlayerSeed {
      prisms: p2seed.prisms,
      hero_ability: p2seed.hero_ability,
    },
  );
  let game_state: GameState<SkyWeaver> = GameState::new(state, !game_params.rig_deck_order);
  arcadeum::utils::to_js(&game_state)
    .map_err(|err| format!("Failed to serialize game state: {}", err).into())
}

#[cfg_attr(feature = "bindings", wasm_bindgen(typescript_custom_section))]
#[cfg(feature = "bindings")]
const TS_CLIENT_EXTRA: &str = r#"
export type FindByTag<Union, Tag> = Union extends Tag ? Union : never;
export type Player = 0 | 1;
export type Address = number[];
export type Signature = number[];

export type IndexMap<K, V> = K extends string | number | symbol ? {[X in K]: V} : never;
export type IndexSet<V> = Array<V>;
export type BitFlags<T> = number;

// Constructs a SkyWeaver root proof from player private seeds
//
// Callers should validate the accounts, subkeys, and signatures in the players' private seeds.
export function create_skyweaver_root_proof(
    owner_sign: (message: string) => number[],
    match_id: number[],
    game_params: GameParams,
    p1_seed: PrivateSeed,
    p2_seed: PrivateSeed,
): Uint8Array;
"#;
#[cfg(feature = "bindings")]
#[wasm_bindgen(skip_typescript)]
pub fn create_skyweaver_root_proof(
  owner_sign: js_sys::Function,
  match_id: &[u8],
  js_game_params: JsValue,
  js_p1seed: JsValue,
  js_p2seed: JsValue,
) -> Result<js_sys::Uint8Array, JsValue> {
  let game_params: GameParams = arcadeum::utils::from_js(js_game_params)
    .map_err(|err| format!("Invalid GameParams: {}", err))?;

  let p1seed: PrivateSeed = arcadeum::utils::from_js(js_p1seed)
    .map_err(|err| format!("Invalid Player 1 PrivateSeed: {}", err))?;

  let p2seed: PrivateSeed = arcadeum::utils::from_js(js_p2seed)
    .map_err(|err| format!("Invalid Player 2 PrivateSeed: {:?}", err))?;

  // If we're rigging the deck order, don't let CMS shuffle the deck.
  let should_shuffle_deck = !game_params.rig_deck_order;

  let state = SkyWeaver::new(
    game_params,
    PlayerSeed {
      prisms: p1seed.prisms,
      hero_ability: p1seed.hero_ability,
    },
    PlayerSeed {
      prisms: p2seed.prisms,
      hero_ability: p2seed.hero_ability,
    },
  );

  let proof_state = arcadeum::ProofState::<arcadeum::store::StoreState<GameState<SkyWeaver>>>::new(
    match_id.try_into().map_err(|error| format!("{}", error))?,
    [p1seed.player, p2seed.player],
    arcadeum::store::StoreState::new(
      GameState::new(state, should_shuffle_deck),
      Default::default(),
      |_, _| (),
    ),
  )?;
  let root_proof_bytes = arcadeum::RootProof::new(
    proof_state,
    vec![
      arcadeum::ProofAction {
        player: None,
        action: arcadeum::PlayerAction::Play(arcadeum::store::StoreAction::new(
          PlayerAction::Setup,
        )),
      },
      arcadeum::ProofAction {
        player: None,
        action: arcadeum::PlayerAction::Approve {
          player: p1seed.player,
          subkey: p1seed.subkey,
          signature: {
            let data: Vec<_> = arcadeum::utils::from_js(
              owner_sign
                .call1(
                  &JsValue::UNDEFINED,
                  &arcadeum::utils::to_js(&<arcadeum::store::StoreState<
                    GameState<SkyWeaver>,
                  > as arcadeum::State>::approval(
                    &p1seed.player, &p1seed.subkey
                  ))?,
                )
                .map_err(|error| format!("{:?}", error))?,
            )?;

            if data.len() != size_of::<arcadeum::crypto::Signature>() {
              return Err(
                "owner_sign failed: data.len() != size_of::<arcadeum::crypto::Signature>()".into(),
              );
            }

            let mut signature = [0; size_of::<arcadeum::crypto::Signature>()];
            signature.copy_from_slice(&data);
            signature
          },
        },
      },
      arcadeum::ProofAction {
        player: None,
        action: arcadeum::PlayerAction::Approve {
          player: p2seed.player,
          subkey: p2seed.subkey,
          signature: {
            let data: Vec<_> = arcadeum::utils::from_js(
              owner_sign
                .call1(
                  &JsValue::UNDEFINED,
                  &arcadeum::utils::to_js(&<arcadeum::store::StoreState<
                    GameState<SkyWeaver>,
                  > as arcadeum::State>::approval(
                    &p2seed.player, &p2seed.subkey
                  ))?,
                )
                .map_err(|error| format!("{:?}", error))?,
            )?;

            if data.len() != size_of::<arcadeum::crypto::Signature>() {
              return Err(
                "owner_sign failed: data.len() != size_of::<arcadeum::crypto::Signature>()".into(),
              );
            }

            let mut signature = [0; size_of::<arcadeum::crypto::Signature>()];
            signature.copy_from_slice(&data);
            signature
          },
        },
      },
    ],
    &mut |message| {
      let data: Vec<_> = arcadeum::utils::from_js(
        owner_sign
          .call1(&JsValue::UNDEFINED, &arcadeum::utils::to_js(message)?)
          .map_err(|error| format!("{:?}", error))?,
      )?;

      if data.len() != size_of::<arcadeum::crypto::Signature>() {
        return Err(
          "owner_sign failed: data.len() != size_of::<arcadeum::crypto::Signature>()".to_string(),
        );
      }

      let mut signature = [0; size_of::<arcadeum::crypto::Signature>()];
      signature.copy_from_slice(&data);
      Ok(signature)
    },
  )?
  .serialize();

  let array = Uint8Array::new_with_length(root_proof_bytes.len().try_into().unwrap());
  let data_array = Array::new();
  for x in root_proof_bytes.iter() {
    data_array.push(&(*x).into());
  }
  array.set(&data_array, 0);
  Ok(array)
}

#[cfg_attr(feature = "bindings", wasm_bindgen(typescript_custom_section))]
#[cfg(feature = "bindings")]
const ROOT_PROOF_FROM_SERIALIZED_TS_DEF: &str = r#"
// Constructs a SkyWeaver root proof from a serialized game state
//
// Callers should validate the players' accounts and subkeys.
export function create_skyweaver_root_proof_from_serialized_game(
  owner_sign: (message: string) => number[],
  match_id: number[],
  js_game_state: GameState<SkyWeaver>,
  js_p1_player: string,
  js_p1_subkey: string,
  js_p2_player: string,
  js_p2_subkey: string,
): Uint8Array;
"#;

#[cfg(feature = "bindings")]
#[wasm_bindgen(skip_typescript)]
pub fn create_skyweaver_root_proof_from_serialized_game(
  owner_sign: js_sys::Function,
  match_id: &[u8],
  js_game_state: JsValue,
  js_p1_player: &str,
  js_p1_subkey: &str,
  js_p2_player: &str,
  js_p2_subkey: &str,
) -> Result<js_sys::Uint8Array, JsValue> {
  let game_state: card_movement_simulator::GameState<SkyWeaver> =
    arcadeum::utils::from_js(js_game_state)
      .map_err(|err| format!("Invalid GameState<SkyWeaver> state: {}", err))?;

  let p1_player: arcadeum::crypto::Address = arcadeum::utils::unhex(js_p1_player)?
    .as_slice()
    .try_into()
    .map_err(|error| format!("{}", error))?;
  let p1_subkey: arcadeum::crypto::Address = arcadeum::utils::unhex(js_p1_subkey)?
    .as_slice()
    .try_into()
    .map_err(|error| format!("{}", error))?;
  let p2_player: arcadeum::crypto::Address = arcadeum::utils::unhex(js_p2_player)?
    .as_slice()
    .try_into()
    .map_err(|error| format!("{}", error))?;
  let p2_subkey: arcadeum::crypto::Address = arcadeum::utils::unhex(js_p2_subkey)?
    .as_slice()
    .try_into()
    .map_err(|error| format!("{}", error))?;

  let proof_state = arcadeum::ProofState::<
    arcadeum::store::StoreState<card_movement_simulator::GameState<SkyWeaver>>,
  >::new(
    match_id.try_into().map_err(|error| format!("{}", error))?,
    [p1_player, p2_player],
    arcadeum::store::StoreState::new(game_state, Default::default(), |_, _| ()),
  )?;
  let root_proof_bytes = arcadeum::RootProof::new(
    proof_state,
    vec![
      arcadeum::ProofAction {
        player: None,
        action: arcadeum::PlayerAction::Approve {
          player: p1_player,
          subkey: p1_subkey,
          signature: {
            let data: Vec<_> = arcadeum::utils::from_js(
              owner_sign
                .call1(
                  &JsValue::UNDEFINED,
                  &arcadeum::utils::to_js(&<arcadeum::store::StoreState<
                    card_movement_simulator::GameState<SkyWeaver>,
                  > as arcadeum::State>::approval(
                    &p1_player, &p1_subkey
                  ))?,
                )
                .map_err(|error| format!("{:?}", error))?,
            )?;

            if data.len() != size_of::<arcadeum::crypto::Signature>() {
              return Err(
                "owner_sign failed: data.len() != size_of::<arcadeum::crypto::Signature>()".into(),
              );
            }

            let mut signature = [0; size_of::<arcadeum::crypto::Signature>()];
            signature.copy_from_slice(&data);
            signature
          },
        },
      },
      arcadeum::ProofAction {
        player: None,
        action: arcadeum::PlayerAction::Approve {
          player: p2_player,
          subkey: p2_subkey,
          signature: {
            let data: Vec<_> = arcadeum::utils::from_js(
              owner_sign
                .call1(
                  &JsValue::UNDEFINED,
                  &arcadeum::utils::to_js(&<arcadeum::store::StoreState<
                    card_movement_simulator::GameState<SkyWeaver>,
                  > as arcadeum::State>::approval(
                    &p2_player, &p2_subkey
                  ))?,
                )
                .map_err(|error| format!("{:?}", error))?,
            )?;

            if data.len() != size_of::<arcadeum::crypto::Signature>() {
              return Err(
                "owner_sign failed: data.len() != size_of::<arcadeum::crypto::Signature>()".into(),
              );
            }

            let mut signature = [0; size_of::<arcadeum::crypto::Signature>()];
            signature.copy_from_slice(&data);
            signature
          },
        },
      },
    ],
    &mut |message| {
      let data: Vec<_> = arcadeum::utils::from_js(
        owner_sign
          .call1(&JsValue::UNDEFINED, &arcadeum::utils::to_js(message)?)
          .map_err(|error| format!("{:?}", error))?,
      )?;

      if data.len() != size_of::<arcadeum::crypto::Signature>() {
        return Err(
          "owner_sign failed: data.len() != size_of::<arcadeum::crypto::Signature>()".to_string(),
        );
      }

      let mut signature = [0; size_of::<arcadeum::crypto::Signature>()];
      signature.copy_from_slice(&data);
      Ok(signature)
    },
  )?
  .serialize();

  let array = Uint8Array::new_with_length(root_proof_bytes.len().try_into().unwrap());
  let data_array = Array::new();
  for x in root_proof_bytes.iter() {
    data_array.push(&(*x).into());
  }
  array.set(&data_array, 0);
  Ok(array)
}

/// Contains both public & private information the owner needs to start a game.
/// This struct should not be shared with anyone.
#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivateSeed {
  pub player: arcadeum::crypto::Address,
  pub subkey: arcadeum::crypto::Address,
  #[serde(with = "Signature")]
  pub signature: arcadeum::crypto::Signature,
  pub prisms: Vec<Prism>,
  pub hero_ability: Option<BaseCard>,
  pub cards: Vec<BaseCard>,
  pub random_seed: [u8; 16],
  pub card_rarities: IndexMap<BaseCard, Rarity>,
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicSeed {
  pub prisms: Vec<Prism>,
  pub hero_ability: Option<BaseCard>,
}

impl From<PrivateSeed> for PublicSeed {
  fn from(private_seed: PrivateSeed) -> Self {
    PublicSeed {
      prisms: private_seed.prisms,
      hero_ability: private_seed.hero_ability,
    }
  }
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Approval {
  pub player: arcadeum::crypto::Address,
  pub subkey: arcadeum::crypto::Address,
  #[serde(with = "Signature")]
  pub signature: arcadeum::crypto::Signature,
}

#[cfg(feature = "bindings")]
#[wasm_bindgen(js_name = getValidActions)]
pub fn get_js_valid_actions(
  js_state: JsValue,
  player: Player,
  js_secret: JsValue,
) -> Result<Box<[JsValue]>, JsValue> {
  let state: card_movement_simulator::GameState<SkyWeaver> = arcadeum::utils::from_js(js_state)
    .map_err(|_| "Failed to serialize js_state into SkyWeaver")?;
  let secret: card_movement_simulator::PlayerSecret<SkyWeaver> =
    arcadeum::utils::from_js(js_secret)
      .map_err(|_| "Failed to serialize js_secret into SkyWeaverSecret")?;
  Ok(
    get_valid_actions(&state, player, &secret)
      .iter()
      .map(|action| arcadeum::utils::to_js(action).unwrap())
      .collect::<Vec<_>>()
      .into_boxed_slice(),
  )
}

pub fn get_valid_actions(
  game: &card_movement_simulator::GameState<crate::SkyWeaver>,
  player: Player,
  secret: &card_movement_simulator::PlayerSecret<crate::SkyWeaver>,
) -> Vec<PlayerAction> {
  let mut valid_actions: Vec<PlayerAction> = Vec::new();

  let player_state = game.player(player);

  if let Some(card_selection_state) = &secret.card_selection_state {
    for i in card_selection_state.min_choices..=card_selection_state.max_choices {
      valid_actions.extend(
        (0..secret.card_selection().len())
          .combinations(usize::from(i))
          .map(|combination| PlayerAction::CommitCardSelection {
            card_indices: combination,
          }),
      );
    }

    return valid_actions;
  }
  if !game.players.iter().all(|p| p.done_card_selection) {
    // if we committed card sel, but oppt didn't, can't do any moves.
    return valid_actions;
  }

  if game.current_player != player {
    return valid_actions;
  }

  if let GameStatus::GameOver { .. } = game.status {
    return valid_actions;
  }

  valid_actions.push(PlayerAction::EndTurn);

  let has_room_for_unit = player_has_room_for_unit(game, player);
  let hand_cards_and_field_attachments_and_hero_abilities = game
    .characters::<&CardInstance<SkyWeaver>>(player)
    .into_iter()
    .filter_map(|instance| {
      instance.attachment().map(|attachment_id| {
        attachment_id
          .instance(game, None)
          .expect("Attachments on field cards are public.")
      })
    })
    .chain(
      game
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
        }),
    )
    .chain(
      game
        .player_cards(player)
        .hero_ability()
        .iter()
        .map(|id| id.instance(game, None).expect("Hero Abilities are public.")),
    );
  for card in hand_cards_and_field_attachments_and_hero_abilities {
    if !card.can_be_played {
      continue;
    }

    if card.cost > player_state.mana {
      continue;
    }

    // You can't play units if there's no more room on the field
    if card.is_unit() && !has_room_for_unit {
      continue;
    }
    // cant play more than 1 hero ability per turn, and cant play any if you have no charges
    if card.is_hero_ability()
      && ((card.charges.is_some() && card.charges.unwrap() <= 0) || (card.is_silenced))
    {
      continue;
    }
    let card_id = card.id();

    let is_targetable = move |c: &CardInstance<SkyWeaver>| {
      if game.owner(c.id()) == player {
        c.can_be_targeted_by_owner
      } else {
        c.can_be_targeted_by_enemy
      }
    };

    let potential_targets: Vec<_> = game
      .all_characters::<&CardInstance<SkyWeaver>>()
      .into_iter()
      .filter(|c| is_targetable(c))
      .map(|c| c.id())
      .collect();

    // Only intrinsic effects are used for targeting.
    match card.base().intrinsic_effect().on_play() {
      OnPlayEffect::Targeted { does_target, .. } => {
        for potential_target in potential_targets {
          if does_target(game, secret, player, card_id, potential_target) {
            valid_actions.push(PlayerAction::PlayCard {
              card_id,
              target_id: Some(potential_target),
            })
          }
        }
      }
      OnPlayEffect::MaybeTargeted { does_target, .. } => {
        let mut has_valid_target = false;
        if !card.is_silenced {
          for potential_target in potential_targets {
            if does_target(game, secret, player, card_id, potential_target) {
              valid_actions.push(PlayerAction::PlayCard {
                card_id,
                target_id: Some(potential_target),
              });
              has_valid_target = true;
            }
          }
        }
        if !has_valid_target {
          valid_actions.push(PlayerAction::PlayCard {
            card_id,
            target_id: None,
          });
        }
      }
      OnPlayEffect::Untargeted { .. } | OnPlayEffect::None => {
        valid_actions.push(PlayerAction::PlayCard {
          card_id,
          target_id: None,
        })
      }
    };
  }

  valid_actions.extend(
    game
      .characters::<&CardInstance<SkyWeaver>>(player)
      .into_iter()
      .filter_map(|character| {
        if character.attack_state.can_attack() {
          Some((character.id(), character.attack_restrictions.clone()))
        } else {
          None
        }
      })
      .flat_map(|(my_unit_id, attack_restrictions)| {
        let defender_field = game.characters::<InstanceID>(enemy(player));
        let defenders = game.characters::<&CardInstance<SkyWeaver>>(enemy(player));
        defenders.into_iter().filter_map(move |defender| {
          let allowed = attack_restrictions
            .clone()
            .into_iter()
            .all(|restriction| restriction.filter(defender, &defender_field));
          if allowed {
            Some(PlayerAction::Attack {
              attacker_id: my_unit_id,
              defender_id: defender.id(),
            })
          } else {
            None
          }
        })
      }),
  );

  valid_actions
}

#[cfg(feature = "bindings")]
#[wasm_bindgen]
pub fn install_panic_logger() {
  console_error_panic_hook::set_once();
}
