use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let max_mana: u32 = game.player(owner).max_mana.into();
    let amt = ((max_mana as f32 / 5.).floor()) as i8;

    let buffs = vec![
      Modifier::ModifyHealth(amt, None),
      Modifier::ModifyPower(amt, None),
    ];
    game
      .run_parallel(
        game
          .units::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .filter(|c| c.is_unit())
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
