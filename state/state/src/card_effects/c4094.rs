use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![PhaseModifier {
    effect_type: EffectType::Continuous,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, my_id, phase, _| {
      Box::pin(async move {
        match <&PhaseDamage>::try_from(phase) {
          Ok(damage)
            if game.owner(damage.source) == game.owner(my_id)
              && damage.kind == DamageKind::CardEffect
              && game.reveal_from_card(damage.source, |c| c.is_spell()).await =>
          {
            Some(
              PhaseDamage {
                amount: damage.amount + 1,
                ..*damage
              }
              .into(),
            )
          }
          _ => None,
        }
      })
    },
  }
  .into()],
  on_play: None
});
