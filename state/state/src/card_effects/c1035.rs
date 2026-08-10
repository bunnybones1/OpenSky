use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        let damage = 2;
        let enemy_player = enemy(owner);
        let targets_to_damage: Vec<_> = game
          .characters::<InstanceID>(enemy_player)
          .into_iter()
          .first_last()
          .chain(std::iter::once(target))
          .collect();

        game.damage_many(&targets_to_damage, damage, my_id).await;
      })
    },
  }
});
