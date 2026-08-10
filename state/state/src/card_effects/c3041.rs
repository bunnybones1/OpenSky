use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        if game.owner(target) == owner {
          game.berf(target, 3, 3).await;
        } else {
          game.berf(target, -3, -3).await;
        }
      })
    },
  }
});
