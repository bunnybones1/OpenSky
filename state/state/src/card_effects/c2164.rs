use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![PhaseModifier {
    effect_type: EffectType::Continuous,
    priority: -2,
    is_active: is_on_field_not_silenced,
    run: |game, my_id, phase, _| {
      Box::pin(async move {
        match <&PhaseDamage>::try_from(phase) {
          Ok(damage)
          // if my unit is doing combat dmg
            if damage.source == my_id
              && (matches!(damage.kind, DamageKind::Combat { .. }))
            =>
          {
            //if enemy unit is attacking me, use cached health value
            let health_before_enemy_hit =
              game
                .hero(game.owner(my_id))
                .effects
                .iter()
                .find_map(|m| match m {
                  CardEffect::Calciform(h)
                    if matches!(
                      damage.kind,
                      DamageKind::Combat {
                        is_retaliation: true
                      }
                    ) =>
                  {
                    Some(*h)
                  }
                  _ => None,
                });
            let health = if let Some(h) = health_before_enemy_hit {
              h.into()
            } else {
              damage.source.instance(game, None).unwrap().health
            };
            let hero = game.hero_id(game.owner(my_id));
            game.remove_modifiers_from_source(hero, my_id).await;
            Some(
              PhaseDamage {
                amount: health,
                ..*damage
              }
              .into(),
            )
          }
          Ok(damage)
          //if enemy unit or hero doing combat dmg to my unit
            if game.owner(damage.source) == enemy(game.owner(my_id))
              && (matches!(damage.kind, DamageKind::Combat { is_retaliation: false }))
              && game
                .reveal_from_card(damage.source, |c| c.is_unit() || c.is_hero())
                .await
              && game.reveal_from_card(damage.target, move |c| c.id() == my_id).await =>
          {
            let hero = game.hero_id(game.owner(damage.target));
            let health = damage.target.instance(game, None).unwrap().health;
            //cache health for next dmg phase. Attacker always goes first
            game
              .add_modifier(
                hero,
                my_id,
                Modifier::GrantEffect(CardEffect::Calciform(health.into())),
                false,
                0,
              )
              .await;
            Some(PhaseDamage { ..*damage }.into())
          }
          _ => None,
        }
      })
    },
  }
  .into()],
  on_play: None
});

attachable_effect!(
  struct Calciform(u8);,
  CALCIFORM,
  Effect::Unit {
    on_play: None,
    triggers: vec![]
  }
);
