use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        let enemy_player = enemy(owner);
        game.damage(target, 3, my_id).await;
        if target
          .instance(game, None)
          .unwrap()
          .marked_for_death
          .is_some()
        {
          let enemy_hero = game.hero_id(enemy_player);
          game.damage(enemy_hero, 3, my_id).await;
        }
      })
    },
  }
});
