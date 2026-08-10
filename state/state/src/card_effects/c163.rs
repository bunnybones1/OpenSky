use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game.kill(target).await;

        let ally_units = game.units(owner);
        game
          .run_parallel(
            ally_units
              .clone()
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
      })
    },
  }
});
