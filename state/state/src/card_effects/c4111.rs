use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    move |played_cost, _| played_cost == 1,
    |game, my_id, phase| {
      Box::pin(async move {
        let is_unit = phase.base_card.instance().is_unit();
        let is_spell = phase.base_card.instance().is_spell();
        let owner = game.owner(my_id);
        let target_option = phase.target_id;

        if is_unit & game.player_has_room_for_unit(owner) {
          let copy = game.copy_card(phase.id, true).await;
          game.summon(copy).await;
        }
        if is_spell {
          game.cast_spell_copy_as_unit(phase.id, target_option).await;
        }
      })
    }
  )
  .into()],
  on_play: None
});

#[test]
fn test_tome_golem() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let tome_golem = game
        .instantiate_and_summon(0, BaseCard::C4111)
        .await
        .unwrap();
      game.resolve_triggers().await;
      let test_1c_unit = game.create_card(0, BaseCard::Dummy).await;
      game
        .resolve_card_effect_as_player(test_1c_unit, None, 1.into())
        .await;

      game.resolve_triggers().await;

      let mut field_size = game.units::<Card>(game.owner(tome_golem)).len();
      assert_eq!(field_size, 3);

      let test_3c_unit = game.create_card(0, BaseCard::Dummy).await;
      game
        .modify_card(
          test_3c_unit,
          vec![Modifier::SetHealth(3.into()), Modifier::SetPower(3.into())],
        )
        .await;
      game
        .resolve_card_effect_as_player(test_3c_unit, None, 3.into())
        .await;
      game.resolve_triggers().await;
      field_size = game.field_cards(game.owner(tome_golem)).len();
      assert_eq!(field_size - 1, 4);

      assert_eq!(game.graveyard::<InstanceID>(0).len(), 0);
      let grim_ic_spell = game.create_card(0, BaseCard::C1066).await;
      game
        .move_to_zone(grim_ic_spell, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(grim_ic_spell, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(grim_ic_spell, Some(test_3c_unit), 1.into())
        .await;
      game.move_to_zone(grim_ic_spell, Zone::Graveyard).await;
      game.resolve_triggers().await;

      assert_eq!(game.graveyard::<InstanceID>(0).len(), 3);
    })
  })
}

#[test]
fn test_tome_golem_untargeted_spell() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      game
        .instantiate_and_summon(0, BaseCard::C4111)
        .await
        .unwrap();
      game.resolve_triggers().await;
      let starting_hand_count = game.hand_cards(0).len();
      let hydrate_1c_spell = game.create_card(0, BaseCard::C2010).await;
      game
        .move_to_zone(hydrate_1c_spell, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(hydrate_1c_spell, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(hydrate_1c_spell, None, 1.into())
        .await;
      game.move_to_zone(hydrate_1c_spell, Zone::Graveyard).await;
      game.resolve_triggers().await;

      assert_eq!(game.hand_cards(0).len(), starting_hand_count + 4);
    })
  })
}

#[test]
fn test_tome_golem_manaburn() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let enemy_hero = game.hero_id(1);
      game
        .instantiate_and_summon(0, BaseCard::C4111)
        .await
        .unwrap();
      game.give_spell(enemy_hero, BaseCard::C1081).await;
      game.resolve_triggers().await;

      let manaburn = game.create_card(0, BaseCard::C20004).await;
      game
        .move_to_zone(manaburn, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(manaburn, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(manaburn, Some(enemy_hero), 1.into())
        .await;
      game.move_to_zone(manaburn, Zone::Graveyard).await;
      game.resolve_triggers().await;

      assert!(
        game
          .reveal_from_card(enemy_hero, |c| c.attachment.is_none())
          .await
      );
    })
  })
}
