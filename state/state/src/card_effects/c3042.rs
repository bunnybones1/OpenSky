use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_glory!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let graveyard_units: Vec<_> = game
      .graveyard::<&CardInstance<SkyWeaver>>(owner)
      .into_iter()
      .filter(|c| c.is_unit())
      .map(|c| c.id())
      .collect();
    if let Some(top) = graveyard_units.first() {
      game.bounce(*top).await;
    }
  }))
  .into()],
  on_play: None
});
