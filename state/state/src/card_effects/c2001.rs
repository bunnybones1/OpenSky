use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let hero = game.hero_id(owner);
        game.steal_health(target, hero, 3).await;
      })
    },
  }
});
