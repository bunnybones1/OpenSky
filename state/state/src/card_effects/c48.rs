use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let my_hero = game.hero_id(owner);
        game.fight(target, my_hero).await;
        game.kill(target).await;
      })
    },
  }
});
