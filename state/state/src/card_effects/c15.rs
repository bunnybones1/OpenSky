use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        for _ in 0..3 {
          let drawn = game.draw(owner, |c, _| c.is_unit()).await;
          if let Some(drawn) = drawn {
            game.berf(drawn, 1, 1).await;
          }
        }
        let buff_ally_units: Vec<_> = game
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
          .collect();
        game.run_parallel(buff_ally_units).await;
      })
    },
  }
});
