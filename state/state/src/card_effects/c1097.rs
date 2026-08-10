use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        let enemy_units = game.enemy_units(owner);
        game.give_spell_many(&enemy_units, enchant::SILENCE).await;
        game.damage(target, 8, my_id).await;
      })
    }
  }
});
