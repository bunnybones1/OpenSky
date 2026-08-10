use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::MaybeTargeted {
      does_target: targets::enemy_unit,
      mutate: |game, my_id, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            let get_pwr = target.instance(game, None).unwrap().power;
            let my_pwr = my_id.instance(game, None).unwrap().power;

            game
              .run_parallel(vec![
                PhaseModifyCard {
                  card: my_id.into(),
                  modifier: Modifier::SetPower(get_pwr),
                  source: my_id,
                },
                PhaseModifyCard {
                  card: target.into(),
                  modifier: Modifier::SetPower(my_pwr),
                  source: my_id,
                },
              ])
              .await;
          }
        })
      },
    }
  ))
});
