use crate::{
  card::*,
  effects::{Effect, EffectType, OnPlayEffect, TriggerVariant},
  extensions::*,
  game::*,
  library::*,
  model::*,
  phase::*,
  player_action::PlayerAction,
  run_test, run_test_with_params, LiveGame, TavernMode,
};
use card_movement_simulator::{CardInstance, InstanceID, Zone};

use lazy_static::lazy_static;
use strum::IntoEnumIterator;

lazy_static! {
  pub static ref UNIT_WITH_SPELL: BaseCard = BaseCard::iter()
    .find(|c| c.attached_spell().is_some() && c.intrinsic_effect().is_none())
    .expect("WTF? No cards have attached spells.");
  pub static ref UNIT_WITH_ONLY_STEALTH: BaseCard = BaseCard::iter()
    .find(|c| c.instance().traits.contains(&Trait::Stealth)
      && c.instance().traits.len() == 1
      && c.intrinsic_effect().is_none())
    .expect("WTF? No cards have only stealth.");
  pub static ref UNIT_WITH_ONLY_GUARD: BaseCard = BaseCard::iter()
    .find(|c| c.instance().traits.contains(&Trait::Guard)
      && c.instance().traits.len() == 1
      && c.intrinsic_effect().is_none())
    .expect("WTF? No cards have only guard.");
  pub static ref UNIT_WITH_NO_KEYWORDS: BaseCard = BaseCard::iter()
    .find(|c| c.instance().traits.is_empty() && c.intrinsic_effect().is_none())
    .expect("WTF? No cards have no keywords.");
  pub static ref UNIT_WITH_EFFECT: BaseCard = BaseCard::iter()
    .find(|c| c.attached_spell().is_none()
      && c.instance().is_unit()
      && c
        .intrinsic_effect()
        .effect_types()
        .any(|effect_type| effect_type != EffectType::Internal))
    .expect("WTF? No cards have no attachment + an effect.");
  pub static ref ENCHANT_WITH_EFFECT_TYPE: BaseCard = BaseCard::iter()
    .find(|c| c.instance().is_enchant()
      && c
        .intrinsic_effect()
        .effect_types()
        .any(|effect_type| effect_type != EffectType::Internal))
    .expect("WTF? No cards are an enchant with an effect.");
  pub static ref SPELL_CARD: BaseCard = BaseCard::iter()
    .find(|c| c.instance().is_spell() && c.instance().cost > 2)
    .expect("WTF? No cards are spells.");
}

#[test]
fn game_begins() -> Result<(), String> {
  run_test(|game| {
    Box::pin(async move {
      assert!(matches!(game.status, GameStatus::Playing));
    })
  })
}

#[test]
fn turn_ends() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.pass_turn().await;
      assert_eq!(game.current_player, 1);
    })
  })
}

#[test]
fn card_modify_works() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let id = game.create_card(0, BaseCard::Dummy).await;
      game
        .modify_card(id, vec![Modifier::SetPower(50.into())])
        .await;
      assert_eq!(id.instance(&game, None).unwrap().power, 50);
    })
  })
}

#[test]
fn serial_hero_lethals_dont_tie() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let p1_hero = game.hero_id(0);
      let p2_hero = game.hero_id(1);

      game.damage(p1_hero, 200, p1_hero).await;
      game.resolve_triggers().await;

      game.damage(p2_hero, 200, p2_hero).await;
      game.resolve_triggers().await;

      if let GameStatus::GameOver { winner } = game.status {
        assert_eq!(winner, Some(1));
      } else {
        panic!("game didn't end!");
      }
    })
  })
}

#[test]
fn parallel_hero_lethals_tie() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let p1_hero = game.hero_id(0);
      let p2_hero = game.hero_id(1);
      let heroes = vec![p1_hero, p2_hero];
      game.damage_many(&heroes, 200, p1_hero).await;
      game.resolve_triggers().await;
      if let GameStatus::GameOver { winner } = game.status {
        assert_eq!(winner, None, "Game didn't tie!");
      } else {
        panic!("game didn't end!");
      }
    })
  })
}

#[test]
fn card_instantiates() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let card_count = game.player_cards(0).limbo().len();
      let card_ptr = game.fake_unit().await;
      assert_eq!(
        game.player_cards(0).limbo().len(),
        card_count + 1,
        "Card count in limbo didn't increment!"
      );
      assert!(
        game
          .reveal_from_card(card_ptr, |info| info.owner == 0
            && info.zone.eq(Zone::Limbo { public: true }).unwrap_or(false))
          .await
      );
    })
  })
}

#[test]
fn card_moves_to_zone() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let card_ptr = game.fake_unit().await;
      game
        .move_to_zone(card_ptr, Zone::Hand { public: false })
        .await;
      assert!(
        game
          .reveal_from_card(card_ptr, |info| info.owner == 0
            && info.zone.is_secret_hand())
          .await
      );
    })
  })
}

#[test]
fn kill_card_on_field() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let id = game.create_card(0, BaseCard::C20000).await;
      game.move_to_zone(id, Zone::Field).await;
      game.kill(id).await;
      game.cleanup_dead_units().await;
      assert!(
        game
          .reveal_from_card(id, |info| info.zone.eq(Zone::Graveyard).unwrap_or(false))
          .await
      );
    })
  })
}

#[test]
fn try_kill_card_not_on_field() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let card_id = game.create_card(0, BaseCard::C20000).await;
      game
        .move_to_zone(card_id, Zone::Hand { public: false })
        .await;
      game.kill(card_id).await;
      game.cleanup_dead_units().await;
      assert!(
        game
          .reveal_from_card(card_id, |info| info
            .zone
            .eq(Zone::Hand { public: false })
            .unwrap())
          .await
      );
    })
  })
}

#[test]
fn card_with_0hp_gets_killed() -> Result<(), String> {
  run_test(|mut game| {
    game.context.enable_logs(false);
    Box::pin(async move {
      let ptr = game.create_card(0, BaseCard::C20000).await;
      game.move_to_zone(ptr, Zone::Field).await;
      game
        .modify_card(ptr, vec![Modifier::SetHealth(0.into())])
        .await;
      assert!(
        game
          .reveal_from_card(ptr, |c| c.marked_for_death.is_some())
          .await
      );
      game.resolve_triggers().await;
      assert!(
        game
          .reveal_from_card(ptr, |info| info.zone.eq(Zone::Graveyard).unwrap_or(false))
          .await
      );
    })
  })
}

#[test]
fn card_with_0hp_gets_attribution() -> Result<(), String> {
  run_test(|mut game| {
    game.context.enable_logs(false);
    Box::pin(async move {
      let ptr = game.create_card(0, BaseCard::C20000).await;
      game.move_to_zone(ptr, Zone::Field).await;

      game.card_execution_context.push(InstanceID::from_raw(1234));
      game
        .modify_card(ptr, vec![Modifier::SetHealth(0.into())])
        .await;

      assert_eq!(
        game
          .reveal_from_card(ptr, |card| card.marked_for_death)
          .await,
        Some(InstanceID::from_raw(1234))
      );

      game.resolve_triggers().await;
      assert!(
        game
          .reveal_from_card(ptr, |info| info.zone.eq(Zone::Graveyard).unwrap_or(false))
          .await
      );
      assert!(
        game
          .reveal_from_card(ptr, |card| card.marked_for_death.is_none())
          .await
      );
    })
  })
}

#[test]
fn attack_does_damage() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let initial_enemy_hero_hp = game.hero(1).view.health;

      let hero_0_id = game.hero_id(0);
      let hero_1_id = game.hero_id(1);
      game.fight(hero_0_id, hero_1_id).await;
      assert_eq!(game.hero(1).view.health, initial_enemy_hero_hp - 1);
    })
  })
}
#[test]
fn can_only_attack_on_field() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let initial_enemy_hero_hp = game.hero(1).view.health;
      let card_id = game.create_card(0, BaseCard::C20000).await;
      game
        .modify_card(card_id, vec![Modifier::SetPower(1.into())])
        .await;
      // Can't attack because it's not on the field
      let hero_1_id = game.hero_id(1);
      game.fight(card_id, hero_1_id).await;
      assert_eq!(game.hero(1).view.health, initial_enemy_hero_hp);
      game.move_to_zone(card_id, Zone::Field).await;
      // now it should be able to attack
      assert_eq!(
        card_id.instance(&game, None).expect("card is public").power,
        1
      );
      game.fight(card_id, hero_1_id).await;
      assert_eq!(game.hero(1).view.health, initial_enemy_hero_hp - 1);
    })
  })
}

#[test]
fn cards_reset_to_base_state_when_moving_field_to_graveyard() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let id = game.create_card(0, BaseCard::C20000).await;
      game.move_to_zone(id, Zone::Field).await;
      game
        .modify_card(id, vec![Modifier::ModifyPower(127, None)])
        .await;
      game.move_to_zone(id, Zone::Graveyard).await;
      game.resolve_triggers().await;
      let card = id.instance(&game, None).unwrap();
      let test_view = CardState::new(*card.base(), Rarity::Base);
      assert_eq!(card.temporary_modifiers.len(), 0);
      assert_eq!(card.view, test_view.view);
    })
  })
}

