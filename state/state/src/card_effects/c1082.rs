use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::MaybeTargeted {
      does_target: targets::enemy,
      mutate: |game, my_id, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            let get_kws = target
              .instance(game, None)
              .unwrap()
              .traits
              .iter()
              .flat_map(|kw| {
                many![
                  PhaseModifyCard {
                    card: my_id.into(),
                    modifier: Modifier::GrantTrait(*kw),
                    source: my_id
                  },
                  PhaseModifyCard {
                    card: target.into(),
                    modifier: Modifier::RemoveTrait(*kw),
                    source: my_id
                  }
                ]
              })
              .collect();
            game.run_parallel(get_kws).await;
          }
        })
      },
    }
  ))
});
