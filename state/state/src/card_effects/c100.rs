use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, id, target, _| {
      Box::pin(async move {
        game.damage(target, 1, id).await;
        game.give_spell(target, enchant::FROSTBITE).await;
      })
    },
  }
});
