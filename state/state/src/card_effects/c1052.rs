use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, my_id, target, _| {
      Box::pin(async move {
        game.give_spell(target, enchant::CHAINS).await;
        game.damage(target, 3, my_id).await;
      })
    },
  }
});
