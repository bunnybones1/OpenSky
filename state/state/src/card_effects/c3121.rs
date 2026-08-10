use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::MaybeTargeted {
      does_target: targets::ally_unit,
      mutate: |game, _, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            let target_owner = game.owner(target);
            let death: ResolvedPhase = ResolvedPhaseMoveToZone {
              card: target.into(),
              from: CardLocation {
                player: target_owner,
                location: Some((Zone::Field, None)),
              },
              to: (target_owner, Zone::Graveyard),
            }
            .into();
            let triggers = game.get_active_public_triggers().2;

            for trigger in triggers.into_iter().filter(|trigger| {
              trigger.instance() == target && trigger.get().effect_type == EffectType::Death
            }) {
              let mut queue = Queue::default();
              (trigger.get().run)(
                game,
                &mut queue,
                target,
                death.clone(),
                trigger.card_effect(),
              )
              .await;
              for fire in queue.into_inner() {
                game
                  .run(PhaseResolveTrigger {
                    id: trigger.instance(),
                    effect: trigger.card_effect(),
                    effect_type: trigger.get().effect_type,
                    fire,
                  })
                  .await;
              }
            }
          }
        })
      },
    }
  ))
});
