use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::MaybeTargeted {
      does_target: targets::ally_unit,
      mutate: |game, my_id, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            let target_health = game.reveal_from_card(target, |c| c.health).await;
            game
              .berf(my_id, target_health.into(), target_health.into())
              .await;
          }
        })
      },
    }
  ))
});
