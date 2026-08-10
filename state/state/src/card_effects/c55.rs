use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_glory!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    game
      .run_parallel(
        game
          .units(owner)
          .into_iter()
          .flat_map(|card| {
            many![
              PhaseModifyCard {
                card,
                modifier: Modifier::ModifyPower(1, None),
                source: my_id
              },
              PhaseModifyCard {
                card,
                modifier: Modifier::ModifyHealth(1, None),
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
