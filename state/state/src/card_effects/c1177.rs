use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let hero = game.hero_id(owner);
        let overkill = game.fight(hero, target).await;
        if overkill > 0 {
          let enemy_hero = game.hero_id(enemy(owner));
          game.damage(enemy_hero, overkill.into(), hero).await;
        }
      })
    },
  }
});
