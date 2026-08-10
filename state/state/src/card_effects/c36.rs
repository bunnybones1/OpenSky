use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let buffs = vec![
      Modifier::ModifyPower(1, None),
      Modifier::ModifyHealth(2, None),
    ];
    game
      .run_parallel(
        game
          .units::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .filter(|c| c.id() != my_id && c.traits.contains(&Trait::Guard))
          .map_into::<Card>()
          .flat_map(|card| {
            many![
              PhaseModifyCard {
                card,
                modifier: buffs[0].clone(),
                source: my_id
              },
              PhaseModifyCard {
                card,
                modifier: buffs[1].clone(),
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
