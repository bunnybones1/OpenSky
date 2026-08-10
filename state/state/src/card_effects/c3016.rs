use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, _, target, _| {
      Box::pin(async move {
        game
          .modify_card(
            target,
            vec![
              Modifier::GrantTrait(Trait::Guard),
              Modifier::GrantTrait(Trait::Armor),
            ],
          )
          .await;
        game.give_spell(target, enchant::LEAD).await;
      })
    },
  }
});
