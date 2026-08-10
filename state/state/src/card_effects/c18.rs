use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let ally_buffs: Vec<_> = game
          .units::<Card>(owner)
          .into_iter()
          .flat_map(|card| {
            many![
              PhaseModifyCard {
                card,
                modifier: Modifier::ModifyPower(3, None),
                source: my_id
              },
              PhaseModifyCard {
                card,
                modifier: Modifier::ModifyHealth(3, None),
                source: my_id
              }
            ]
          })
          .collect();

        game.run_parallel(ally_buffs).await;
      })
    },
  }
});
