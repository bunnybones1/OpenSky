use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_glory!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let top_dead_unit = game
      .graveyard::<&CardInstance<SkyWeaver>>(enemy(owner))
      .into_iter()
      .find(|c| c.is_unit())
      .map(|c| c.id());
    if let Some(dead_unit) = top_dead_unit {
      if game.dust(dead_unit).await {
        game.instantiate_and_summon(owner, BaseCard::C20013).await;
      }
    }
  }))
  .into()],
  on_play: None
});
