use crate::library::SerializableFilter;
use crate::BaseCard;
use crate::CardEffect;
use crate::EffectType;
use crate::PhaseResolveTrigger;
use crate::SkyWeaver;
use card_movement_simulator::Card;
use card_movement_simulator::CardInstance;
use card_movement_simulator::Player;
use card_movement_simulator::Zone;
use rand::Rng;
use serde::{Deserialize, Serialize};
#[cfg(feature = "bindings")]
use typescript_definitions::TypescriptDefinition;
#[allow(unused_imports)]
#[cfg(feature = "bindings")]
use wasm_bindgen::prelude::*;

use crate::{LiveGame, Modifier, SkyWeaverExtensions, Trait};

#[derive(Deserialize, Serialize, Clone, Debug, Copy)]
#[cfg_attr(feature = "bindings", derive(TypescriptDefinition))]
#[serde(rename_all = "camelCase")]
pub enum TavernMode {
  StatSurge,
  TwoForOneUnits,
  TwoForOneSpells,
  GottaGoFast,
  BleedDry,
  MrBoneCrabsWildRide,
  Matryoska,
  Krampus,
  Horde,
}
impl TavernMode {
  pub async fn apply_game_rules(self, game: &mut LiveGame<'_>, player: Player) {
    match self {
      Self::StatSurge => {
        let hero = game.hero_id(player);
        game.add_global_modifier(
          player,
          hero,
          vec![
            Modifier::ModifyHealth(2, None),
            Modifier::ModifyPower(2, None),
          ],
          SerializableFilter::IsUnit,
        );
      }
      Self::TwoForOneUnits => {
        let hero = game.hero_id(player);

        game
          .add_modifier(
            hero,
            hero,
            Modifier::GrantEffect(CardEffect::TwoForOneUnits()),
            true,
            0,
          )
          .await;
      }
      Self::TwoForOneSpells => {
        let hero = game.hero_id(player);

        game
          .add_modifier(
            hero,
            hero,
            Modifier::GrantEffect(CardEffect::TwoForOneSpells()),
            true,
            0,
          )
          .await;
      }
      Self::GottaGoFast => {
        let hero = game.hero_id(player);
        game.add_global_modifier(
          player,
          hero,
          vec![
            Modifier::GrantTrait(Trait::Dash),
            Modifier::ModifyPower(2, None),
          ],
          SerializableFilter::IsUnit,
        );
      }
      Self::BleedDry => {
        let hero = game.hero_id(player);
        game.game_params.player_params[player as usize].hero_spell = None;
        game.game_params.player_params[player as usize].cards_added_to_hand_after_mulligan = vec![];
        game.change_max_mana(player, 99).await;
        game.change_mana(player, 99).await;

        game
          .modify_card(hero, vec![Modifier::SetHealth(99.into())])
          .await;
        game
          .add_modifier(
            hero,
            hero,
            Modifier::GrantEffect(CardEffect::BleedDry()),
            true,
            0,
          )
          .await;
      }
      Self::MrBoneCrabsWildRide => {
        let hero = game.hero_id(player);
        game.add_global_modifier(
          player,
          hero,
          vec![
            Modifier::SetCost(1.into()),
            Modifier::SetPower(1.into()),
            Modifier::SetHealth(1.into()),
          ],
          SerializableFilter::IsUnit,
        );
      }
      Self::Matryoska => {
        let hero = game.hero_id(player);
        game
          .add_modifier(
            hero,
            hero,
            Modifier::GrantEffect(CardEffect::Matryoska()),
            true,
            0,
          )
          .await;
      }
      Self::Krampus => {
        if player == 0 {
          return;
        }
        game.instantiate_and_summon(player, BaseCard::C30065).await;
      }
      Self::Horde => {
        if player == 0 {
          return;
        }
        let hero = game.hero_id(player);
        game
          .modify_card(
            hero,
            vec![
              Modifier::SetHealth(99.into()),
              Modifier::SetHealthFrozen(true),
            ],
          )
          .await;
        game
          .add_modifier(
            hero,
            hero,
            Modifier::GrantEffect(CardEffect::Horde(1)),
            true,
            0,
          )
          .await;
      }
    }
  }

  pub async fn queue_boss_mode_moves(
    self,
    game: &mut LiveGame<'_>,
    player: Player,
    turn_count: u16,
  ) {
    let mut random = game.context.random().await;
    if let Self::Horde = self {
      if player == 0 {
        return;
      }
      // card selection is a turn
      let turn_count = turn_count / 2;

      if turn_count % 3 == 0 || game.field_cards(player).len() == 7 {
        // Hunger!
        play_horde_spell(game, BaseCard::C30101, player).await;
      }
      if turn_count % 4 == 0 {
        // More!
        play_horde_spell(game, BaseCard::C30105, player).await;
      }
      if turn_count % 5 == 0 {
        // Virulence!
        play_horde_spell(game, BaseCard::C30102, player).await;
      }
      if turn_count == 10 {
        // Faster!
        play_horde_spell(game, BaseCard::C30106, player).await;
      }
      let unit_count = game.enemy_field::<Card>(player).len() - 1;
      if turn_count % 12 == 0
        || (unit_count > 2 && random.gen::<f64>() < 0.05 * ((unit_count - 2) as f64))
      {
        // Blighjt!
        play_horde_spell(game, BaseCard::C30108, player).await;
      }
      if turn_count == 13 {
        // Crystalize!
        play_horde_spell(game, BaseCard::C30104, player).await;
      }
      if game
        .attachments_on_characters::<&CardInstance<SkyWeaver>>(player)
        .into_iter()
        .filter(|c| c.base() == &BaseCard::C20047)
        .count()
        > 3
      {
        // Overcome!
        play_horde_spell(game, BaseCard::C30103, player).await;
      }
      let total_unit_health: i16 = game
        .enemy_units(player)
        .into_iter()
        .map(|c: &CardInstance<SkyWeaver>| i16::from(c.health))
        .sum();
      if random.gen::<f64>() < ((total_unit_health / 10) as f64 * 0.25) {
        // Crush!
        play_horde_spell(game, BaseCard::C30107, player).await;
      }
    }
  }
}
async fn play_horde_spell(game: &mut LiveGame<'_>, base: BaseCard, player: Player) {
  let hero = game.hero_id(player);
  game.queue.push(PhaseResolveTrigger {
    id: hero,
    effect: CardEffect::Intrinsic(base),
    effect_type: EffectType::Generic,
    fire: Box::new(move |game: &mut LiveGame| {
      Box::pin(async move {
        let horde_spell_new = game.create_card(player, base).await;
        game.move_to_zone(horde_spell_new, Zone::Casting).await;
        game
          .resolve_card_effect_as_player(horde_spell_new, None, 0.into())
          .await;
        game.move_to_zone(horde_spell_new, Zone::Graveyard).await;
      })
    }),
  });
}
