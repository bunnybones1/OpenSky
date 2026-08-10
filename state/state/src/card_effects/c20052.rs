use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        let highest_pow_among_allies = game
          .units::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .map(|u| u.power)
          .max()
          .map(|val| val.into())
          .unwrap_or(0);
        game.damage(target, highest_pow_among_allies, my_id).await;
      })
    },
  }
});
