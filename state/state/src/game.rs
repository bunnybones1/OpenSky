use crate::{
  card::Modifier,
  client::GameAction,
  effects::{ActiveTrigger, SecretEarlyTrigger},
  field_order::FieldOrder,
  library::{BaseCard, SerializableFilter},
  live_game::LiveGame,
  model::*,
  player_action::{run_player_action, validate_player_action, PlayerAction},
  saturating_u8,
  saturating_u8::SaturatingU8,
  CardAttributes, TavernMode,
};
use card_movement_simulator::{Card, CardInfo, CardInstance, GameState, InstanceID, Player, State};
use indexmap::{IndexMap, IndexSet};
use serde::{Deserialize, Serialize};
use std::{
  convert::{TryFrom, TryInto},
  fmt::Debug,
  future::Future,
  pin::Pin,
};

#[cfg(feature = "bindings")]
use wasm_bindgen::prelude::*;

#[cfg(feature = "bindings")]
use typescript_definitions::TypescriptDefinition;

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(tag = "type")]
pub enum GameStatus {
  WaitingForGameToStart,
  Playing,
  GameOver { winner: Option<Player> }, // winner
}
#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SkyWeaver {
  pub game_params: GameParams,
  pub players: [PlayerState; 2],
  pub turn_count: u16,
  pub move_count: u16,
  pub status: GameStatus,
  pub current_player: Player,
  pub effect_resolution_enabled: bool,
  pub death_cleanup_enabled: bool,
  pub aura_update_enabled: bool,
  pub is_current_player_selecting_cards: bool,
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkyWeaverSecret {
  pub original_deck: Vec<BaseCard>,
  pub filled_deck: Vec<BaseCard>,
  pub filled_deck_instances: Vec<InstanceID>,
  pub singleton_cards_posessed: IndexSet<BaseCard>,
  pub cards_about_to_be_drawn: Vec<InstanceID>,
  pub card_rarities: IndexMap<BaseCard, Rarity>,
  pub secret_early_triggers: Vec<Vec<ActiveTrigger<SecretEarlyTrigger>>>,
  pub card_selection_state: Option<CardSelectionState>,
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CardSelectionState {
  pub target: Option<InstanceID>,
  pub min_choices: usize,
  pub max_choices: usize,
}

#[cfg(feature = "bindings")]
#[wasm_bindgen(typescript_custom_section)]
const TS_GAME_EXTRA: &str = r#"
  export type Secret = SkyWeaverSecret
  export type GameEvent = GameAction
"#;

impl State for SkyWeaver {
  type ID = ID;
  type Nonce = u32;
  type Action = PlayerAction;
  type Event = GameAction;
  type Secret = SkyWeaverSecret;
  type BaseCard = BaseCard;

  fn version() -> &'static [u8] {
    &crate::version::ARCADEUM_GENERATED_VERSION
  }

  fn verify(
    game: &GameState<Self>,
    mut player: Option<Player>,
    action: &Self::Action,
  ) -> Result<(), String> {
    if let PlayerAction::Timeout = action {
      return if player.is_none() {
        Ok(())
      } else {
        Err("Only the owner can submit a timeout!".to_string())
      };
    }
    if let PlayerAction::Cheat { .. } = action {
      // If the owner dispatches a cheat, pretend that the current player dispatched it.
      player = player.or(Some(game.current_player))
    }
    if let PlayerAction::Abandon { .. } = action {
      return if player.is_none() {
        Ok(())
      } else {
        Err("Only the owner can submit an abandon!".to_string())
      };
    }
    match game.status {
      GameStatus::WaitingForGameToStart => {
        // assert no player sent this
        if player.is_some() {
          return Err("Only the game owner can start the game.".to_string());
        }
        match action {
          PlayerAction::Setup => Ok(()),
          _ => Err("The game owner must submit a Setup action.".to_string()),
        }
      }
      GameStatus::Playing => {
        let player = player.ok_or("player.is_none()")?;
        validate_player_action(game, player, action).map_err(|error| error.to_string())
      }
      GameStatus::GameOver { .. } => Err("Game is over!".to_string()),
    }
  }

  fn apply<'a>(
    live_game: &'a mut card_movement_simulator::CardGame<Self>,
    player: Option<Player>,
    action: Self::Action,
  ) -> Pin<Box<dyn Future<Output = ()> + 'a>> {
    Box::pin(async move {
      // if we got a timeout from the game owner
      if let PlayerAction::Timeout = action {
        let player_who_isnt_done_card_sel = live_game
          .players
          .iter()
          .position(|p| !p.done_card_selection);
        let action = if let Some(player) = player_who_isnt_done_card_sel {
          PlayerAction::CommitCardSelection {
            card_indices: (0..usize::from(
              live_game.game_params.player_params[player].mulligan_choice_size,
            ))
              .collect(),
          }
        } else {
          PlayerAction::EndTurn
        };
        let player = player_who_isnt_done_card_sel.unwrap_or(live_game.current_player as usize);

        return Self::apply(live_game, Some(player as u8), action).await;
      }
      let player = if let PlayerAction::Abandon { player } = action {
        // if we got an abandon from the game owner
        Some(player)
      } else if let PlayerAction::Cheat { .. } = action {
        // If the owner dispatches a cheat, pretend that player 0 dispatched it.
        Some(0)
      } else {
        player
      };

      let status = live_game.status;
      let mut skyweaver_live_game = LiveGame {
        game: live_game,
        queue: Vec::new(),
        phase_count: 0,
        card_execution_context: vec![InstanceID::from_raw(0)],
      };
      skyweaver_live_game.log(GameAction::EnterPlayerAction(player, action.clone()));
      match status {
        GameStatus::WaitingForGameToStart => {
          skyweaver_live_game.start_game().await;
        }
        GameStatus::Playing => {
          run_player_action(&mut skyweaver_live_game, player.unwrap(), action.clone()).await;
        }
        GameStatus::GameOver { .. } => unreachable!("{}:{}:{}", file!(), line!(), column!()),
      };
      skyweaver_live_game.log(GameAction::ExitPlayerAction(player, action));
      skyweaver_live_game.move_count += 1;
    })
  }

  fn field_order(a: CardInfo<Self>, b: CardInfo<Self>) -> std::cmp::Ordering {
    let a_ord = FieldOrder::for_card(&a);
    a_ord.cmp(&FieldOrder::for_card(&b)).then({
      let ord = a.field_age.cmp(&b.field_age);
      if a_ord == FieldOrder::Guard {
        ord // guard is to the right
      } else {
        ord.reverse() // rest is to the left
      }
    })
  }

  fn on_attach(parent: &mut CardInstance<SkyWeaver>, attachment: &CardInstance<SkyWeaver>) {
    for effect in attachment.effects.clone() {
      if let crate::effects::Effect::Enchant { on_attach, .. } = effect.effect() {
        on_attach(parent, attachment);
      }
    }
  }

  fn on_detach(parent: &mut CardInstance<SkyWeaver>, attachment: &CardInstance<SkyWeaver>) {
    for effect in attachment.effects.clone() {
      if let crate::effects::Effect::Enchant { on_detach, .. } = effect.effect() {
        on_detach(parent, attachment);
      }
    }
  }
}

