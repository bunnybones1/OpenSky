use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| Box::pin(async move {
      let owner = game.owner(my_id);
      if game.current_player != owner {
        return;
      }
      if let Ok(ResolvedPhaseAttack { attacker, .. }) = phase.try_into() {
        let hero = game.hero_id(owner);
        if attacker == hero {
          queue.add_alive_in_play_resolution(my_id, move |game| {
            Box::pin(async move {
              game
                .grant_modifier_for_turns(
                  hero,
                  my_id,
                  Modifier::GrantEffect(CardEffect::Riptide(my_id)),
                  0,
                  1,
                )
                .await;
            })
          })
        }
      }
    }),
  }
  .into()],
  on_play: None
});

attachable_effect!(
  struct Riptide(InstanceID);,
  RIPTIDE,
  Effect::Unit {
    on_play: None,
    triggers: vec![
      NormalTrigger {
        effect_type: EffectType::Internal,
        priority: aura_order(false, AuraLayer::IncreaseCost),
        is_active: is_on_field_not_silenced,
        run: |game, _queue, my_id, phase, card_effect| {
          Box::pin(async move {
            if let (
              Ok(ResolvedPhaseResolveCardEffect {
                id, played_by_unit, ..
              }),
              CardEffect::Riptide(source),
            ) = (phase.try_into(), card_effect)
            {
              if played_by_unit {
                return;
              }
              let cast_owner = game.owner(id);
              let owner = game.owner(my_id);
              if cast_owner != owner {
                return;
              }
              let hero = game.hero_id(owner);

              game.remove_modifiers_from_source(hero, source).await;
            }
          })
        },
      }
      .into(),
      unit_aura!(
        |game, my_id| Box::pin(async move {
          let owner = game.owner(my_id);
          game
            .aura_cards_have(owner, my_id, |_| true, vec![Modifier::ModifyCost(-1)], 0)
            .await;
        }),
        AuraLayer::IncreaseCost
      )
      .into()
    ]
  }
);