#[test]
fn cards_reset_to_base_state_when_moving_field_to_deck() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let id = game.create_card(0, BaseCard::C20000).await;
      game.move_to_zone(id, Zone::Field).await;
      game.change_power(id, 100).await;
      game.move_to_zone(id, Zone::Deck).await;
      game.resolve_triggers().await;
      let (modifiers, view, base) = game
        .reveal_from_card(id, |info| {
          (
            info.instance.temporary_modifiers.clone(),
            info.instance.view.clone(),
            *info.instance.base(),
          )
        })
        .await;
      let test_view = CardState::new(base, Rarity::Base);
      assert_eq!(modifiers.len(), 0);
      assert_eq!(view, test_view.view);
    })
  })
}

#[test]
fn attached_spell_resets_when_parent_leaves_field() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let id = game.create_card(0, *UNIT_WITH_SPELL).await;
      game.move_to_zone(id, Zone::Field).await;
      let spell_id = game
        .reveal_from_card(id, |info| info.attachment.unwrap().id())
        .await;
      game.change_power(id, 100).await;
      game.move_to_zone(id, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let card = spell_id.instance(&game, None).unwrap();
      let test_view = CardState::new(*card.base(), Rarity::Base);
      assert_eq!(card.view, test_view.view);
    })
  })
}

#[test]
fn drawing_from_an_empty_deck_conjures_and_deals_fatigue() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      // dust all cards currently in decks, so we'll conjure next draw.
      let deck_indices: Vec<_> = game
        .player_and_enemy_cards()
        .iter()
        .enumerate()
        .flat_map(|(p_id, p)| (0..p.deck()).map(move |i| (p_id as u8, i)))
        .collect();
      for (p, i) in deck_indices {
        let ptr = game.deck_card(p, i);
        game.dust(ptr).await;
      }
      assert_eq!(game.player_cards(0).deck(), 0);
      let hero_starting_hp = game.hero(0).view.health;
      let ptr = game.draw_any_card(0).await.unwrap();
      assert!(
        game
          .reveal_from_card(ptr, |info| info.owner == 0
            && info.zone.eq(Zone::Hand { public: false }).unwrap_or(false))
          .await
      );
      assert_eq!(game.reveal_from_card(ptr, |info| info.owner).await, 0);
      assert!(game.hero(0).view.health < hero_starting_hp);
    })
  })
}

#[test]
fn field_is_ordered_normal_stealth_hero_guard() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let stealth = {
        let ptr = game.fake_unit().await;
        game
          .modify_card(ptr, vec![Modifier::GrantTrait(Trait::Stealth)])
          .await;
        game.summon(ptr).await;
        ptr
      };
      let guard = {
        let ptr = game.fake_unit().await;
        game
          .modify_card(ptr, vec![Modifier::GrantTrait(Trait::Guard)])
          .await;
        game.summon(ptr).await;
        ptr
      };
      let plain = {
        let ptr = game.fake_unit().await;
        game.summon(ptr).await;
        ptr
      };
      game.resolve_triggers().await;
      assert_eq!(
        game.player_cards(0).field().clone(),
        vec![plain, stealth, game.hero_id(0), guard]
      );
    })
  })
}

#[test]
fn card_effect_resolves() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      // Pick a BaseCard that should be summoned on play
      let id = game.create_card(0, BaseCard::C20000).await;
      game.move_to_zone(id, Zone::Casting).await;
      game.resolve_card_effect_as_player(id, None, 0.into()).await;
      assert!(
        game
          .reveal_from_card(id, |info| info.zone.eq(Zone::Field).unwrap_or(false))
          .await
      );
    })
  })
}

#[test]
fn banner_increases_hero_power() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let hero_starting_power = game.hero(0).view.power;
      let id = game.create_card(0, BaseCard::Dummy).await;
      game
        .modify_card(id, vec![Modifier::GrantTrait(Trait::Banner)])
        .await;
      game.move_to_zone(id, Zone::Field).await;
      game.resolve_triggers().await;
      assert_eq!(game.hero(0).view.power, hero_starting_power + 1);
    })
  })
}

#[test]
fn banner_increases_hero_power_when_hero_is_silenced() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let hero_starting_power = game.hero(0).view.power;
      let id = game.create_card(0, BaseCard::Dummy).await;
      game
        .modify_card(id, vec![Modifier::GrantTrait(Trait::Banner)])
        .await;
      game.move_to_zone(id, Zone::Field).await;
      let hero = game.hero_id(0);
      game.give_spell(hero, enchant::SILENCE).await;
      game.resolve_triggers().await;
      assert_eq!(game.hero(0).view.power, hero_starting_power + 1);
    })
  })
}

#[test]
fn banner_increases_power_one_per_unit() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let hero_starting_power = game.hero(0).view.power;
      // make 2 banner cards, both in limbo
      let id = game.create_card(0, BaseCard::Dummy).await;
      let id2 = game.create_card(0, BaseCard::Dummy).await;

      game
        .modify_card(
          id,
          vec![
            Modifier::SetPower(99.into()),
            Modifier::GrantTrait(Trait::Banner),
          ],
        )
        .await;
      game
        .modify_card(
          id2,
          vec![
            Modifier::SetPower(99.into()),
            Modifier::GrantTrait(Trait::Banner),
          ],
        )
        .await;

      game.move_to_zone(id, Zone::Field).await;
      game.resolve_triggers().await;
      assert_eq!(game.hero(0).view.power, hero_starting_power + 1);

      game.move_to_zone(id2, Zone::Field).await;
      game.resolve_triggers().await;
      assert_eq!(game.hero(0).view.power, hero_starting_power + 2);
    })
  })
}

#[test]
fn banner_unit_reaching_0hp_and_dying_removes_hero_bonus_power() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let hero_starting_power = game.hero(0).view.power;
      let id = game.create_card(0, BaseCard::Dummy).await;
      game
        .modify_card(id, vec![Modifier::GrantTrait(Trait::Banner)])
        .await;
      game.move_to_zone(id, Zone::Field).await;
      game.resolve_triggers().await;
      assert_eq!(game.hero(0).view.power, hero_starting_power + 1);

      game
        .modify_card(id, vec![Modifier::SetHealth(0.into())])
        .await;
      game.resolve_triggers().await;
      assert!(
        game
          .reveal_from_card(id, |info| info.zone.eq(Zone::Graveyard).unwrap_or(false))
          .await
      );
      assert_eq!(game.hero(0).view.power, hero_starting_power);
    })
  })
}

#[test]
fn lifesteal_on_unit() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let id = game.create_card(0, BaseCard::Dummy).await;
      game
        .modify_card(
          id,
          vec![
            Modifier::SetPower(10.into()),
            Modifier::GrantTrait(Trait::Lifesteal),
          ],
        )
        .await;
      game.move_to_zone(id, Zone::Field).await;
      game.ready(id).await;

      game.context.enable_logs(true);
      let hero_starting_hp = game.hero(0).health;

      let opp_hero_id = game.hero_id(1);
      game.fight(id, opp_hero_id).await;
      assert_eq!(game.hero(0).health, hero_starting_hp + 10);
    })
  })
}

#[test]
fn lifesteal_with_health_frozen() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let enemy_hero = game.hero_id(1);
      let id = game.create_card(0, BaseCard::Dummy).await;
      game
        .modify_card(
          id,
          vec![
            Modifier::SetPower(10.into()),
            Modifier::GrantTrait(Trait::Lifesteal),
          ],
        )
        .await;
      game
        .modify_card_single(enemy_hero, Modifier::SetHealthFrozen(true))
        .await;
      game.move_to_zone(id, Zone::Field).await;
      game.ready(id).await;

      game.context.enable_logs(true);
      let hero_starting_hp = game.hero(0).health;
      let enemy_hero_starting_hp = game.hero(1).health;

      let opp_hero_id = game.hero_id(1);
      game.fight(id, opp_hero_id).await;
      assert_eq!(game.hero(1).health, enemy_hero_starting_hp);
      assert_eq!(game.hero(0).health, hero_starting_hp + 10);
    })
  })
}

#[test]
fn cant_lifesteal_own_hero() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let hero_starting_hp = game.hero(0).view.health;
      let id = game.create_card(0, BaseCard::Dummy).await;
      game
        .modify_card(
          id,
          vec![
            Modifier::ModifyPower(10, None),
            Modifier::GrantTrait(Trait::Lifesteal),
          ],
        )
        .await;
      game.move_to_zone(id, Zone::Field).await;
      game.ready(id).await;
      // lol, attack your own hero
      let hero_id = game.hero_id(0);
      game.fight(id, hero_id).await;
      // but you should do some damage -
      // if lifesteal did apply, it'd cancel the damage exactly
      assert!(game.hero(0).view.health < hero_starting_hp);
    })
  })
}

#[test]
fn lifesteal_on_spell() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let hero_starting_hp = game.hero(0).view.health;
      let id = game.create_card(0, BaseCard::C59).await;
      assert!(id
        .instance(&game, None)
        .unwrap()
        .traits
        .contains(&Trait::Lifesteal));
      game.resolve_card_effect_as_player(id, None, 0.into()).await;
      assert!(game.hero(0).view.health > hero_starting_hp);
    })
  })
}

