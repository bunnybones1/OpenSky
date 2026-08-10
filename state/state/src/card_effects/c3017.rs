use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        if game.player_has_room_for_unit(owner) {
          let most_expensive_dead_unit = game
            .graveyard::<&CardInstance<SkyWeaver>>(owner)
            .into_iter()
            .filter(|c| c.is_unit())
            .rev() // reverse, so 0 index in enumerate is bottom & max is top
            .enumerate()
            // sort by highest cost, then index,
            // so that we get the top highest cost card.
            .max_by_key(|(i, c)| (c.cost, *i))
            .map(|c| c.1.id());
          if let Some(to_revive) = most_expensive_dead_unit {
            game.summon(to_revive).await;
            game.give_spell(to_revive, enchant::FROSTBITE).await;
          }
        }
      })
    },
  }
});
