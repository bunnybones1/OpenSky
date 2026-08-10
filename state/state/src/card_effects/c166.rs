use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let player_mana = game.player(owner).mana;
    if player_mana > 0 {
      game
        .run_parallel(
          game
            .characters::<&CardInstance<SkyWeaver>>(owner)
            .into_iter()
            .map_into::<Card>()
            .flat_map(|card| {
              many![PhaseModifyCard {
                card,
                modifier: Modifier::ModifyHealth(1, None).clone(),
                source: my_id
              },]
            })
            .collect(),
        )
        .await;
    }
  }))
  .into()],
  on_play: None
});
