use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: |g, s, p, i, c| targets::any_unit(g, s, p, i, c)
      && c.instance(g, None).unwrap().power <= 2,
    mutate: |game, _, target, _| {
      Box::pin(async move {
        game.dust(target).await;
      })
    },
  }
});
