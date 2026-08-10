use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::MaybeTargeted {
      does_target: |g, s, p, i, c| {
        targets::enemy_unit(g, s, p, i, c) && {
          let c = c.instance(g, None).unwrap();
          c.cost <= 3
        }
      },
      mutate: |game, _, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            game.kill(target).await;
          }
        })
      },
    }
  }))
});
