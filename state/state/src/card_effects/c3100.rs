use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let bottom_dead_unit: Option<_> = game
      .graveyard::<&CardInstance<SkyWeaver>>(owner)
      .into_iter()
      .filter(|card| card.is_unit())
      .last()
      .map(|c| c.id());
    if let Some(unit) = bottom_dead_unit {
      if game.player_has_room_for_unit(owner) {
        game
          .modify_card(
            unit,
            vec![
              Modifier::SetPower(4.into()),
              Modifier::SetHealth(4.into()),
              Modifier::GrantTrait(Trait::Guard),
            ],
          )
          .await;
        game.summon(unit).await;
      }
    }
  }))
  .into()],
  on_play: None
});

#[test]
fn test_pharonis_full_board() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      game
        .instantiate_and_summon(0, BaseCard::C3100)
        .await
        .unwrap();
      game.resolve_triggers().await;

      let scrap = game.create_card(0, BaseCard::C3110).await;
      game.move_to_zone(scrap, Zone::Graveyard).await;
      game.resolve_triggers().await;

      for _i in 0..5 {
        game.instantiate_and_summon(0, BaseCard::C2070).await;
        game.resolve_triggers().await;
      }

      game.pass_turn().await;
      game.pass_turn().await;
      let unlucky_birb = game.field_cards(0)[4];
      game
        .move_to_zone(unlucky_birb, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;

      let ancients_rise = game.create_card(0, BaseCard::C3063).await;
      game
        .move_to_zone(ancients_rise, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(ancients_rise, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(ancients_rise, None, 8.into())
        .await;
      game.move_to_zone(ancients_rise, Zone::Graveyard).await;
      game.resolve_triggers().await;

      assert_eq!(game.field_cards(0).len(), 7);
    })
  })
}

#[test]
fn test_pharonis_modifies() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      game
        .instantiate_and_summon(0, BaseCard::C3100)
        .await
        .unwrap();
      game.resolve_triggers().await;

      let scrap = game.create_card(0, BaseCard::C3110).await;
      game.move_to_zone(scrap, Zone::Graveyard).await;
      game.resolve_triggers().await;

      game.pass_turn().await;
      game.pass_turn().await;
      game.resolve_triggers().await;

      assert_eq!(game.field_cards(0).len(), 3);
      assert_eq!(game.reveal_from_card(scrap, |c| c.health).await, 4);
    })
  })
}
