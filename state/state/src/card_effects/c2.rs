use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        for _ in 0..2 {
          game.instantiate_and_summon(owner, BaseCard::C20001).await;
        }
        let modifiers: Vec<_> = game
          .units::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .map_into::<Card>()
          .flat_map(|card| {
            many![
              PhaseModifyCard {
                card,
                modifier: Modifier::ModifyHealth(1, None),
                source: my_id
              },
              PhaseModifyCard {
                card,
                modifier: Modifier::ModifyPower(1, None),
                source: my_id
              }
            ]
          })
          .collect();
        game.run_parallel(modifiers).await;
      })
    },
  }
});
