use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        game.add_to_hand(owner, BaseCard::C4157).await;
      })
    },
  }
});

#[test]
fn test_fabricate() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let fabricate = game.create_card(0, BaseCard::C25003).await;
      game.move_to_zone(fabricate, Zone::HeroAbility).await;
      game.resolve_triggers().await;
      assert!(game.reveal_from_card(fabricate, |c| !c.is_silenced).await);
      game
        .resolve_card_effect_as_player(fabricate, None, 0.into())
        .await;

      game
        .player_mut(0)
        .hero_ability_casts_or_triggers_since_last_turn_start = 1;
      game.resolve_triggers().await;
      assert!(game.reveal_from_card(fabricate, |c| c.is_silenced).await);
    })
  })
}
