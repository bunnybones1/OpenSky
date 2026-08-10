use super::effect_helpers::*;

serializable_filter!(SerializableFilter::C3122, |c| is_zomboid(*c.base()));

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);

    game
      .change_all_base_cards(owner, BaseCard::C20013, BaseCard::C20065)
      .await;

    game.add_global_modifier(
      owner,
      my_id,
      vec![Modifier::ModifyPower(1, None)],
      SerializableFilter::C3122,
    );
  }))
  .into()],
  on_play: None
});

#[test]
fn test_gerry_existing_zomboids() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let z = game.create_card(0, BaseCard::C20013).await;
      let gerry = game.create_card(0, BaseCard::C3122).await;
      let z2 = game.create_card(0, BaseCard::C20013).await;
      game.move_to_zone(z, Zone::Field).await;
      game.move_to_zone(z2, Zone::Graveyard).await;
      game.resolve_triggers().await;
      game.move_to_zone(gerry, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(gerry, None, 7.into())
        .await;
      game.resolve_triggers().await;
      game.kill(gerry).await;
      let enemy_hero_health = game.hero(1).health;

      let grave_roil = game.create_card(0, BaseCard::C3049).await;
      game.move_to_zone(grave_roil, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(grave_roil, Some(z), 10.into())
        .await;
      game.move_to_zone(grave_roil, Zone::Graveyard).await;
      game.resolve_triggers().await;

      assert_eq!(enemy_hero_health - 6, game.hero(1).health);
    })
  })
}
