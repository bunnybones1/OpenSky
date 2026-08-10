use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let dead_1c: Vec<_> = game
      .graveyard::<&CardInstance<SkyWeaver>>(owner)
      .into_iter()
      .filter(|c| c.is_unit())
      .map(|c| c.id())
      .collect();
    if let Some(bottom) = dead_1c.last() {
      game.bounce(*bottom).await;
    }
  }))
  .into()],
  on_play: None
});
