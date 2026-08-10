use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, _, target, _| {
      Box::pin(async move {
        game.bounce(target).await;
        game
          .modify_card(
            target,
            vec![
              Modifier::ModifyPower(2, None),
              Modifier::ModifyHealth(1, None),
              Modifier::ModifyCost(-1),
            ],
          )
          .await;
        game.give_spell(target, enchant::SHROUD).await;
      })
    },
  }
});
