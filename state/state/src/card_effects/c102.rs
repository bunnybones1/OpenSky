use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game.damage(target, 4, my_id).await;
        let enemy_units = game.enemy_units(owner);
        game.give_spell_many(&enemy_units, enchant::BLIND).await;
        let ally_units = game.units::<InstanceID>(owner);
        for unit in ally_units {
          game
            .modify_card(unit, vec![Modifier::GrantTrait(Trait::Stealth)])
            .await;
        }
      })
    },
  }
});
