use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::MaybeTargeted {
      does_target: targets::enemy,
      mutate: |game, my_id, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            game.damage(target, 3, my_id).await;
          }
        })
      },
    }
  }))
});
