use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let top_dead_unit = game
          .graveyard::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .find(|c| c.is_unit())
          .map(|c| c.id());
        if let Some(target) = top_dead_unit {
          game.bounce(target).await;

          for effect in target.instance(game, None).unwrap().effects.clone() {
            if let Effect::Unit { triggers, .. } = effect.effect() {
              for trigger in triggers {
                let mut queue = Queue::default();
                if let TriggerVariant::Normal(trigger) = trigger {
                  if trigger.effect_type == EffectType::Death {
                    (trigger.run)(
                      game,
                      &mut queue,
                      target,
                      ResolvedPhaseMoveToZone {
                        card: target.into(),
                        from: CardLocation {
                          player: owner,
                          location: Some((Zone::Field, None)),
                        },
                        to: (owner, Zone::Graveyard),
                      }
                      .into(),
                      effect,
                    )
                    .await;
                    for fire in queue.into_inner() {
                      game
                        .run(PhaseResolveTrigger {
                          id: target,
                          effect,
                          effect_type: trigger.effect_type,
                          fire,
                        })
                        .await;
                    }
                  }
                }
              }
            }
          }
        }
      })
    },
  }
});