#[test]
fn wither_on_unit() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let wither_card = game.create_card(0, BaseCard::Dummy).await;
      let blank_card = game.create_card(1, BaseCard::Dummy).await;
      game
        .modify_card(
          wither_card,
          vec![
            Modifier::SetPower(1.into()),
            Modifier::GrantTrait(Trait::Wither),
          ],
        )
        .await;
      // assert wither
      assert!(
        game
          .reveal_from_card(wither_card, |c| c.traits.get(&Trait::Wither).is_some())
          .await
      );
      game
        .modify_card(
          blank_card,
          vec![
            Modifier::SetPower(10.into()),
            Modifier::SetHealth(10.into()),
          ],
        )
        .await;

      game.move_to_zone(wither_card, Zone::Field).await;
      game.move_to_zone(blank_card, Zone::Field).await;
      game.pass_turn().await;
      game.pass_turn().await;
      let wither_id = wither_card;
      let blank_id = blank_card;
      game.fight(wither_id, blank_id).await;
      assert_eq!(
        blank_card.instance(&game, None).unwrap().health,
        9,
        "Wither didn't apply!"
      );
    })
  })
}

#[test]
fn cant_wither_hero() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let wither_id = game.create_card(0, BaseCard::Dummy).await;
      game
        .modify_card(
          wither_id,
          vec![
            Modifier::SetPower(1.into()),
            Modifier::GrantTrait(Trait::Wither),
          ],
        )
        .await;
      game.move_to_zone(wither_id, Zone::Field).await;
      game.pass_turn().await;
      let hero_starting_power = game.hero(1).view.power;
      let hero_id = game.hero_id(1);
      game.fight(hero_id, wither_id).await;
      assert_eq!(
        game.hero(1).view.power,
        hero_starting_power,
        "Withered hero!!"
      );
    })
  })
}

#[test]
fn wither_on_spell() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let spell_id = game.create_card(0, BaseCard::C2006).await;
      let unit_id = game.create_card(1, BaseCard::Dummy).await;
      game
        .modify_card(
          unit_id,
          vec![
            Modifier::SetPower(10.into()),
            Modifier::SetHealth(10.into()),
          ],
        )
        .await;
      assert!(spell_id
        .instance(&game, None)
        .unwrap()
        .traits
        .contains(&Trait::Wither));
      game
        .resolve_card_effect_as_player(spell_id, Some(unit_id), 0.into())
        .await;
      assert!(unit_id.instance(&game, None).unwrap().power < 10);
    })
  })
}

#[test]
fn armor_on_unit() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let armor_id = game.create_card(0, BaseCard::Dummy).await;
      game
        .modify_card(
          armor_id,
          vec![
            Modifier::SetHealth(10.into()),
            Modifier::GrantTrait(Trait::Armor),
          ],
        )
        .await;
      game.move_to_zone(armor_id, Zone::Field).await;
      game.pass_turn().await;
      let armor_starting_hp = armor_id.instance(&game, None).unwrap().view.health;
      let hero_id = game.hero_id(1);
      game.fight(hero_id, armor_id).await;
      assert_eq!(
        armor_id.instance(&game, None).unwrap().view.health,
        armor_starting_hp,
        "Card took damage!"
      );
    })
  })
}
#[test]
fn turn_limited_temporary_modifiers_apply_and_expire() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let card_id = game.create_card(0, BaseCard::Dummy).await;
      let starting_power = card_id.instance(&game, None).unwrap().view.power;
      game
        .grant_modifier_for_turns(card_id, card_id, Modifier::ModifyPower(10, None), 0, 2)
        .await;
      game.move_to_zone(card_id, Zone::Field).await;
      assert_eq!(
        starting_power + 10,
        card_id.instance(&game, None).unwrap().view.power
      );
      // player turn ends, modifier has 1 turn left
      game.pass_turn().await;
      game.resolve_triggers().await;
      assert_eq!(
        starting_power + 10,
        card_id.instance(&game, None).unwrap().view.power
      );

      // opponent turn ends
      game.pass_turn().await;

      // player turn ends, modifier has 0 turns left, modifier is removed.
      game.pass_turn().await;
      game.resolve_triggers().await;
      assert_eq!(
        starting_power,
        card_id.instance(&game, None).unwrap().view.power
      );
    })
  })
}

#[test]
fn banner_on_spell() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let starting_power = game.hero(0).view.power;
      let spell_id_1 = game.fake_spell().await;
      game
        .modify_card(spell_id_1, vec![Modifier::GrantTrait(Trait::Banner)])
        .await;
      let spell_id_2 = game.fake_spell().await;
      game
        .modify_card(spell_id_2, vec![Modifier::GrantTrait(Trait::Banner)])
        .await;
      game
        .resolve_card_effect_as_player(spell_id_1, None, 0.into())
        .await;
      assert_eq!(game.hero(0).view.power, starting_power + 1);
      game
        .resolve_card_effect_as_player(spell_id_2, None, 0.into())
        .await;
      assert_eq!(game.hero(0).view.power, starting_power + 2);
    })
  })
}

#[test]
fn attached_spell_follows_parent_ownership() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let unit_id = game.create_card(0, *UNIT_WITH_SPELL).await;
      let s_id = game
        .reveal_from_card(unit_id, |info| info.attachment.unwrap().id())
        .await;
      assert_eq!(game.owner(unit_id), 0);
      assert_eq!(game.owner(s_id), 0);
      game
        .run(PhaseMoveToZone {
          card: unit_id.into(),
          zone: Zone::Limbo { public: true },
          player: 1,
        })
        .await;
      assert_eq!(game.owner(unit_id), 1);
      assert_eq!(game.owner(s_id), 1);
    })
  })
}

#[test]
fn attached_spell_replacement_dusts_old_spell() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let unit_ptr = game.create_card(0, *UNIT_WITH_SPELL).await;
      let original_spell = unit_ptr
        .instance(&game, None)
        .unwrap()
        .attachment()
        .unwrap();
      // instantiate a random spell
      let new_spell = game.create_card(0, BaseCard::C20038).await;

      game
        .move_to_zone(
          new_spell,
          Zone::Attachment {
            parent: unit_ptr.into(),
          },
        )
        .await;

      assert!(
        game
          .reveal_from_card(original_spell, |info| info
            .zone
            .eq(Zone::Dust { public: true })
            .unwrap_or(true))
          .await
      );
    })
  })
}

#[test]
fn enchant_can_be_played() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.player_mut(0).done_card_selection = true;
      game.player_mut(1).done_card_selection = true;
      let frozen = enchant::FROSTBITE;
      let hero = game.hero_id(0);
      game.give_spell(hero, frozen).await;
      let frozen_instance_id = game.hero(0).attachment().unwrap();
      game.player_mut(0).mana = frozen_instance_id.instance(&game, None).unwrap().cost;
      let secret = game
        .context
        .reveal_unique(0, |secret| secret.clone(), |_| true)
        .await;
      let valid_actions = crate::client::get_valid_actions(game.game, 0, &secret);
      assert!(valid_actions.iter().any(|action| match action {
        PlayerAction::PlayCard { card_id, .. } => *card_id == frozen_instance_id,
        _ => false,
      }));
    })
  })
}
#[test]
fn hero_ability_can_be_played() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.player_mut(0).done_card_selection = true;
      game.player_mut(1).done_card_selection = true;
      let mana_crystal_instance_id = game.create_card(0, BaseCard::C20017).await;
      game
        .move_to_zone(mana_crystal_instance_id, Zone::HeroAbility)
        .await;
      game
        .context
        .reveal_unique(0, |secret| secret.clone(), |_| true)
        .await;
      game.resolve_triggers().await;
      game
        .move_to_zone(mana_crystal_instance_id, Zone::Casting)
        .await;
      game
        .resolve_card_effect_as_player(mana_crystal_instance_id, None, 0.into())
        .await;
      game.resolve_triggers().await;
      assert_eq!(game.player(0).mana, 3);
    })
  })
}

