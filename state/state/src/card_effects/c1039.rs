use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, _| {
      Box::pin(async move {
        game
          .run_parallel(
            game
              .all_units()
              .into_iter()
              .flat_map(|card| {
                many![
                  PhaseModifyCard {
                    card,
                    modifier: Modifier::ModifyPower(2, None),
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
