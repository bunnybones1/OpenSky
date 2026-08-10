use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let mut rng = game.game.context.random().await;
    let random_grave_unit = game
      .graveyard::<&CardInstance<SkyWeaver>>(owner)
      .into_iter()
      .filter(|c| c.is_unit() && c.id() != my_id)
      .map(|c| c.id())
      .choose(&mut rng);
    if let Some(card) = random_grave_unit {
      game.bounce(card).await;
    }
  }))
  .into()],
  on_play: None
});
