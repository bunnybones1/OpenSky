use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        game.mulligan_hand(owner).await;
        for _ in 0..2 {
          game.draw_any_card(owner).await;
        }
      })
    },
  }
});