#[test]
fn player_seed_serializes_and_deserializes() {
  let seed = PlayerSeed {
    prisms: vec![Prism::Agility, Prism::Heart],
    hero_ability: None,
  };

  let bytes = serde_cbor::to_vec(&seed).unwrap();
  let deserialized: PlayerSeed = serde_cbor::from_slice(&bytes).unwrap();
  assert_eq!(seed, deserialized);
}
#[test]
//Another random rule: Cards that costs X should be consider costing 0 when outside of hand or field (for conjure or resummon)
fn x_costs_are_0_outside_field_and_hand_and_attached() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      // public: true
      // This card has x cost: all your mana
      let id = game.create_card(0, BaseCard::C3014).await;
      game.move_to_zone(id, Zone::Hand { public: true }).await;
      game.resolve_triggers().await;
      assert_eq!(id.instance(&game, None).unwrap().cost, game.player(0).mana);
      assert!(id.instance(&game, None).unwrap().view.cost > 0);

      game.move_to_zone(id, Zone::Deck).await;
      game.resolve_triggers().await;
      let secret = game
        .context
        .reveal_unique(0, |secret| secret.clone(), |_| true)
        .await;
      assert_eq!(id.instance(&game, Some(&secret)).unwrap().view.cost, 0);
    })
  })?;
  run_test(|mut game| {
    Box::pin(async move {
      // public: false
      // This card has x cost: all your mana
      let id = game.create_card(0, BaseCard::C3014).await;
      game.move_to_zone(id, Zone::Hand { public: false }).await;
      game.resolve_triggers().await;
      let secret = game
        .context
        .reveal_unique(0, |secret| secret.clone(), |_| true)
        .await;
      assert_eq!(
        id.instance(&game, Some(&secret)).unwrap().cost,
        game.player(0).mana
      );
      assert!(id.instance(&game, Some(&secret)).unwrap().view.cost > 0);
      game.move_to_zone(id, Zone::Deck).await;
      game.resolve_triggers().await;
      let secret = game
        .context
        .reveal_unique(0, |secret| secret.clone(), |_| true)
        .await;
      assert_eq!(id.instance(&game, Some(&secret)).unwrap().view.cost, 0);
    })
  })?;

  // Should have a cost as an attachment
  run_test(|mut game| {
    Box::pin(async move {
      game.resolve_triggers().await;

      // public: false
      // This card has x cost: all your mana
      let hero_id = game.hero_id(0);
      let id = game.create_card(0, BaseCard::C3014).await;
      game
        .move_to_zone(
          id,
          Zone::Attachment {
            parent: hero_id.into(),
          },
        )
        .await;
      game.resolve_triggers().await;
      let secret = game
        .context
        .reveal_unique(0, |secret| secret.clone(), |_| true)
        .await;
      assert_eq!(
        id.instance(&game, Some(&secret)).unwrap().cost,
        game.player(0).mana
      );
      assert!(id.instance(&game, Some(&secret)).unwrap().view.cost > 0);
      game.move_to_zone(id, Zone::Deck).await;
      game.resolve_triggers().await;
      let secret = game
        .context
        .reveal_unique(0, |secret| secret.clone(), |_| true)
        .await;
      assert_eq!(id.instance(&game, Some(&secret)).unwrap().view.cost, 0);
    })
  })
}
#[test]
fn costs_reset_when_entering_field() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let id = game.create_card(0, BaseCard::Dummy).await;
      let base_cost = id.instance(&game, None).unwrap().view.cost;
      game.modify_card(id, vec![Modifier::ModifyCost(50)]).await;
      game.summon(id).await;
      game.resolve_triggers().await;
      assert_eq!(id.instance(&game, None).unwrap().view.cost, base_cost);
    })
  })
}

#[test]
fn auras_are_removed_on_aura_update_phase() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      assert_eq!(game.hero(0).view.attack_state, AttackState::Ready);
      let hero_id = game.hero_id(0);
      game
        .add_aura_modifier(
          hero_id,
          hero_id,
          Modifier::SetAttackState(AttackState::Exhausted),
          0,
        )
        .await;
      game.give_spell(hero_id, BaseCard::C20017).await;
      let attached = game.hero(0).attachment().unwrap();
      game
        .add_aura_modifier(attached, hero_id, Modifier::SetCost(69.into()), 0)
        .await;
      assert_eq!(game.hero(0).view.attack_state, AttackState::Exhausted);
      game.resolve_triggers().await;
      assert_eq!(game.hero(0).view.attack_state, AttackState::Ready);
      assert_ne!(attached.instance(&game, None).unwrap().cost, 69);
    })
  })
}

#[test]
fn game_fills_random_decks() -> Result<(), String> {
  run_test(|game| {
    Box::pin(async move {
      let min_card_count = usize::from(
        game
          .game_params
          .player_params
          .iter()
          .map(|p| p.mulligan_choice_size)
          .sum::<u16>(),
      );
      let num_cards = game
        .player_and_enemy_cards()
        .iter()
        .fold(0, |acc, p| acc + p.deck() + p.card_selection());

      assert!(
        num_cards >= (min_card_count),
        "Game didn't fill empty decks!"
      );
    })
  })
}

#[test]
fn cards_are_sorted() -> Result<(), String> {
  // cards sent to the hand from ids low -> high, and they should be that way in-hand
  run_test(|mut game| {
    Box::pin(async move {
      // start with no cards in hand
      {
        let hand: Vec<_> = (0..game.player_cards(0).hand().len())
          .map(|index| game.hand_card(0, index))
          .collect();
        for id in hand {
          game.dust(id).await;
        }
      }
      let mut card_ptrs = Vec::new();
      for _ in 0..game.game_params.max_hand_size {
        card_ptrs.push(game.create_card(0, BaseCard::Dummy).await);
      }
      for ptr in card_ptrs.iter() {
        game.move_to_zone(*ptr, Zone::Hand { public: true }).await;
      }
      for (a, b) in card_ptrs.into_iter().zip(
        game
          .player_and_enemy_cards()
          .iter()
          .flat_map(|p| p.hand().iter().flatten())
          .copied(),
      ) {
        assert_eq!(a, b);
      }
    })
  })?;

  // but if they're sent high -> low, they should be high -> low in-hand.
  run_test(|mut game| {
    Box::pin(async move {
      // start with no cards in hand
      {
        let hand: Vec<_> = (0..game.player_cards(0).hand().len())
          .map(|index| game.hand_card(0, index))
          .collect();
        for id in hand {
          game.dust(id).await;
        }
      }
      let mut card_ptrs = Vec::new();
      for _ in 0..game.game_params.max_hand_size {
        card_ptrs.push(game.create_card(0, BaseCard::Dummy).await);
      }
      for ptr in card_ptrs.iter().rev() {
        game.move_to_zone(*ptr, Zone::Hand { public: true }).await;
      }
      for (a, b) in card_ptrs.into_iter().rev().zip(
        game
          .player_and_enemy_cards()
          .iter()
          .flat_map(|p| p.hand().iter().filter_map(|id| *id)),
      ) {
        assert_eq!(a, b);
      }
    })
  })
}

#[test]
fn overdraw_returns_a_card_to_deck() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      while game.player_cards(0).hand().len() < usize::from(game.game_params.max_hand_size) {
        game.draw_any_card(0).await;
      }
      for _ in 0..10 {
        assert_eq!(
          game.player_cards(0).hand().len(),
          usize::from(game.game_params.max_hand_size)
        );
        let oldest_pointer = game.hand_card(0, 0);
        game.draw_any_card(0).await;
        assert!(
          game
            .reveal_from_card(oldest_pointer, |info| info
              .zone
              .eq(Zone::Deck)
              .unwrap_or(false))
            .await
        );
      }
    })
  })
}

#[test]
fn max_phase_count_limit_applies() {
  let result = std::panic::catch_unwind(|| {
    run_test(|mut game| {
      Box::pin(async move {
        let hero_id = game.hero_id(0);
        for _ in 0..(crate::live_game::PHASE_LIMIT + 1) {
          game.damage(hero_id, 0, hero_id).await;
        }
      })
    })
  });
  assert!(result.is_err());
}

#[test]
fn units_dont_have_targeted_only_effect() {
  for card in BaseCard::iter() {
    if card.instance().is_unit() {
      if let OnPlayEffect::Targeted { .. } = card.intrinsic_effect().on_play() {
        panic!(
            "cargo:error=Card {:?} is a Unit, but has an OnPlay::Targeted. It must be OnPlay::MaybeTargeted",
            card
          )
      }
    }
  }
}

#[test]
fn card_moves_thru_all_zones() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let card = game.create_card(0, BaseCard::Dummy).await;
      game.move_to_zone(card, Zone::CardSelection).await;
      game.move_to_zone(card, Zone::Casting).await;
      game.move_to_zone(card, Zone::Deck).await;
      game.move_to_zone(card, Zone::Field).await;
      game.move_to_zone(card, Zone::Graveyard).await;
      game.move_to_zone(card, Zone::Hand { public: true }).await;
      game.move_to_zone(card, Zone::Limbo { public: true }).await;

      let fake_spell = game.fake_spell().await;
      let hero = game.hero_id(0).into();
      game
        .move_to_zone(fake_spell, Zone::Attachment { parent: hero })
        .await;
      game
        .move_to_zone(fake_spell, Zone::Dust { public: true })
        .await;
    })
  })
}

#[test]
fn move_out_of_a_zone_with_multiple_cards() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let card = game.create_card(0, BaseCard::Dummy).await;
      let card2 = game.create_card(0, BaseCard::Dummy).await;
      game.move_to_zone(card, Zone::CardSelection).await;
      game.move_to_zone(card2, Zone::CardSelection).await;

      game.move_to_zone(card, Zone::Casting).await;
      game.move_to_zone(card2, Zone::Casting).await;

      game.move_to_zone(card, Zone::Deck).await;
      game.move_to_zone(card2, Zone::Deck).await;

      game.move_to_zone(card, Zone::Field).await;
      game.move_to_zone(card2, Zone::Field).await;

      game.move_to_zone(card, Zone::Graveyard).await;
      game.move_to_zone(card2, Zone::Graveyard).await;

      game.move_to_zone(card, Zone::Hand { public: true }).await;
      game.move_to_zone(card2, Zone::Hand { public: true }).await;

      game.move_to_zone(card, Zone::Limbo { public: true }).await;
      game.move_to_zone(card2, Zone::Limbo { public: true }).await;

      game.move_to_zone(card, Zone::Dust { public: true }).await;
      game.move_to_zone(card2, Zone::Dust { public: true }).await;
    })
  })
}

#[test]
fn silence_shouldnt_affect_non_trigger_effects() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let hero_0_id = game.hero_id(0);
      game.give_spell(hero_0_id, enchant::SILENCE).await;
      assert!(game.hero(0).is_silenced);

      let hero_1_id = game.hero_id(1);
      game
        .modify_card(hero_1_id, vec![Modifier::GrantTrait(Trait::Wither)])
        .await;

      game.damage(hero_0_id, 100, hero_1_id).await;

      assert_eq!(game.hero(0).power, 1);
    })
  })
}

