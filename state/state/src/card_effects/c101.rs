use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::MaybeTargeted {
      does_target: targets::any_unit,
      mutate: |game, my_id, target, owner| {
        Box::pin(async move {
          if let Some(target) = target {
            let target_owner = game.owner(target);
            if target_owner == owner {
              game.berf(target, 2, 2).await;
            } else {
              game.damage(target, 2, my_id).await;
            }
          }
        })
      },
    }
  ))
});
