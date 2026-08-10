use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    game
      .instantiate_and_run_and_summon(owner, BaseCard::C20013, |game, card| {
        Box::pin(async move {
          game
            .modify_card(card, vec![Modifier::GrantTrait(Trait::Guard)])
            .await;
        })
      })
      .await;

    let top_most_expensive_dead_enemy_unit = game
      .graveyard::<&CardInstance<SkyWeaver>>(enemy(owner))
      .into_iter()
      .filter(|c| c.is_unit())
      .map(|c| (c.id(), c.base().instance().cost))
      .rev() // so last is top
      .max_by_key(|(_, cost)| *cost)
      .map(|(id, _)| id);
    if let Some(unit) = top_most_expensive_dead_enemy_unit {
      game.dust(unit).await;
    }
  }))
  .into()],
  on_play: None
});