// TODO encode these constraints at the type level.
#[test]
fn all_cards_have_correct_trigger_types() {
  for card in BaseCard::iter() {
    match card.instance().r#type {
      Type::Unit | Type::Hero => {
        match card.intrinsic_effect() {
          Effect::Unit { .. } | Effect::None => {
            // ok
          }
          _ => panic!(
            "Card {:?} is a unit and has wrong effect type in its .rs file.",
            card
          ),
        }
      }
      Type::Enchant => {
        match card.intrinsic_effect() {
          Effect::Enchant { .. } | Effect::None => {
            // ok
          }
          _ => panic!(
            "Card {:?} is an enchant and has wrong effect type in its .rs file.",
            card
          ),
        }
      }
      Type::Spell => {
        match card.intrinsic_effect() {
          Effect::Spell { .. } | Effect::None => {
            // ok
          }
          _ => panic!(
            "Card {:?} is a spell and has wrong effect type in its .rs file.",
            card
          ),
        }
      }
      Type::HeroAbility => {
        match card.intrinsic_effect() {
          Effect::HeroAbility { .. } | Effect::None => {
            // ok
          }
          _ => panic!(
            "Card {:?} is a spell and has wrong effect type in its .rs file.",
            card
          ),
        }
      }
    }
  }
}

#[test]
fn triggers_have_correct_zones_for_secrecy() {
  let all_zones: Vec<Zone> = vec![
    Zone::Deck,
    Zone::CardSelection,
    Zone::Hand { public: false },
    Zone::Hand { public: true },
    Zone::Dust { public: false },
    Zone::Dust { public: true },
    Zone::Limbo { public: false },
    Zone::Limbo { public: true },
    Zone::Field,
    Zone::Graveyard,
    Zone::Casting,
    // todo test attachment?
    // todo test non-intrinsic effects - put these type-level,somehow
  ];
  for card in BaseCard::iter() {
    match card.intrinsic_effect() {
      Effect::Unit { triggers, .. } | Effect::Spell { triggers, .. } => {
        for trigger in triggers {
          let trigger_type_is_public = match trigger {
            TriggerVariant::Normal(..)
            | TriggerVariant::Early(..)
            | TriggerVariant::PhaseModifier(..) => true,
            TriggerVariant::SecretEarly(..) | TriggerVariant::SecretNormal(..) => false,
          };
          for zone in &all_zones {
            let zone_is_public = zone.is_public().unwrap();
            if trigger.is_active(*zone, card.instance()) {
              if trigger_type_is_public {
                assert!(zone_is_public, "Card {:?} has a trigger with variant {}, which can only fire in public, but it `is_active` in secret zone {:?}", card, trigger.name(), zone);
              } else {
                assert!(!zone_is_public, "Card {:?} has a trigger with variant {}, which can only fire in secret, but it `is_active` in public zone {:?}", card, trigger.name(), zone);
              }
            }
          }
        }
      }
      _ => {}
    }
  }
}
#[test]
fn reveal_card_with_attached_spell() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let unit_with_attachment = game.draw(1, |_, b| b.is_some()).await.unwrap();
      game.reveal_card(unit_with_attachment).await;
    })
  })
}

#[test]
fn unstealth_not_triggered_by_0dmg() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.resolve_triggers().await;
      assert!(game
        .hero(0)
        .attack_restrictions
        .contains(&AttackRestriction::HeroNotHitStealth));
      let hero_1_id = game.hero_id(1);
      let hero_0_id = game.hero_id(0);
      game.damage(hero_1_id, 0, hero_0_id).await;
      game.resolve_triggers().await;
      assert!(game
        .hero(0)
        .attack_restrictions
        .contains(&AttackRestriction::HeroNotHitStealth));
    })
  })
}
#[test]
fn unstealth_triggered_by_1dmg() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.resolve_triggers().await;
      assert!(game
        .hero(0)
        .attack_restrictions
        .contains(&AttackRestriction::HeroNotHitStealth));
      let hero_1_id = game.hero_id(1);
      let hero_0_id = game.hero_id(0);
      game.damage(hero_1_id, 1, hero_0_id).await;
      game.resolve_triggers().await;
      assert!(!game
        .hero(0)
        .attack_restrictions
        .contains(&AttackRestriction::HeroNotHitStealth));
    })
  })
}

#[test]
fn unstealth_triggered_by_1dmg_when_hero_silenced() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game
        .instantiate_and_summon(1, *UNIT_WITH_ONLY_STEALTH)
        .await
        .unwrap();
      game.resolve_triggers().await;
      assert!(game
        .hero(0)
        .attack_restrictions
        .contains(&AttackRestriction::HeroNotHitStealth));
      let hero_1_id = game.hero_id(1);
      game.give_spell(hero_1_id, enchant::SILENCE).await;
      game.resolve_triggers().await;
      let hero_0_id = game.hero_id(0);
      game.damage(hero_1_id, 1, hero_0_id).await;
      game.resolve_triggers().await;
      assert!(!game
        .hero(0)
        .attack_restrictions
        .contains(&AttackRestriction::HeroNotHitStealth));
    })
  })
}

#[test]
fn hoplite_isnt_damaged_in_hand_by_flames() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context().enable_logs(false);
      let hoplite = game
        .instantiate_and_summon(0, BaseCard::C20025)
        .await
        .unwrap();
      game.give_spell(hoplite, enchant::FLAMES).await;
      game.resolve_triggers().await;

      // end turn
      game.pass_turn().await;
      game.resolve_triggers().await;
      // start next turn
      game.context().enable_logs(true);
      game.pass_turn().await;
      game.resolve_triggers().await;

      assert!(
        game
          .reveal_from_card(hoplite, |info| info
            .zone
            .eq(Zone::Hand { public: true })
            .unwrap_or(false))
          .await,
      );
      assert_eq!(
        game
          .reveal_from_card(hoplite, |info| info.instance.health)
          .await,
        BaseCard::C20025.instance().health,
        "hoplite took damage from flames in-hand."
      );
    })
  })
}

#[test]
fn place_summoned_units_on_the_outside() -> Result<(), String> {
  // on the right/front if they have guard, or on the left/back otherwise.
  run_test(|mut game| {
    Box::pin(async move {
      let hero = game.hero_id(0);
      let stealth = game
        .instantiate_and_summon(0, *UNIT_WITH_ONLY_STEALTH)
        .await
        .unwrap();
      let guard = game
        .instantiate_and_summon(0, *UNIT_WITH_ONLY_GUARD)
        .await
        .unwrap();
      let normal = game
        .instantiate_and_summon(0, *UNIT_WITH_NO_KEYWORDS)
        .await
        .unwrap();

      // Board state: Normal, Stealth, Hero, Guard

      assert_eq!(
        game.player_cards(0).field(),
        &[normal, stealth, hero, guard],
      );
      let new_stealth = game
        .instantiate_and_summon(0, *UNIT_WITH_ONLY_STEALTH)
        .await
        .unwrap();

      // Board state: Normal, New Stealth, Stealth, Hero, Guard

      assert_eq!(
        game.player_cards(0).field(),
        &[normal, new_stealth, stealth, hero, guard],
        "New stealth unit didn't go to the left of other stealth units.\n{:?}",
        game
          .player_cards(0)
          .field()
          .iter()
          .map(|c| c.instance(&game, None).unwrap().field_age)
          .collect::<Vec<_>>()
      );

      let guard_id = game
        .instantiate_and_summon(0, *UNIT_WITH_ONLY_GUARD)
        .await
        .unwrap();

      // Board state: Normal, New Stealth, Stealth, Hero, Guard, New Guard

      assert_eq!(
        *game.player_cards(0).field().iter().last().unwrap(),
        guard_id,
        "New guard unit didn't go to the right of other guard units"
      );

      let normal_id = game
        .instantiate_and_summon(0, *UNIT_WITH_NO_KEYWORDS)
        .await
        .unwrap();
      // Board state: New Normal, New Stealth, Stealth, Hero, Guard, New Guard
      assert_eq!(
        game.player_cards(0).field()[0],
        normal_id,
        "New normal unit didn't go to the left of other normal units"
      );
    })
  })
}

#[test]
fn vapor_trigger_order_bug_issue_2545() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      for _ in 0..2 {
        let id = game.create_card(0, BaseCard::C1004).await; // kook book
        game.move_to_zone(id, Zone::Deck).await;
      }
      assert_eq!(game.player_cards(0).deck(), 2);
      game.change_mana(0, -255).await;
      let fish_id = game.create_card(0, BaseCard::C4047).await; // school of fish
      game
        .move_to_zone(fish_id, Zone::Hand { public: true })
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(fish_id, Zone::Casting).await;
      game
        .resolve_card_effect_as_player(fish_id, None, 0.into())
        .await;
      game.resolve_triggers().await;
    })
  })
}

