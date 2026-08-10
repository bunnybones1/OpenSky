use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, _, target, _| {
      Box::pin(async move {
        game
          .modify_card(
            target,
            vec![
              Modifier::RemoveTrait(Trait::Guard),
              Modifier::RemoveTrait(Trait::Armor),
            ],
          )
          .await;
        game.give_spell(target, enchant::ROOTS).await;
      })
    },
  }
});
