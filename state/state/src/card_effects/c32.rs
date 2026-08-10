use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: |g, _, _, _, c| c.instance(g, None).unwrap().attachment().is_none(),
    mutate: |game, id, target, _| {
      Box::pin(async move {
        game.damage(target, 3, id).await;
      })
    },
  }
});
