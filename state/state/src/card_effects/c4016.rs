use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        game.draw(owner, |c, _| c.element == Element::Light).await;

        let enemy_stealth_units = game
          .units::<&CardInstance<SkyWeaver>>(enemy(owner))
          .into_iter()
          .filter(|c| c.traits.contains(&Trait::Stealth))
          .map(|c| c.id())
          .collect::<Vec<_>>();
        let modify_phases = enemy_stealth_units
          .into_iter()
          .map(|id| PhaseModifyCard {
            card: id.into(),
            modifier: Modifier::RemoveTrait(Trait::Stealth),
            source: my_id,
          })
          .collect();
        game.run_parallel(modify_phases).await;
      })
    },
  }
});
