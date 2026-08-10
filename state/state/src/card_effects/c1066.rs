use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, my_id, target, _| {
      Box::pin(async move {
        game.damage(target, 3, my_id).await;
        let owner = game.owner(my_id);
        let owner_hero = game.hero_id(owner);
        game.damage(owner_hero, 3, my_id).await;
      })
    },
  }
});
