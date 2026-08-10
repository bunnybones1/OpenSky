use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  on_play: None,
  triggers: vec![
    unit_aura!(
      |game, my_id| Box::pin(async move {
        if game
          .reveal_from_card(my_id, |c| c.attack_state != AttackState::Sleeping)
          .await
        {
          game
            .add_aura_modifier(
              my_id,
              my_id,
              Modifier::SetAttackState(AttackState::Exhausted),
              2,
            )
            .await;
        }
      }),
      AuraLayer::Exhaust,
      true
    )
    .into(),
    unit_death!(|game, my_id, _phase| Box::pin(async move {
      let owner = game.owner(my_id);
      game.draw_into_play(owner, |card, _| card.cost == 4).await;
    }))
    .into(),
    PhaseModifier {
      effect_type: EffectType::Internal,
      priority: -1,
      is_active: is_on_field_not_silenced,
      run: |_, my_id, phase, _| Box::pin(async move {
        if let Ok(PhaseAttack { attacker, .. }) = <&PhaseAttack>::try_from(phase) {
          if *attacker == my_id {
            return Some(PhaseCancelled.into());
          }
        };
        None
      }),
    }
    .into(),
  ]
});
