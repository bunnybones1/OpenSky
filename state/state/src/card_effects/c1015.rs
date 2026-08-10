use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        let opp_hero = game.hero_id(enemy(owner));
        game.damage(target, 4, my_id).await;
        game.damage(opp_hero, 4, my_id).await;
      })
    },
  }
});
