use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);

    let card = game.create_card(owner, BaseCard::C2006).await;
    game.move_to_zone(card, Zone::Casting).await;
    game.cast_spell_on_enemies(card, |_| true, true, true).await;
  }))
  .into()],
  on_play: None
});

#[test]
fn test_cinder_with_shroud() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context().enable_logs(false);
      let unit = game
        .instantiate_and_summon(0, BaseCard::C4038)
        .await
        .unwrap();
      game
        .instantiate_and_summon(1, BaseCard::Dummy)
        .await
        .unwrap();
      let birb_shroud = game
        .instantiate_and_summon(1, BaseCard::Dummy)
        .await
        .unwrap();
      game.resolve_triggers().await;
      game.give_spell(birb_shroud, enchant::SHROUD).await;
      game.resolve_triggers().await;
      game.kill(unit).await;
      game.resolve_triggers().await;

      assert_eq!(game.units::<InstanceID>(1).len(), 1);
    })
  })
}
