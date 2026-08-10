use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        let enemies = game.enemy_field(owner);
        let targeting_leftmost = enemies[0] == target;
        let left_of_target = if enemies.len() > 1 && !targeting_leftmost {
          // If we don't check !targeting_leftmost, then the `-1` can underflow.
          enemies.get(enemies.iter().position(|id| *id == target).unwrap() - 1)
        } else {
          None
        };
        let targets: Vec<_> = std::iter::once(target)
          .chain(left_of_target.into_iter().copied())
          .collect();
        game.damage_many(&targets, 2, my_id).await;
      })
    },
  }
});
