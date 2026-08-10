use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, _owner| {
        Box::pin(async move {
          let units_to_bounce: Vec<_> = game
            .all_units::<InstanceID>()
            .into_iter()
            .filter(|u| u != &my_id)
            .collect();
          game.bounce_many(units_to_bounce).await;
        })
      },
    }
  }))
});
