use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        game.berf(target, 3, 3).await;
        let grave_blades = game
          .graveyard::<&CardInstance<SkyWeaver>>(owner)
          .iter()
          .map(|c| *c.base())
          .filter(|b| is_blade(b))
          .collect_vec();
        for base in grave_blades {
          let copy = game.create_card(owner, base.clone()).await;
          game.move_to_zone(copy, Zone::Hand { public: true }).await;
        }
      })
    },
  }
});
