use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        for _ in 0..2 {
          game
            .conjure(owner, |c, _| c.element == Element::Light)
            .await;
        }
      })
    },
  }
});

#[test]
fn card_661() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let wish_deck = game.create_card(0, BaseCard::C2046).await;
      game
        .resolve_card_effect_as_player(wish_deck, None, 0.into())
        .await;
      game.resolve_triggers().await;
    })
  })
}