#[test]
fn all_units_order_bug_issue_3396() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      // The order of "all units" should always be the current player's units first.
      let p0 = game.create_card(0, BaseCard::Dummy).await;
      let p1 = game.create_card(1, BaseCard::Dummy).await;
      game.move_to_zone(p0, Zone::Field).await;
      game.move_to_zone(p1, Zone::Field).await;

      assert_eq!(game.current_player, 0);
      let all_unit_ids = game.all_units::<InstanceID>();
      assert_eq!(all_unit_ids, vec![p0, p1]);
      game.pass_turn().await;
      let all_unit_ids = game.all_units::<InstanceID>();
      assert_eq!(all_unit_ids, vec![p1, p0]);
    })
  })
}

#[test]
fn attachments_effect_types_apply_on_parent() -> Result<(), String> {
  run_test(|mut game| {
    game.context.enable_logs(false);
    Box::pin(async move {
      let unit_id = game.create_card(0, *UNIT_WITH_EFFECT).await;
      let unit_effects_len = game
        .reveal_from_card(unit_id, |c| c.get_effect_types().count())
        .await;

      let enchant_id = game.create_card(0, enchant::FROSTBITE).await;
      game
        .move_to_zone(
          enchant_id,
          Zone::Attachment {
            parent: unit_id.into(),
          },
        )
        .await;
      game.resolve_triggers().await;

      let unit_combined_effects_len = game
        .reveal_from_card(unit_id, |c| c.get_effect_types().count())
        .await;
      assert_eq!(unit_combined_effects_len, unit_effects_len + 1);

      game
        .move_to_zone(enchant_id, Zone::Dust { public: true })
        .await;
      game.resolve_triggers().await;

      let unit_reset_effects_len = game
        .reveal_from_card(unit_id, |c| c.get_effect_types().count())
        .await;
      assert_eq!(unit_reset_effects_len, unit_effects_len);
    })
  })
}

#[test]
fn give_spell_to_lead_field_unit_does_create_new_spell() -> Result<(), String> {
  run_test(move |mut game| {
    Box::pin(async move {
      let unit_ptr = game.create_card(0, BaseCard::Dummy).await;
      game.summon(unit_ptr).await;
      game.give_spell(unit_ptr, enchant::LEAD).await;

      let dust_size = game.player_cards(0).dust().len();
      game.give_spell(unit_ptr, BaseCard::C20038).await;
      let new_dust_size = game.player_cards(0).dust().len();
      assert_eq!(
        dust_size + 1,
        new_dust_size,
        "Didn't create and dust a spell!"
      );
    })
  })
}

#[test]
fn draw_onto_lead_field_unit_doesnt_draw() -> Result<(), String> {
  let lead = enchant::LEAD;
  run_test(move |mut game| {
    Box::pin(async move {
      let unit_ptr = game.create_card(0, BaseCard::Dummy).await;
      game.summon(unit_ptr).await;
      game.give_spell(unit_ptr, lead).await;

      let dust_size = game.player_cards(0).dust().len();
      game.draw_spell_onto(unit_ptr, |_, _| true).await;
      let new_dust_size = game.player_cards(0).dust().len();
      assert_eq!(
        dust_size, new_dust_size,
        "Created and dusted a spell, we shouldn't have created it at all!"
      );
    })
  })
}

#[test]
fn triggered_effect_creating_card_inherits_parent_rarity() -> Result<(), String> {
  let parent_rarity = Rarity::Gold;
  run_test(move |mut game| {
    Box::pin(async move {
      game.dust_hand(0).await;

      let parent = game.create_card(0, BaseCard::Dummy).await;
      game
        .modify_card(parent, vec![Modifier::SetRarity(parent_rarity)])
        .await;

      game.queue.push(PhaseResolveTrigger {
        id: parent,
        effect: CardEffect::Intrinsic(BaseCard::Dummy),
        effect_type: EffectType::Generic,
        fire: Box::new(|game: &mut LiveGame| {
          Box::pin(async move {
            let new = game.create_card(0, BaseCard::Dummy).await;
            game.move_to_zone(new, Zone::Hand { public: true }).await;
          })
        }),
      });

      assert_eq!(game.player_cards(0).hand().len(), 0);
      game.resolve_triggers().await;

      assert_eq!(game.player_cards(0).hand().len(), 1);
      let child_id = game.player_cards(0).hand()[0].unwrap();
      let child_rarity = game.reveal_from_card(child_id, |c| c.rarity).await;
      assert_eq!(parent_rarity, child_rarity);
    })
  })
}

#[test]
fn reset_gold_card_stays_gold() -> Result<(), String> {
  let parent_rarity = Rarity::Gold;
  run_test(move |mut game| {
    Box::pin(async move {
      let parent = game.create_card(0, BaseCard::Dummy).await;

      let new_rarity = game.reveal_from_card(parent, |c| c.rarity).await;
      assert_eq!(new_rarity, Rarity::Base);

      game
        .modify_card(parent, vec![Modifier::SetRarity(parent_rarity)])
        .await;

      let new_rarity = game.reveal_from_card(parent, |c| c.rarity).await;
      assert_eq!(new_rarity, Rarity::Gold);

      game.reset_card(parent).await;

      let new_rarity = game.reveal_from_card(parent, |c| c.rarity).await;
      assert_eq!(new_rarity, Rarity::Gold);
    })
  })
}

#[test]
fn reset_card_keeps_attachment_correct_rarity() -> Result<(), String> {
  let parent_rarity = Rarity::Gold;
  run_test(move |mut game| {
    Box::pin(async move {
      let parent = game.create_card(0, *UNIT_WITH_SPELL).await;

      game
        .modify_card(parent, vec![Modifier::SetRarity(parent_rarity)])
        .await;

      let new_rarity = game.reveal_from_card(parent, |c| c.rarity).await;
      assert_eq!(new_rarity, Rarity::Gold);

      let attach_rarity = game
        .reveal_from_card(parent, |c| c.attachment.unwrap().rarity)
        .await;
      assert_ne!(attach_rarity, Rarity::Gold);

      game.reset_card(parent).await;

      let new_rarity = game.reveal_from_card(parent, |c| c.rarity).await;
      assert_eq!(new_rarity, Rarity::Gold);
      let attach_rarity = game
        .reveal_from_card(parent, |c| c.attachment.unwrap().rarity)
        .await;
      assert_eq!(
        attach_rarity,
        Rarity::Gold,
        "Attach did not reset to parent rarity"
      );
    })
  })
}

#[test]
fn reset_card_with_removed_attachment_keeps_attachment_correct_rarity() -> Result<(), String> {
  let parent_rarity = Rarity::Gold;
  run_test(move |mut game| {
    Box::pin(async move {
      let parent = game.create_card(0, *UNIT_WITH_SPELL).await;

      game
        .modify_card(parent, vec![Modifier::SetRarity(parent_rarity)])
        .await;

      let new_rarity = game.reveal_from_card(parent, |c| c.rarity).await;
      assert_eq!(new_rarity, Rarity::Gold);

      let attach_rarity = game
        .reveal_from_card(parent, |c| c.attachment.unwrap().rarity)
        .await;
      assert_ne!(attach_rarity, Rarity::Gold);
      let att_id = parent.instance(&game, None).unwrap().attachment().unwrap();
      game.dust(att_id).await;
      game.reset_card(parent).await;

      let new_rarity = game.reveal_from_card(parent, |c| c.rarity).await;
      assert_eq!(new_rarity, Rarity::Gold);
      let attach_rarity = game
        .reveal_from_card(parent, |c| c.attachment.unwrap().rarity)
        .await;
      assert_eq!(
        attach_rarity,
        Rarity::Gold,
        "Attach did not reset to parent rarity"
      );
    })
  })
}

#[test]
fn copy_card_sets_rarity() -> Result<(), String> {
  run_test(move |mut game| {
    Box::pin(async move {
      let parent = game.create_card(0, *UNIT_WITH_SPELL).await;

      game
        .modify_card(parent, vec![Modifier::SetRarity(Rarity::Gold)])
        .await;

      let new_rarity = game.reveal_from_card(parent, |c| c.rarity).await;
      assert_eq!(new_rarity, Rarity::Gold);

      let random_card = game.create_card(0, BaseCard::Dummy).await;
      let random_card_rarity = game.reveal_from_card(random_card, |c| c.rarity).await;
      assert_eq!(random_card_rarity, Rarity::Base);

      game.card_execution_context.push(parent);
      let copy = game.copy_card(random_card, false).await;
      let copy_rarity = game.reveal_from_card(copy, |c| c.rarity).await;

      // Copied with a gold card's effect, copy should be gold.
      assert_eq!(copy_rarity, Rarity::Gold);
    })
  })
}

