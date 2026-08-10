use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| Box::pin(async move {
      for _ in 0..4 {
        game.draw_any_card(owner).await;
      }
      let mut rng = game.context.random().await;
      let deck_cards_to_dust = game
        .deck_cards(owner)
        .choose_multiple(&mut rng, 10)
        .copied()
        .collect_vec();

      game.dust_many(deck_cards_to_dust).await;
    }),
  }
});