#[derive(Clone, Eq, PartialEq, Default)]
pub struct ID([u8; 8]);

impl card_movement_simulator::arcadeum::ID for ID {
  fn deserialize(data: &mut &[u8]) -> Result<Self, String> {
    if data.len() < 8 {
      return Err("data.len() < 8".to_string());
    }

    let id = data[..8].try_into().map_err(|error| format!("{}", error))?;
    *data = &data[8..];
    Ok(Self(id))
  }

  fn serialize(&self) -> Vec<u8> {
    self.0.to_vec()
  }
}

impl<'a> TryFrom<&'a [u8]> for ID {
  type Error = <[u8; 8] as TryFrom<&'a [u8]>>::Error;

  fn try_from(value: &[u8]) -> Result<Self, Self::Error> {
    Ok(Self(value.try_into()?))
  }
}

pub trait Event: erased_serde::Serialize + Debug {}

impl<T: erased_serde::Serialize + Debug> Event for T {}

erased_serde::serialize_trait_object!(Event);

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GameParams {
  pub season: u16,
  pub max_mana_crystals: SaturatingU8,

  pub skip_first_turn_start: bool,
  pub max_board_units: u16,
  pub max_hand_size: u16,
  pub max_turn_count: u16,
  /// Should single & dual-prism decks get filled with random cards up to their deck size?
  pub fill_decks_to_prism_size: bool,

  pub cheats_allowed: bool,
  pub skip_mulligan: bool,
  pub card_whitelist: Option<Vec<BaseCard>>,
  pub single_prism_deck_size: u16,
  pub dual_prism_deck_size: u16,
  pub rig_deck_order: bool,
  pub allow_beyond_deck_draw_outside_prisms: bool,
  pub krampus_mode: bool,
  pub tavern_mode: Option<TavernMode>,

  /// An optional map of every single base card to the odds of that base card showing up in random deck selection for that prism.
  /// The odds must be normalized per-prism for Discovery gameplay.
  pub random_deck_odds: Option<IndexMap<BaseCard, f32>>,

  pub player_params: [PlayerGameParams; 2],
}

