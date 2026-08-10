use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        game
          .run_parallel(
            game
              .units(owner)
              .into_iter()
              .flat_map(|card| {
                many![
                  PhaseModifyCard {
                    card,
                    modifier: Modifier::ModifyPower(1, None),
                    source: my_id
                  },
                  PhaseModifyCard {
                    card,
                    modifier: Modifier::ModifyHealth(1, None),
                    source: my_id
                  }
                ]
              })
              .collect(),
          )
          .await;
        game
          .run_parallel(
            game
              .enemy_units(owner)
              .into_iter()
              .flat_map(|card| {
                many![
                  PhaseModifyCard {
                    card,
                    modifier: Modifier::ModifyPower(-1, None),
                    source: my_id
                  },
                  PhaseModifyCard {
                    card,
                    modifier: Modifier::ModifyHealth(-1, None),
                    source: my_id
                  }
                ]
              })
              .collect(),
          )
          .await;
      })
    },
  }
});
