use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let ally_units: Vec<_> = game
          .units(owner)
          .into_iter()
          .flat_map(|card| {
            vec![
              PhaseModifyCard {
                card,
                modifier: Modifier::ModifyPower(1, None),
                source: my_id,
              },
              PhaseModifyCard {
                card,
                modifier: Modifier::GrantTrait(Trait::Stealth),
                source: my_id,
              },
            ]
          })
          .collect();
        game.run_parallel(ally_units).await;
      })
    },
  }
});
