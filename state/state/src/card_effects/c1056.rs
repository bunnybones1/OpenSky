use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, owner| Box::pin(async move {
    let top_dead_spell = game
      .graveyard::<&CardInstance<SkyWeaver>>(owner)
      .into_iter()
      .filter(|c| c.is_spell())
      .map(|c| (c.id(), c.base().instance().cost))
      .rev() // so last is top
      .max_by_key(|(_, cost)| *cost);

    if let Some((id, cost)) = top_dead_spell {
      if game.dust(id).await {
        game.change_power(my_id, cost.into()).await;
      }
    }
  }))
  .into()],
  on_play: None
});
