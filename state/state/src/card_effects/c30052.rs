use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        let damage = 6;
        let (_, overkill) = game.damage(target, damage, my_id).await;

        if overkill > 0 {
          game.dust(target).await;

          let enemy_player = enemy(owner);
          let their_hero = game.hero_id(enemy_player);
          game.damage(their_hero, overkill.into(), my_id).await;
        }
      })
    },
  }
});
