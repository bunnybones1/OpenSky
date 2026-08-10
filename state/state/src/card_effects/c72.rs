use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_slay!(|game, my_id, _target| Box::pin(async move {
    let owner = game.owner(my_id);
    let ally_units: Vec<Card> = game
      .units::<InstanceID>(owner)
      .into_iter()
      .filter(|id| id != &my_id)
      .map_into()
      .collect();
    game
      .run_parallel(
        ally_units
          .clone()
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
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::MaybeTargeted {
      does_target: targets::enemy_unit,
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
