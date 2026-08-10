use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        turbo_effect(game, owner).await;

        let hero = game.hero(owner);

        if hero.health <= 16 {
          turbo_effect(game, owner).await;
        }
      })
    },
  }
});

async fn turbo_effect(game: &mut LiveGame<'_>, owner: Player) {
  let drawn = game.draw(owner, |c, _| c.is_unit()).await;
  if let Some(drawn) = drawn {
    game
      .modify_card(drawn, vec![Modifier::GrantTrait(Trait::Dash)])
      .await;
  }
}
#[test]
fn card_1118() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let original_hand_len = game.hand_cards(0).len();

      let turbo = game.create_card(0, BaseCard::C1118).await;
      let hero = game.hero_id(0);
      game
        .modify_card_single(hero, Modifier::SetHealth(30.into()))
        .await;

      game.move_to_zone(turbo, Zone::Hand { public: false }).await;
      game.resolve_triggers().await;
      game.move_to_zone(turbo, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(turbo, None, 2.into())
        .await;
      game.move_to_zone(turbo, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let hand_len = game.hand_cards(0).len();
      assert_eq!(hand_len, original_hand_len + 1);
    })
  })
}
