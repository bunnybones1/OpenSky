use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, _| {
      Box::pin(async move {
        let cheapest_health = game
          .all_units::<&CardInstance<SkyWeaver>>()
          .into_iter()
          .map(|c| c.health)
          .min();
        let targets_to_kill: Vec<_> = game
          .all_units::<&CardInstance<SkyWeaver>>()
          .into_iter()
          .filter(|c| Some(c.health) == cheapest_health)
          .map(|token| token.id())
          .collect();

        game.kill_many(targets_to_kill).await;
      })
    },
  }
});
