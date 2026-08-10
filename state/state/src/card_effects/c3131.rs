use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game.damage(target, 2, my_id).await;
        for _ in 0..2 {
          game.instantiate_and_summon(owner, BaseCard::C20013).await;
        }
        if target
          .instance(game, None)
          .unwrap()
          .marked_for_death
          .is_some()
        {
          let modifiers: Vec<_> = game
            .units::<&CardInstance<SkyWeaver>>(owner)
            .into_iter()
            .filter(|c| is_zomboid(*c.base()))
            .map_into::<Card>()
            .flat_map(|card| {
              vec![PhaseModifyCard {
                card,
                modifier: Modifier::GrantTrait(Trait::Lifesteal),
                source: my_id,
              }]
            })
            .collect();
          game.run_parallel(modifiers).await;
        }
      })
    },
  }
});
