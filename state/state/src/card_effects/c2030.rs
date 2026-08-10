use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        game
          .run_parallel(
            game
              .enemy_units::<&CardInstance<SkyWeaver>>(owner)
              .into_iter()
              .map_into::<Card>()
              .map(|card| PhaseModifyCard {
                card,
                modifier: Modifier::ModifyPower(-2, None),
                source: my_id,
              })
              .collect(),
          )
          .await;

        let units_to_dust: Vec<_> = game
          .enemy_units::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .filter(|unit| unit.power == 0)
          .map(|unit| PhaseMoveToZone {
            card: unit.into(),
            zone: Zone::Dust { public: true },
            player: game.owner(unit.into()),
          })
          .collect();

        game.run_parallel(units_to_dust).await;
      })
    },
  }
});
