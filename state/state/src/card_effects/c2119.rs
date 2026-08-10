use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, _, target, _| {
      Box::pin(async move {
        game
          .modify_card(target, vec![Modifier::ModifyHealth(1, None)])
          .await;
        let health = target.instance(game, None).unwrap().health;
        game
          .modify_card_single(target, Modifier::SetPower(health))
          .await;
        game.give_spell(target, BaseCard::C20019).await;
      })
    },
  }
});
