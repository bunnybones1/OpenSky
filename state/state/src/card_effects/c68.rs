use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: Vec::new(),
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
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
                  },
                  PhaseModifyCard {
                    card,
                    modifier: Modifier::GrantTrait(Trait::Guard),
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
