use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, _, target_id, _| {
      Box::pin(async move {
        game.give_spell(target_id, enchant::SILENCE).await;
        game
          .modify_card(
            target_id,
            vec![Modifier::SetHealth(1.into()), Modifier::SetPower(1.into())],
          )
          .await;
      })
    },
  }
});
