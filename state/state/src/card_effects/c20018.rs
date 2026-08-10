use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        let target_damage = 10;
        game.damage(target, target_damage, my_id).await;

        let aoe_damage = 3;
        let enemy_player = enemy(owner);
        let targets_to_damage: Vec<_> = game
          .characters::<InstanceID>(enemy_player)
          .into_iter()
          .filter(|u| u != &target)
          .collect();

        game
          .damage_many(&targets_to_damage, aoe_damage, my_id)
          .await;
      })
    },
  }
});
