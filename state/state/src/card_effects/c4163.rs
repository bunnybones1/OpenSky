use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![EarlyTrigger {
    effect_type: EffectType::Generic,
    is_active: is_on_field_not_silenced,
    priority: 0,
    run: |game, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(PhaseAttack { attacker, .. }) = phase.try_into() {
          let my_owner = game.owner(my_id);
          if game.owner(attacker) == my_owner
            && game
              .reveal_from_card(attacker, |c| c.is_unit() && c.cost == 1)
              .await
          {
            game.log(crate::client::GameAction::EnterPhase(
              crate::phase::PhaseResolveTrigger {
                id: my_id,
                effect: CardEffect::Intrinsic(BaseCard::C4163),
                effect_type: EffectType::Generic,
                fire: Box::new(move |_| Box::pin(async move {})),
              }
              .into(),
            ));
            game.give_spell(attacker, BaseCard::C20019).await;

            game.log(crate::client::GameAction::ExitPhase(
              crate::phase::ResolvedPhaseResolveTrigger {
                id: my_id,
                effect: CardEffect::Intrinsic(BaseCard::C4163),
                effect_type: EffectType::Generic,
              }
              .into(),
            ));
          }
        }
      })
    }
  }
  .into()],
  on_play: None
});
