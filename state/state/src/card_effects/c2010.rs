use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        for _ in 0..2 {
          game.draw_any_card(owner).await;
        }
        game.draw_any_card(enemy(owner)).await;
      })
    },
  }
});
