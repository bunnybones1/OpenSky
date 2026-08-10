use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    // Return your top highest cost dead unit to hand..
    let most_expensive_matching_card = game
      .graveyard::<&CardInstance<SkyWeaver>>(owner)
      .into_iter()
      .rev() // reverse, so 0 index in enumerate is bottom & max is top
      .enumerate()
      .filter(|c| c.1.is_unit() && c.1.id() != my_id)
      // sort by highest cost, then index,
      // so that we get the top highest cost card.
      .max_by_key(|(i, c)| (c.cost, *i))
      .map(|c| c.1.id());
    if let Some(card) = most_expensive_matching_card {
      game.bounce(card).await;
    }
  }))
  .into()],
  on_play: None
});
