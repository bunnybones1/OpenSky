use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let my_hero_id = game.hero_id(owner);
        game.fight(my_hero_id, target).await;
      })
    },
  }
});
