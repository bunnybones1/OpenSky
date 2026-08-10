use super::effect_helpers::*;
intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_target,
    mutate: |game, my_id, target, _| {
      Box::pin(async move {
        if target.instance(game, None).unwrap().is_unit() {
          game.damage(target, 4, my_id).await;
        } else {
          game.heal(target, 6).await;
        }
      })
    },
  }
});
