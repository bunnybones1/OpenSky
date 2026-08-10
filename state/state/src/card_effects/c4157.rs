use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy,
    mutate: |game, my_id, target, _owner| {
      Box::pin(async move {
        game.damage(target, 1, my_id).await;
      })
    },
  }
});
