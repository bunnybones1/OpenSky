use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: |g, _, p, _, c| {
      let element = c.instance(g, None).unwrap().element;
      !c.instance(g, None).unwrap().is_hero()
        && g.owner(c) == p
        && g
          .graveyard::<&CardInstance<SkyWeaver>>(p)
          .into_iter()
          .filter(|card| card.element == element && card.is_unit())
          .count()
          > 0
    },
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let target_elem = target.instance(game, None).unwrap().element;
        game.kill(target).await;
        game.cleanup_dead_units().await;
        if game.player_has_room_for_unit(owner) {
          let most_expensive_dead_unit = game
            .graveyard::<&CardInstance<SkyWeaver>>(owner)
            .into_iter()
            .rev() // reverse, so 0 index in enumerate is bottom & max is top
            .filter(|c| {
              c.id() != target && c.is_unit() && c.base().instance().element == target_elem
            })
            .enumerate()
            // sort by highest cost, then index,
            // so that we get the top highest cost card.
            .max_by_key(|(i, c)| (c.cost, *i))
            .map(|(_, c)| c.id());
          if let Some(to_revive) = most_expensive_dead_unit {
            game.summon(to_revive).await;
          }
        }
      })
    },
  }
});
