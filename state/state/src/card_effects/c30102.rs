use super::effect_helpers::*;

// Cards get buff one time when entering field
intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      let hero = game.hero_id(owner);
      Box::pin(async move {
        game
          .add_modifier(
            hero,
            my_id,
            Modifier::GrantEffect(CardEffect::Virulence()),
            false,
            0,
          )
          .await;
      })
    },
  }
});

attachable_effect!(
  struct Virulence();,
  VIRULENCE,
  Effect::Unit {
    on_play: None,
    triggers: vec![PhaseModifier {
      effect_type: EffectType::Internal,
      priority: aura_order(false, AuraLayer::IncreaseCost),
      is_active: is_on_field_not_silenced,
      run: |game, my_id, phase, _| {
        Box::pin(async move {
          match <&PhaseDamage>::try_from(phase) {
            Ok(damage)
              if game.owner(damage.source) == game.owner(my_id)
                && damage.source.instance(game, None).unwrap().base() == &BaseCard::C20013
                && damage.kind == DamageKind::CardEffect =>
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
    .into()]
  }
);
