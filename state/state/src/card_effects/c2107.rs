use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![EarlyTrigger {
    effect_type: EffectType::Generic,
    is_active: is_on_field_not_silenced,
    priority: 0,
    run: |game, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(PhaseAttack { attacker, .. }) = phase.try_into() {
          game.log(crate::client::GameAction::EnterPhase(
            crate::phase::PhaseResolveTrigger {
              id: my_id,
              effect: CardEffect::Intrinsic(BaseCard::C2107),
              effect_type: EffectType::Generic,
              fire: Box::new(move |_| Box::pin(async move {})),
            }
            .into(),
          ));
          if attacker == my_id {
            for player in 0..2 {
              let hero = game.hero_id(player);
              game
                .modify_card_single(hero, Modifier::ModifyHealth(2, None))
                .await;
            }
            for player in 0..2 {
              game.draw_any_card(player).await;
            }
          }

          game.log(crate::client::GameAction::ExitPhase(
            crate::phase::ResolvedPhaseResolveTrigger {
              id: my_id,
              effect: CardEffect::Intrinsic(BaseCard::C2107),
              effect_type: EffectType::Generic,
            }
            .into(),
          ));
        }
      })
    }
  }
  .into()],
  on_play: None
});
