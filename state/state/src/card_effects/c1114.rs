use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let hero = game.hero_id(owner);
        game
          .grant_modifier_for_turns(hero, my_id, Modifier::GrantTrait(Trait::Wither), 0, 1)
          .await;
        game.add_to_hand(owner, BaseCard::C20059).await;
      })
    },
  }
});

#[test]
fn test_baneful_strike() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      assert!(!game.hero(0).traits.contains(&Trait::Wither));

      let strike = game.create_card(0, BaseCard::C1114).await;
      game
        .resolve_card_effect_as_player(strike, None, 0.into())
        .await;
      game.resolve_triggers().await;
      assert!(game.hero(0).traits.contains(&Trait::Wither));

      game.pass_turn().await;
      game.resolve_triggers().await;

      assert!(!game.hero(0).traits.contains(&Trait::Wither));
    })
  })
}
