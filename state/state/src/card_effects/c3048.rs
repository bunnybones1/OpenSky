use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let ally_units = game.units(owner);
        game.give_spell_many(&ally_units, enchant::ANIMA).await;
        game.give_spell(target, enchant::SHIELD).await;
      })
    },
  }
});
