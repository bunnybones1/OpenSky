use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, _my_id, owner| Box::pin(async move {
        if game.player_has_room_for_unit(owner) {
          let highest_health_dead_unit = game
            .graveyard::<&CardInstance<SkyWeaver>>(owner)
            .into_iter()
            .filter(|c| c.is_unit())
            .rev() // reverse, so 0 index in enumerate is bottom & max is top
            .enumerate()
            // sort by highest cost, then index,
            // so that we get the top highest cost card.
            .max_by_key(|(i, c)| (c.health, *i))
            .map(|c| c.1.id());
          if let Some(to_revive) = highest_health_dead_unit {
            game.summon(to_revive).await;
          }
        }
      })
    }
  ))
});
