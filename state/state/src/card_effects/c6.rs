use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        let allies_hp: Vec<_> = game
          .units::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .map(|u| u.health)
          .collect();

        let damage = *allies_hp.iter().max().unwrap_or(&0.into());
        game.damage(target, damage.into(), my_id).await;
      })
    },
  }
});