impl Default for GameParams {
  fn default() -> Self {
    GameParams {
      season: 0,

      max_mana_crystals: saturating_u8::MAX.into(),

      skip_first_turn_start: false,
      max_board_units: 7, // 6 + hero
      max_hand_size: 9,
      max_turn_count: 60,

      fill_decks_to_prism_size: true,
      cheats_allowed: false,
      skip_mulligan: false,

      card_whitelist: None,
      single_prism_deck_size: 20,
      dual_prism_deck_size: 30,
      rig_deck_order: false,
      allow_beyond_deck_draw_outside_prisms: false,
      krampus_mode: false,
      tavern_mode: None,
      random_deck_odds: None,

      player_params: [
        PlayerGameParams {
          hero_spell: None,
          mulligan_pool_size: 7,
          mulligan_choice_size: 4,
          skip_first_draw: true,
          ..Default::default()
        },
        PlayerGameParams {
          hero_spell: None,
          mulligan_pool_size: 7,
          mulligan_choice_size: 4,
          cards_added_to_hand_after_mulligan: vec![(BaseCard::C20017, vec![])],
          ..Default::default()
        },
      ],
    }
  }
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PlayerGameParams {
  /// How many cards does the player get to pick from at the start of the game?
  pub mulligan_pool_size: u16,
  /// How many cards does the player get to put into their hand at the start of the game?
  pub mulligan_choice_size: u16,
  pub starting_mana: SaturatingU8,
  pub skip_first_draw: bool,
  pub hero_modifiers: Vec<Modifier>,
  pub hero_spell: Option<(BaseCard, Vec<Modifier>)>,
  pub cards_added_to_hand_after_mulligan: Vec<(BaseCard, Vec<Modifier>)>,
  pub field: Vec<ModifiedBaseCard>,
  pub deck: Vec<ModifiedBaseCard>,
  pub graveyard: Vec<BaseCard>,
}

impl Default for PlayerGameParams {
  fn default() -> Self {
    PlayerGameParams {
      starting_mana: 1.into(),
      skip_first_draw: false,
      hero_modifiers: vec![],
      hero_spell: None,
      cards_added_to_hand_after_mulligan: vec![],
      mulligan_pool_size: 7,
      mulligan_choice_size: 4,
      field: vec![],
      graveyard: vec![],
      deck: vec![],
    }
  }
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub enum AttachmentOverride {
  Override(BaseCard, Vec<Modifier>),
  Remove,
}
#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ModifiedBaseCard {
  pub base: BaseCard,
  pub attachment: Option<AttachmentOverride>,
  pub modifiers: Vec<Modifier>,
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct PlayerSeed {
  pub prisms: Vec<Prism>,
  pub hero_ability: Option<BaseCard>,
}

impl SkyWeaver {
  pub fn is_game_over(&self) -> bool {
    matches!(self.status, GameStatus::GameOver { .. })
  }
  pub fn player_mut(&mut self, player: Player) -> &mut PlayerState {
    &mut self.players[player as usize]
  }
  pub fn player(&self, player: Player) -> &PlayerState {
    &self.players[player as usize]
  }
  pub fn new(game_params: GameParams, p1_seed: PlayerSeed, p2_seed: PlayerSeed) -> SkyWeaver {
    let p0_mana = game_params.player_params[0].starting_mana;
    let p1_mana = game_params.player_params[1].starting_mana;

    Self {
      game_params,
      players: [
        PlayerState {
          id: 0,
          mana: p0_mana,
          max_mana: p0_mana,
          done_card_selection: false,
          prisms: p1_seed.prisms,
          banner_size: 1,
          inspire_repeat: 1,
          glory_repeat: 1,
          hero_ability_base: p1_seed.hero_ability,
          extra_mana_next_turn: 0,
          this_turn_stats: ThisTurnPlayerStats::default(),
          game_stats: PlayerGameStats::default(),
          global_card_modifiers: vec![],
          base_card_swaps: IndexMap::new(),
          hero_ability_casts_or_triggers_since_last_turn_start: 0,
        },
        PlayerState {
          id: 1,
          mana: p1_mana,
          max_mana: p1_mana,
          prisms: p2_seed.prisms,
          done_card_selection: false,
          banner_size: 1,
          inspire_repeat: 1,
          glory_repeat: 1,
          hero_ability_base: p2_seed.hero_ability,
          extra_mana_next_turn: 0,
          this_turn_stats: ThisTurnPlayerStats::default(),
          game_stats: PlayerGameStats::default(),
          global_card_modifiers: vec![],
          base_card_swaps: IndexMap::new(),
          hero_ability_casts_or_triggers_since_last_turn_start: 0,
        },
      ],
      current_player: 0,
      turn_count: 0,
      move_count: 0,
      status: GameStatus::WaitingForGameToStart,
      death_cleanup_enabled: true,
      effect_resolution_enabled: true,
      aura_update_enabled: true,
      is_current_player_selecting_cards: false,
    }
  }
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PlayerState {
  pub id: Player,
  pub prisms: Vec<Prism>,
  pub mana: SaturatingU8,
  pub max_mana: SaturatingU8,
  pub done_card_selection: bool,
  pub hero_ability_base: Option<BaseCard>,
  pub banner_size: u8,
  pub inspire_repeat: u8,
  pub glory_repeat: u8,
  pub extra_mana_next_turn: i8,
  pub this_turn_stats: ThisTurnPlayerStats,
  pub game_stats: PlayerGameStats,
  pub global_card_modifiers: Vec<GlobalModifier>,
  pub base_card_swaps: IndexMap<BaseCard, BaseCard>,
  pub hero_ability_casts_or_triggers_since_last_turn_start: u8,
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct CardSelectionCard {
  pub base: BaseCard,
  pub extra_data: Option<Card>,
  pub attributes: CardAttributes,
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct GlobalModifier {
  pub modifiers: Vec<Modifier>,
  pub source: InstanceID,
  pub filter: SerializableFilter,
}

#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[derive(Deserialize, Serialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct ThisTurnPlayerStats {
  pub hero_was_damaged: bool,
  pub hero_attacked: bool,
  pub hero_hp_lost: u16,
  pub hero_hp_gained: u16,
  pub hero_hp_at_turn_start: SaturatingU8,
  pub allies_died: Vec<InstanceID>,
  pub num_spells_cast: u8,
  pub num_hero_attacks: u8,
  pub base_cards_played: Vec<BaseCard>,
  pub units_summoned: Vec<InstanceID>,
}

#[derive(Deserialize, Serialize, Clone, Debug, Default)]
#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[serde(rename_all = "camelCase")]
pub struct PlayerGameStats {
  pub total_hero_health_lost: u16,
  pub total_horde_damage: u16,
  pub fatigue_amount: i8,
}

pub fn player_has_room_for_unit(game: &GameState<SkyWeaver>, player: Player) -> bool {
  game.player_cards(player).field().len() < game.game_params.max_board_units as usize
}
