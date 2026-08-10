use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let first_last_graveyard_units: IndexSet<_> = game
          .graveyard::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .filter(|c| c.is_unit())
          .take(2)
          .map(|c| c.id())
          .collect();

        for id in &first_last_graveyard_units {
          game.bounce(*id).await;
        }
        for id in &first_last_graveyard_units {
          game.berf(*id, 1, 1).await;
        }
      })
    },
  }
});
