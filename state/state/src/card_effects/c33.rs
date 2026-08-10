use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::MaybeTargeted {
      does_target: targets::ally_unit,
      mutate: |game, my_id, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            let target_health = target.instance(game, None).unwrap().health;
            game.change_health(my_id, target_health.into()).await;
          }
        })
      },
    }
  }))
});
