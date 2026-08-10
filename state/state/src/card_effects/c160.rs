use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        game.damage_many(&game.enemy_units(owner), 2, my_id).await;
        game
          .run_parallel(
            game
              .units::<&CardInstance<SkyWeaver>>(owner)
              .into_iter()
              .map_into::<Card>()
              .flat_map(|card| {
                many![PhaseModifyCard {
                  card,
                  modifier: Modifier::ModifyPower(1, None),
                  source: my_id,
                },]
              })
              .collect(),
          )
          .await;
      })
    }
  }
});
