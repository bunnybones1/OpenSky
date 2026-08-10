use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![PhaseModifier {
    effect_type: EffectType::Continuous,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, my_id, phase, _| Box::pin(async move {
      match <&_>::try_from(phase) {
        Ok(PhaseDamage {
          target,
          kind: DamageKind::Combat {
            is_retaliation: true,
          },
          amount,
          source,
          is_wither,
          lifesteal_from,
        }) if my_id == *target && *amount > 0 => {
          return Some(
            PhaseDamage {
              target: *target,
              kind: DamageKind::Combat {
                is_retaliation: true,
              },
              amount: 0.into(),
              source: *source,
              is_wither: *is_wither,
              lifesteal_from: *lifesteal_from,
            }
            .into(),
          );
        }
        _ => {}
      }
      if let Ok(&PhaseAuraUpdate) = phase.try_into() {
        game
          .add_aura_modifier(
            my_id,
            my_id,
            Modifier::RemoveAttackRestrictions(indexset!(
              AttackRestriction::GuardOnField,
              AttackRestriction::HeroNotHitStealth
            )),
            1,
          )
          .await
      }
      None
    }),
  }
  .into()],
  on_play: None
});
