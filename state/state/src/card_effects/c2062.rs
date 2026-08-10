use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: |game, _, player, _, card| {
      card.instance(game, None).unwrap().is_hero()
        && game
          .graveyard::<&CardInstance<SkyWeaver>>(game.owner(card))
          .into_iter()
          .filter(|c| c.is_unit())
          .count()
          >= 1
        && game.player_has_room_for_unit(player)
    },
    mutate: |game, _my_id, target, owner| {
      Box::pin(async move {
        let hero_owner = game.owner(target);
        let most_expensive_dead_unit = game
          .graveyard::<&CardInstance<SkyWeaver>>(hero_owner)
          .into_iter()
          .filter(|c| c.is_unit())
          .rev() // reverse, so 0 index in enumerate is bottom & max is top
          .enumerate()
          // sort by highest cost, then index,
          // so that we get the top highest cost card.
          .max_by_key(|(i, c)| (c.base().instance().cost, *i))
          .map(|c| c.1.id());
        if let Some(unit) = most_expensive_dead_unit {
          if game.dust(unit).await {
            game.instantiate_and_summon(owner, BaseCard::C3148).await;
          }
        }
      })
    },
  }
});
