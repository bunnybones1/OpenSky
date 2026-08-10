use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    game
      .run_parallel(
        game
          .all_units::<InstanceID>()
          .into_iter()
          .filter(|id| *id != my_id)
          .flat_map(|id| {
            many![
              PhaseModifyCard {
                card: id.into(),
                modifier: Modifier::SetPower(3.into()),
                source: my_id
              },
              PhaseModifyCard {
                card: id.into(),
                modifier: Modifier::SetHealth(3.into()),
                source: my_id
              }
            ]
          })
          .collect(),
      )
      .await;
  }))
  .into()],
  on_play: None
});
