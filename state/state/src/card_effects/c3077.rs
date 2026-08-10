use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_target,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game.damage(target, 1, my_id).await;

        let enemy = enemy(owner);

        let enemies = game.characters::<InstanceID>(enemy);
        game.damage_many(&enemies, 1, my_id).await;

        let all_units = game.all_units::<InstanceID>();
        game.damage_many(&all_units, 1, my_id).await;
      })
    },
  }
});
