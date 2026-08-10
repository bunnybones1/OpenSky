use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let hero = game.hero_id(owner);
        game.change_mana_next_turn(owner, 1, my_id).await;
        game.change_health(hero, 2).await;
      })
    },
  }
});

#[test]
fn test_rosewater_charm() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let charm = BaseCard::C2026;

      let c = game.create_card(0, charm).await;
      let orig_mana = game.player(0).mana;
      game.resolve_card_effect_as_player(c, None, 0.into()).await;
      game.resolve_triggers().await;
      game.pass_turn().await;
      game.resolve_triggers().await;

      game.pass_turn().await;
      game.resolve_triggers().await;

      assert_eq!(game.player(0).mana, orig_mana + 1 + 1);
    })
  })
}
