use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  // fake death effect so we show a death icon even if it doesn't steal
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Death,
    priority: 0,
    is_active: |_, _| false,
    run: |_, _, _, _, _| Box::pin(async move {})
  }
  .into()],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::MaybeTargeted {
      does_target: targets::enemy_unit,
      mutate: |game, my_id, target, owner| {
        Box::pin(async move {
          if let Some(target) = target {
            let original_owner = game.owner(target);
            game
              .run(PhaseMoveToZone {
                card: target.into(),
                player: owner,
                zone: Zone::Field,
              })
              .await;
            game
              .modify_card_single(target, Modifier::GrantTrait(Trait::Guard))
              .await;
            game
              .modify_card_single(
                my_id,
                Modifier::GrantEffect(CardEffect::BodySnatcher {
                  original_owner,
                  snatched_unit: target,
                }),
              )
              .await;
          }
        })
      },
    }
  ))
});

attachable_effect!(
  struct BodySnatcher {
    original_owner: crate::Player,
    snatched_unit: InstanceID,
  },
  BODYSNATCHER,
  Effect::Unit {
    on_play: None,
    triggers: vec![NormalTrigger {
      effect_type: EffectType::Internal,
      priority: 0,
      is_active: is_on_field_not_silenced,
      run: |_, queue, my_id, phase, effect_source| {
        Box::pin(async move {
          if let Ok(ResolvedPhaseMoveToZone {
            card: dead_card,
            from:
              CardLocation {
                location: Some((Zone::Field, _)),
                ..
              },
            to: (_, Zone::Graveyard),
          }) = phase.try_into()
          {
            if dead_card.id() == Some(my_id) {
              if let CardEffect::BodySnatcher {
                original_owner,
                snatched_unit,
              } = effect_source
              {
                queue.add_resolution(move |game| {
                  Box::pin(async move {
                    if game
                      .reveal_from_card(snatched_unit, |c| c.zone.is_field())
                      .await
                      && game.owner(snatched_unit) != original_owner
                    {
                      game
                        .run(PhaseMoveToZone {
                          card: snatched_unit.into(),
                          player: original_owner,
                          zone: Zone::Field,
                        })
                        .await;
                    }
                  })
                })
              }
            };
          }
        })
      },
    }
    .into()]
  }
);
