use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let num_attacks = game.player(owner).this_turn_stats.num_hero_attacks;
        for _ in 0..(num_attacks + 1) {
          if let Some(min_health) = game
            .units::<&CardInstance<SkyWeaver>>(enemy(owner))
            .into_iter()
            .enumerate()
            // sort by highest cost, so we get the right highest cost card.
            .min_by_key(|(i, c)| (c.health, *i))
            .map(|(_, c)| c.id())
          {
            game.damage(min_health, 3, my_id).await;
            game.cleanup_dead_units().await;
          }
        }
      })
    },
  }
});
