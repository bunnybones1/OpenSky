use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![PhaseModifier {
    effect_type: EffectType::Continuous,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, my_id, phase, _| Box::pin(async move {
      let owner = game.owner(my_id);
      match <&_>::try_from(phase) {
        Ok(PhaseDamage {
          target,
          kind: DamageKind::Combat {
            is_retaliation: false,
          },
          amount,
          source,
          is_wither,
          lifesteal_from,
        }) if source == &game.hero_id(owner)
          && game.reveal_from_card(target, |c| c.is_unit()).await =>
        {
          return Some(
            PhaseDamage {
              target: *target,
              kind: DamageKind::Combat {
                is_retaliation: false,
              },
              amount: *amount * (2 as u8),
              source: *source,
              is_wither: *is_wither,
              lifesteal_from: *lifesteal_from,
            }
            .into(),
          );
        }
        _ => {}
      }
      None
    }),
  }
  .into()],
  on_play: None
});
