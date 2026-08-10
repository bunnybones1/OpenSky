use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: Vec::new(),
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game.give_spell(target, enchant::FROSTBITE).await;
        let enemy_units = game.enemy_units(owner);
        game.damage_many(&enemy_units, 1, my_id).await;
      })
    },
  },
});
