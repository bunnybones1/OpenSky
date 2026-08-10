use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let hero = game.hero_id(owner);

        game
          .grant_modifier_for_turns(
            hero,
            my_id,
            Modifier::GrantEffect(CardEffect::StrikeStorm),
            0,
            1,
          )
          .await;

        let enemy_units = game.enemy_units::<InstanceID>(owner);
        for unit in enemy_units.iter().rev() {
          game.fight(hero, *unit).await;
          game.cleanup_dead_units().await;
        }
      })
    },
  }
});

attachable_effect!(
  struct StrikeStorm;,
  STRIKESTORM,
  Effect::Spell {
    on_play: OnPlayEffect::None,
    triggers: vec![PhaseModifier {
      effect_type: EffectType::Continuous,
      priority: 0,
      is_active: is_on_field_not_silenced,
      run: |game, my_id, phase, _| Box::pin(async move {
        let owner = game.owner(my_id);
        if game.current_player != owner {
          return None;
        }
        match <&PhaseDamage>::try_from(phase) {
          Ok(damage)
            if matches!(
              damage.kind,
              DamageKind::Combat {
                is_retaliation: true
              }
            ) && damage.target == game.hero_id(owner)
              && damage.amount > 0 =>
          {
            Some(
              PhaseDamage {
                amount: 0.into(),
                ..*damage
              }
              .into(),
            )
          }
          _ => None,
        }
      }),
    }
    .into()],
  }
);