#[test]
fn lowest_cost_cards_in_hand_works() -> Result<(), String> {
  fn test(
    costs_public: Vec<(u8, bool)>,
    expected_indexes: Vec<usize>,
    message: &'static str,
  ) -> Result<(), String> {
    run_test(move |mut game| {
      game.context.enable_logs(false);
      let costs_public = costs_public.clone();
      let expected_indexes = expected_indexes.clone();
      Box::pin(async move {
        let cards = game.hand_cards(0);
        game.dust_many(cards).await;

        for (cost, public) in costs_public {
          let card = game.create_card(0, BaseCard::Dummy).await;
          game
            .modify_card(card, vec![Modifier::SetCost(cost.into())])
            .await;
          game.move_to_zone(card, Zone::Hand { public }).await;
        }
        let indexes = game
          .lowest_stat_cards_in_hand_indexes(0, |_, _| true, |c, _| c.cost)
          .await;
        assert_eq!(indexes, expected_indexes, "{}", message);
      })
    })
  }

  test(vec![], vec![], "does not work empty")?;
  test(
    vec![(1, false), (1, false), (2, false), (1, false), (3, false)],
    vec![0, 1, 3],
    "does not work in secret",
  )?;
  test(
    vec![(1, true), (1, true), (2, true), (1, true), (3, true)],
    vec![0, 1, 3],
    "does not work in public",
  )?;

  test(
    vec![(1, true), (1, true), (2, false), (1, false), (3, false)],
    vec![0, 1, 3],
    "does not work lowest cost public AND secret",
  )?;

  test(
    vec![(3, true), (4, true), (2, false), (4, true), (5, true)],
    vec![2],
    "does not work lowest cost secret among public",
  )?;

  test(
    vec![(3, false), (4, false), (2, true), (4, false), (5, false)],
    vec![2],
    "does not work lowest cost public among secret",
  )?;

  Ok(())
}

#[test]
fn test_hand_auras_reset_when_card_is_mulliganed() -> Result<(), String> {
  run_test(move |mut game| {
    Box::pin(async move {
      let hand_spell = game.create_card(0, *SPELL_CARD).await;
      game
        .move_to_zone(hand_spell, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;

      let base_cost = game.reveal_from_card(hand_spell, |c| c.cost).await;
      // geod!
      game.instantiate_and_summon(1, BaseCard::C3).await.unwrap();
      game.resolve_triggers().await;
      assert_eq!(
        game.reveal_from_card(hand_spell, |c| c.cost).await,
        base_cost + 1,
        "Geod didn't apply"
      );
      game.move_to_zone(hand_spell, Zone::Deck).await;
      game.resolve_triggers().await;
      assert_eq!(
        game.reveal_from_card(hand_spell, |c| c.cost).await,
        base_cost,
        "Aura didn't reset when card left hand!"
      );
    })
  })
}

#[test]
fn hero_damage_this_turn_tracker() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let p1_hero = game.hero_id(0);
      let p2_hero = game.hero_id(1);
      assert_eq!(game.hero(0).health, 31); //no first turn draw, no fatigue
      assert_eq!(game.player(0).this_turn_stats.hero_hp_lost, 0);
      game.damage(p1_hero, 1, p1_hero).await;
      game.resolve_triggers().await;
      assert_eq!(game.player(0).this_turn_stats.hero_hp_lost, 1);

      assert_eq!(game.player(1).this_turn_stats.hero_hp_lost, 0);
      game.damage(p2_hero, 2, p2_hero).await;
      game.resolve_triggers().await;
      assert_eq!(game.player(1).this_turn_stats.hero_hp_lost, 2);

      game.damage(p2_hero, 2, p2_hero).await;
      game.resolve_triggers().await;
      assert_eq!(game.player(1).this_turn_stats.hero_hp_lost, 4);

      game.pass_turn().await;
      assert_eq!(game.player(0).this_turn_stats.hero_hp_lost, 0);
      assert_eq!(game.player(1).this_turn_stats.hero_hp_lost, 0); // player 2 does not draw first turn
    })
  })
}

#[test]
fn allies_died_this_turn_tracker() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      assert_eq!(game.player(0).this_turn_stats.allies_died, vec![]);
      assert_eq!(game.player(1).this_turn_stats.allies_died, vec![]);
      let card = game
        .instantiate_and_summon(0, BaseCard::C1055)
        .await
        .unwrap();
      game.kill(card).await;
      game.resolve_triggers().await;
      assert_eq!(game.player(0).this_turn_stats.allies_died, vec![card]);
      assert_eq!(game.player(1).this_turn_stats.allies_died, vec![]);

      let card2 = game
        .instantiate_and_summon(1, BaseCard::C1055)
        .await
        .unwrap();
      game.kill(card2).await;
      game.resolve_triggers().await;
      assert_eq!(game.player(0).this_turn_stats.allies_died, vec![card]);
      assert_eq!(game.player(1).this_turn_stats.allies_died, vec![card2]);

      game.pass_turn().await;
      game.resolve_triggers().await;
      assert_eq!(game.player(0).this_turn_stats.allies_died, vec![]);
      assert_eq!(game.player(1).this_turn_stats.allies_died, vec![]);

      let card3 = game
        .instantiate_and_summon(0, BaseCard::C1055)
        .await
        .unwrap();
      game.kill(card3).await;
      game.resolve_triggers().await;
      assert_eq!(game.player(0).this_turn_stats.allies_died, vec![card3]);
      assert_eq!(game.player(1).this_turn_stats.allies_died, vec![]);

      let card4 = game
        .instantiate_and_summon(1, BaseCard::C1055)
        .await
        .unwrap();
      game.kill(card4).await;
      game.resolve_triggers().await;
      assert_eq!(game.player(0).this_turn_stats.allies_died, vec![card3]);
      assert_eq!(game.player(1).this_turn_stats.allies_died, vec![card4]);

      let card5 = game
        .instantiate_and_summon(1, BaseCard::C1055)
        .await
        .unwrap();
      game.kill(card5).await;
      game.resolve_triggers().await;
      assert_eq!(game.player(0).this_turn_stats.allies_died, vec![card3]);
      assert_eq!(
        game.player(1).this_turn_stats.allies_died,
        vec![card4, card5]
      );
    })
  })
}

#[test]
fn test_unit_summoned_asleep() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let unit = game
        .instantiate_and_summon(0, BaseCard::Dummy)
        .await
        .unwrap();
      game.resolve_triggers().await;
      game
        .reveal_from_card(unit, |c| {
          assert_eq!(c.attack_state, AttackState::Sleeping);
        })
        .await;
    })
  })
}

#[test]
fn test_unit_summoned_given_dash_can_dash() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let unit = game
        .instantiate_and_summon(0, BaseCard::Dummy)
        .await
        .unwrap();
      game
        .modify_card_single(unit, Modifier::GrantTrait(Trait::Dash))
        .await;
      game.resolve_triggers().await;

      game
        .reveal_from_card(unit, |c| {
          assert_eq!(c.attack_state, AttackState::Ready);
          assert!(c.attack_restrictions.contains(&AttackRestriction::Dash));
        })
        .await;
    })
  })
}
#[test]
fn test_dash_removed_at_turn_end() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let unit = game
        .instantiate_and_summon(0, BaseCard::Dummy)
        .await
        .unwrap();
      game
        .modify_card_single(unit, Modifier::GrantTrait(Trait::Dash))
        .await;
      game.resolve_triggers().await;

      game
        .reveal_from_card(unit, |c| {
          assert_eq!(c.attack_state, AttackState::Ready);
          assert!(c.attack_restrictions.contains(&AttackRestriction::Dash));
        })
        .await;
      game.pass_turn().await;
      game.resolve_triggers().await;
      game
        .reveal_from_card(unit, |c| {
          assert!(!c.attack_restrictions.contains(&AttackRestriction::Dash));
        })
        .await;
    })
  })
}

#[test]
fn test_unit_summon_given_dash_attack_remove_dash() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let unit = game
        .instantiate_and_summon(0, BaseCard::Dummy)
        .await
        .unwrap();
      game
        .modify_card_single(unit, Modifier::GrantTrait(Trait::Dash))
        .await;
      game.resolve_triggers().await;

      game
        .modify_card_single(unit, Modifier::SetAttackState(AttackState::Exhausted))
        .await;
      game
        .modify_card_single(unit, Modifier::SetDidAttack(true))
        .await;
      game.resolve_triggers().await;

      game
        .reveal_from_card(unit, |c| {
          assert_eq!(c.attack_state, AttackState::Exhausted);
        })
        .await;

      game
        .modify_card_single(unit, Modifier::RemoveTrait(Trait::Dash))
        .await;
      game.resolve_triggers().await;

      game
        .reveal_from_card(unit, |c| {
          assert_eq!(c.attack_state, AttackState::Exhausted);
        })
        .await;
    })
  })
}

#[test]
fn test_unit_summon_readied_attacks_sleeped_given_dash() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let unit = game
        .instantiate_and_summon(0, BaseCard::Dummy)
        .await
        .unwrap();
      game.ready(unit).await;
      game
        .modify_card_single(unit, Modifier::SetAttackState(AttackState::Exhausted))
        .await;
      game
        .modify_card_single(unit, Modifier::SetDidAttack(true))
        .await;
      game.resolve_triggers().await;

      game
        .reveal_from_card(unit, |c| {
          assert_eq!(c.attack_state, AttackState::Exhausted);
        })
        .await;

      game.sleep(unit).await;
      game.resolve_triggers().await;
      game
        .reveal_from_card(unit, |c| {
          assert_eq!(c.attack_state, AttackState::Sleeping);
        })
        .await;

      game
        .modify_card_single(unit, Modifier::GrantTrait(Trait::Dash))
        .await;
      game.resolve_triggers().await;

      game
        .reveal_from_card(unit, |c| {
          assert_eq!(c.attack_state, AttackState::Exhausted);
        })
        .await;
    })
  })
}

