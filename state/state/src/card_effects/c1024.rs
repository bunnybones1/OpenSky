use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.element == Element::Dark,
    |game, my_id, _phase| Box::pin(async move {
      let damage = 1;
      let enemy_player = enemy(game.owner(my_id));
      let targets_to_damage = game.characters(enemy_player);

      game.damage_many(&targets_to_damage, damage, my_id).await;
    })
  )
  .into()],
  on_play: None
});

#[test]
fn test_silenced_inspire() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let dummy = game
        .instantiate_and_summon(1, BaseCard::Dummy)
        .await
        .unwrap();
      let mantis = game.create_card(0, BaseCard::C1024).await;
      game.move_to_zone(mantis, Zone::Field).await;
      game.resolve_triggers().await;

      let zomboid = game.create_card(0, BaseCard::C20013).await;
      game
        .move_to_zone(zomboid, Zone::Hand { public: false })
        .await;
      game.give_spell(zomboid, enchant::SILENCE).await;
      game.resolve_triggers().await;
      game.move_to_zone(zomboid, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(zomboid, None, 0.into())
        .await;
      game.resolve_triggers().await;
      assert!(
        game
          .reveal_from_card(dummy, |c| c.zone.is_graveyard())
          .await
      );
    })
  })
}
