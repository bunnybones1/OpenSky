use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let top_dead_unit = game
      .graveyard::<&CardInstance<SkyWeaver>>(owner)
      .into_iter()
      .find(|c| c.is_unit() && c.base().instance().cost <= 2)
      .map(|c| c.id());
    if let Some(top_dead_unit) = top_dead_unit {
      game.summon(top_dead_unit).await;
    }
  }))
  .into()],
  on_play: None
});