#[test]
fn test_unit_summon_given_dash_chains() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let unit = game
        .instantiate_and_summon(0, BaseCard::Dummy)
        .await
        .unwrap();
      game.resolve_triggers().await;
      game
        .reveal_from_card(unit, |c| {
          assert_eq!(c.attack_state, AttackState::Sleeping);
        })
        .await;

      game
        .modify_card_single(unit, Modifier::GrantTrait(Trait::Dash))
        .await;
      game.resolve_triggers().await;

      game
        .reveal_from_card(unit, |c| {
          assert!(c.attack_restrictions.contains(&AttackRestriction::Dash));
          assert_eq!(c.attack_state, AttackState::Ready);
        })
        .await;

      let chains = game.give_spell(unit, enchant::CHAINS).await.unwrap();
      game.resolve_triggers().await;

      game
        .reveal_from_card(unit, |c| {
          assert_eq!(c.attack_state, AttackState::Sleeping);
        })
        .await;

      game.dust(chains).await;
      game.resolve_triggers().await;

      game
        .reveal_from_card(unit, |c| {
          assert!(c.attack_restrictions.contains(&AttackRestriction::Dash));
          assert_eq!(c.attack_state, AttackState::Ready);
        })
        .await;
    })
  })
}

#[test]
fn test_unit_summon_given_dash_slept() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let unit = game
        .instantiate_and_summon(0, BaseCard::Dummy)
        .await
        .unwrap();
      game.resolve_triggers().await;
      game
        .reveal_from_card(unit, |c| {
          assert_eq!(c.attack_state, AttackState::Sleeping);
        })
        .await;

      game
        .modify_card_single(unit, Modifier::GrantTrait(Trait::Dash))
        .await;
      game.resolve_triggers().await;

      game
        .reveal_from_card(unit, |c| {
          assert!(c.attack_restrictions.contains(&AttackRestriction::Dash));
          assert_eq!(c.attack_state, AttackState::Ready);
        })
        .await;

      game.sleep(unit).await;
      game.resolve_triggers().await;

      game
        .reveal_from_card(unit, |c| {
          assert_eq!(c.attack_state, AttackState::Sleeping);
        })
        .await;

      game
        .modify_card_single(unit, Modifier::GrantTrait(Trait::Dash))
        .await;
      game.resolve_triggers().await;

      game
        .reveal_from_card(unit, |c| {
          assert_eq!(c.attack_state, AttackState::Sleeping);
        })
        .await;
    })
  })
}

#[test]
fn test_unit_summon_given_dash_roots() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let unit = game
        .instantiate_and_summon(0, BaseCard::Dummy)
        .await
        .unwrap();
      game.resolve_triggers().await;
      game
        .reveal_from_card(unit, |c| {
          assert_eq!(c.attack_state, AttackState::Sleeping);
        })
        .await;

      game
        .modify_card_single(unit, Modifier::GrantTrait(Trait::Dash))
        .await;
      game.resolve_triggers().await;

      game
        .reveal_from_card(unit, |c| {
          assert!(c.attack_restrictions.contains(&AttackRestriction::Dash));
          assert_eq!(c.attack_state, AttackState::Ready);
        })
        .await;

      game.give_spell(unit, enchant::ROOTS).await;
      game.resolve_triggers().await;

      game
        .reveal_from_card(unit, |c| {
          assert_eq!(c.attack_state, AttackState::Exhausted);
        })
        .await;
    })
  })
}

#[test]
fn test_unit_summon_given_dash_removed_slept_given() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let unit = game
        .instantiate_and_summon(0, BaseCard::Dummy)
        .await
        .unwrap();
      game.resolve_triggers().await;
      game
        .reveal_from_card(unit, |c| {
          assert_eq!(c.attack_state, AttackState::Sleeping);
        })
        .await;

      game
        .modify_card_single(unit, Modifier::GrantTrait(Trait::Dash))
        .await;
      game.resolve_triggers().await;

      game
        .reveal_from_card(unit, |c| {
          assert!(c.attack_restrictions.contains(&AttackRestriction::Dash));
          assert_eq!(c.attack_state, AttackState::Ready);
        })
        .await;

      game
        .modify_card_single(unit, Modifier::RemoveTrait(Trait::Dash))
        .await;
      game.resolve_triggers().await;

      game.sleep(unit).await;
      game.resolve_triggers().await;

      game
        .modify_card_single(unit, Modifier::GrantTrait(Trait::Dash))
        .await;
      game.resolve_triggers().await;

      game
        .reveal_from_card(unit, |c| {
          assert!(c.attack_restrictions.contains(&AttackRestriction::Dash));
          assert_eq!(c.attack_state, AttackState::Ready);
        })
        .await;
    })
  })
}

#[test]
fn test_unit_summon_with_dash() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let unit = game
        .instantiate_and_run_and_summon(0, BaseCard::Dummy, |game, id| {
          Box::pin(async move {
            game
              .modify_card_single(id, Modifier::GrantTrait(Trait::Dash))
              .await;
          })
        })
        .await
        .unwrap();

      game.resolve_triggers().await;
      game
        .reveal_from_card(unit, |c| {
          assert!(c.attack_restrictions.contains(&AttackRestriction::Dash));
          assert_eq!(c.attack_state, AttackState::Ready);
        })
        .await;
    })
  })
}

#[test]
fn test_tavern_mode_gotta_go_fast() -> Result<(), String> {
  run_test_with_params(
    GameParams {
      tavern_mode: Some(TavernMode::GottaGoFast),
      ..Default::default()
    },
    |mut game| {
      Box::pin(async move {
        game.context.enable_logs(false);
        let micron_drone = game.create_card(0, BaseCard::C20058).await;

        game.resolve_triggers().await;
        game
          .move_to_zone(micron_drone, Zone::Hand { public: false })
          .await;
        game.resolve_triggers().await;
        game.move_to_zone(micron_drone, Zone::Field).await;
        game.resolve_triggers().await;
        let power = game
          .units::<&CardInstance<SkyWeaver>>(0)
          .iter()
          .find(|c| c.base() == &BaseCard::C20058)
          .map(|c| c.power)
          .unwrap_or(0.into());
        assert_eq!(power, 3);
      })
    },
  )
}

#[test]
fn test_horde_health_frozen() -> Result<(), String> {
  run_test_with_params(
    GameParams {
      tavern_mode: Some(TavernMode::Horde),
      ..Default::default()
    },
    |mut game| {
      Box::pin(async move {
        game.context.enable_logs(false);
        let micron_drone = game.create_card(0, BaseCard::C20058).await;
        let horde = game.hero_id(1);
        game.resolve_triggers().await;

        game.move_to_zone(micron_drone, Zone::Field).await;
        game.resolve_triggers().await;
        game.fight(micron_drone, horde).await;
        game.resolve_triggers().await;

        let horde_health = game.reveal_from_card(horde, |c| c.health).await;
        assert_eq!(horde_health, 99);
      })
    },
  )
}

#[test]
fn test_surit_overdrive_summon_timing() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let overdrive = game.create_card(0, BaseCard::C4118).await;
      game.move_to_zone(overdrive, Zone::Casting).await;
      game
        .resolve_card_effect_as_player(overdrive, None, 0.into())
        .await;
      game.move_to_zone(overdrive, Zone::Graveyard).await;
      game.resolve_triggers().await;

      // summon Surit
      game.instantiate_and_summon(0, BaseCard::C3124).await;
      game.resolve_triggers().await;

      // make a dummy unit
      let dummy_unit = game.create_card(0, BaseCard::C20000).await;
      game
        .move_to_zone(dummy_unit, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;

      let unit_hp = game.reveal_from_card(dummy_unit, |c| c.health).await;

      // Summon a 1c micron drone.
      let drone = game
        .instantiate_and_summon(0, BaseCard::C20058)
        .await
        .unwrap();
      game.resolve_triggers().await;

      // Overdrive buffs it.
      assert!(
        game
          .reveal_from_card(drone, |c| c.health > c.base().instance().health)
          .await
      );

      // The overdrive buff applied before it hit the field, so Surit didn't trigger.

      assert!(
        game
          .reveal_from_card(dummy_unit, move |c| c.health == unit_hp)
          .await
      );
    })
  })
}

#[test]
fn death_attribution_when_being_attacked() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let armor_id = game.create_card(0, BaseCard::Dummy).await;
      game
        .modify_card(
          armor_id,
          vec![
            Modifier::SetHealth(10.into()),
            Modifier::SetPower(99.into()),
          ],
        )
        .await;
      game.move_to_zone(armor_id, Zone::Field).await;
      game.ready(armor_id).await;
      game.resolve_triggers().await;
      let hero_id = game.hero_id(1);
      game.fight(armor_id, hero_id).await;
      assert_eq!(
        hero_id.instance(&game, None).unwrap().view.marked_for_death,
        Some(armor_id),
        "Card didn't set death attribution right!"
      );
    })
  })
}

#[test]
fn death_attribution_when_attacking() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let armor_id = game.create_card(0, BaseCard::Dummy).await;
      game
        .modify_card(
          armor_id,
          vec![
            Modifier::SetHealth(10.into()),
            Modifier::SetPower(99.into()),
          ],
        )
        .await;
      game.move_to_zone(armor_id, Zone::Field).await;
      game.ready(armor_id).await;
      game.resolve_triggers().await;
      let hero_id = game.hero_id(1);
      game.fight(hero_id, armor_id).await;
      assert_eq!(
        hero_id.instance(&game, None).unwrap().view.marked_for_death,
        Some(armor_id),
        "Card didn't set death attribution right!"
      );
    })
  })
}
