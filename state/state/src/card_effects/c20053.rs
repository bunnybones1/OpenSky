use super::effect_helpers::*;

intrinsic_effect!(effect_while_attached!(CardEffect::Barrier));

attachable_effect!(
  struct Barrier;,
  BARRIER,
  Effect::Unit {
    on_play: None,
    triggers: vec![PhaseModifier {
      effect_type: EffectType::Generic,
      priority: 2, // after armor!
      is_active: is_on_field_not_silenced,
      run: |game, my_id, phase, _| Box::pin(async move {
        match <&_>::try_from(phase) {
          Ok(PhaseDamage {
            target,
            kind: DamageKind::CardEffect,
            amount,
            source,
            is_wither,
            lifesteal_from,
          }) if my_id == *target && *amount > 0 => {
            if let Some(attach) = my_id.instance(game, None).and_then(|c| c.attachment()) {
              game.dust(attach).await;
              return Some(
                PhaseDamage {
                  target: *target,
                  kind: DamageKind::CardEffect,
                  amount: 0.into(),
                  source: *source,
                  is_wither: *is_wither,
                  lifesteal_from: *lifesteal_from,
                }
                .into(),
              );
            }
          }
          _ => {}
        }
        None
      }),
    }
    .into()]
  }
);
