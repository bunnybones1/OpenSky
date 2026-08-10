use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, _| {
      Box::pin(async move {
        let owner = game.owner(my_id);
        let modifiers: Vec<_> = game
          .units(owner)
          .into_iter()
          .flat_map(|card| {
            many![PhaseModifyCard {
              card,
              modifier: Modifier::GrantTrait(Trait::Dash),
              source: my_id
            },]
          })
          .collect();
        game.run_parallel(modifiers).await;
      })
    },
  }
});
