use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, _player| {
      Box::pin(async move {
        game
          .run_parallel(
            game
              .all_units()
              .into_iter()
              .flat_map(|card| {
                many![PhaseModifyCard {
                  card,
                  modifier: Modifier::ModifyHealth(-3, None),
                  source: my_id
                },]
              })
              .collect(),
          )
          .await;
      })
    },
  }
});
