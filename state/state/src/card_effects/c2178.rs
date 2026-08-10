use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let hp_gain = game
      .player(game.owner(my_id))
      .this_turn_stats
      .hero_hp_gained;
    if hp_gain > 0 {
      game
        .draw(owner, move |c, _| c.is_unit() && c.health == hp_gain)
        .await;
    }
  }))
  .into(),],
  on_play: None
});

#[test]
fn test_2178() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      game.dust_hand(0).await;

      game.instantiate_and_summon(0, BaseCard::C2178).await;
      game.resolve_triggers().await;
      let rosewater = game.create_card(0, BaseCard::C2026).await;
      game.move_to_zone(rosewater, Zone::Casting).await;
      game
        .resolve_card_effect_as_player(rosewater, None, 2.into())
        .await;
      game.move_to_zone(rosewater, Zone::Graveyard).await;
      game.resolve_triggers().await;

      game.pass_turn().await;

      assert_eq!(game.hand_cards(0).len(), 1);
      let hand_card = game.hand_cards(0)[0];
      let hand_card_hp = game.reveal_from_card(hand_card, |c| c.health).await;
      assert_eq!(hand_card_hp, 2);
    })
  })
}
