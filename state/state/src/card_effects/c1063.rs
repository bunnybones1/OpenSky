use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let hero = game.hero_id(owner);
        game.fight(hero, target).await;
      })
    },
  }
});
