use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        game
          .modify_card(
            target,
            vec![
              Modifier::ModifyPower(3, None),
              Modifier::ModifyHealth(3, None),
              Modifier::GrantTrait(Trait::Guard),
            ],
          )
          .await;
        game.give_spell(target, enchant::SHIELD).await;
        let enemies = game.enemy_units(owner);
        game.give_spell_many(&enemies, enchant::BLIND).await;
      })
    },
  }
});
