use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let unit = game
      .graveyard::<&CardInstance<SkyWeaver>>(owner)
      .iter()
      .find(|c| {
        c.get_effect_types().any(|e| e == EffectType::Death) && c.base() != &BaseCard::C3164
      })
      .map(|c| Card::from(*c));
    if let Some(unit) = unit {
      // Trigger death effects
      let (id, effects) = game
        .reveal_from_card(unit, |c| (c.id(), c.effects.clone()))
        .await;
      for effect in effects {
        if let Effect::Unit { triggers, .. } = effect.effect() {
          for trigger in triggers {
            let mut queue = Queue::default();
            if let TriggerVariant::Normal(trigger) = trigger {
              if trigger.effect_type == EffectType::Death {
                game.reveal_card(unit).await;
                (trigger.run)(
                  game,
                  &mut queue,
                  id,
                  ResolvedPhaseMoveToZone {
                    card: id.into(),
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
                      id,
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
  }))
  .into()],
  on_play: None
});
