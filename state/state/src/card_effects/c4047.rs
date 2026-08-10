use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        for _ in 0..2 {
          let drawn = game.draw_into_play(owner, |c, _| c.cost == 1).await;

          if let Some(drawn) = drawn {
            game.give_spell(drawn, enchant::VAPORS).await;
          }
        }
      })
    },
  }
});

#[test]
fn card_848_works() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let hunt = game.create_card(0, BaseCard::C4047).await;
      game.move_to_zone(hunt, Zone::Casting).await;
      game
        .resolve_card_effect_as_player(hunt, None, 0.into())
        .await;
      game.resolve_triggers().await;
    })
  })
}
