use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, my_id, target, _| {
      Box::pin(async move {
        let target_power = target.instance(game, None).unwrap().power;
        game.damage(target, target_power.into(), my_id).await;
      })
    },
  }
});
