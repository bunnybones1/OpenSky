use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game.damage(target, 3, my_id).await;
        game.draw_any_card(owner).await;
      })
    },
  }
});
