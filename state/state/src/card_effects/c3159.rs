use super::effect_helpers::*;
intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game.kill(target).await;
        let enemy_units = game.enemy_units(owner);
        game.damage_many(&enemy_units, 2, my_id).await;
      })
    },
  }
});
