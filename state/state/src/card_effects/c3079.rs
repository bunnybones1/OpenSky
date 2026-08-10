use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let hero = game.hero_id(owner);

    let highest_health_dead_unit = game
      .graveyard::<&CardInstance<SkyWeaver>>(owner)
      .into_iter()
      .filter(|c| c.is_unit())
      .rev() // reverse, so 0 index in enumerate is bottom & max is top
      .enumerate()
      // sort by highest cost, then index,
      // so that we get the top highest cost card.
      .max_by_key(|(i, c)| (c.health, *i))
      .map(|c| (c.1.id(), c.1.health));

    if let Some((highest_health_dead_unit, highest_health)) = highest_health_dead_unit {
      game.dust(highest_health_dead_unit).await;
      game
        .change_health(hero, SaturatingU8::from(highest_health).into())
        .await;
    }
  }))
  .into()],
  on_play: None
});
