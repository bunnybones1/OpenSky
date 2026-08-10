use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let hero = game.hero_id(owner);
        game
          .grant_modifier_for_turns(
            hero,
            my_id,
            Modifier::GrantEffect(CardEffect::Meditation(my_id, game.turn_count)),
            0,
            3,
          )
          .await;
      })
    },
  }
});
attachable_effect!(
  struct Meditation(InstanceID, u16);,
  MEDITATION,
  Effect::Unit {
    on_play: None,
    triggers: vec![
      EarlyTrigger {
        effect_type: EffectType::Internal,
        priority: aura_order(false, AuraLayer::IncreaseStat),
        is_active: is_on_field_not_silenced,
        run: |game, my_id, phase, card_effect| {
          Box::pin(async move {
            if let (Ok(PhaseAuraUpdate), CardEffect::Meditation(_source, turn_count)) =
              (phase.try_into(), card_effect)
            {
              let owner = game.owner(my_id);
              let hero_id = game.hero_id(owner);
              if turn_count == game.turn_count || owner != game.current_player {
                return;
              }
              game
                .add_aura_modifier(hero_id, my_id, Modifier::ModifyPower(2, None), 0)
                .await;
            }
          })
        },
      }
      .into(),
      PhaseModifier {
        effect_type: EffectType::Internal,
        priority: 0,
        is_active: is_on_field_not_silenced,
        run: |game, my_id, phase, card_effect| Box::pin(async move {
          let owner = game.owner(my_id);

          if let CardEffect::Meditation(_source, turn_count) = card_effect {
            if turn_count == game.turn_count || owner != game.current_player {
              return None;
            }
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
              }) if owner == game.owner(*target)
                && *target == game.hero_id(owner)
                && *amount > 0 =>
              {
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
          }
          None
        }),
      }
      .into()
    ]
  }
);
