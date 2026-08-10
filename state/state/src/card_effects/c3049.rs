use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        game.kill(target).await;

        // force death cleanup so targeted unit's death effect fires twice.
        game.cleanup_dead_units().await;
        let dead_units: Vec<InstanceID> = game
          .graveyard::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .filter(|c| {
            c.is_unit()
              && c
                .base()
                .instance()
                .get_effect_types()
                .any(|e| e == EffectType::Death)
          })
          .map_into()
          .collect();

        // Dust units
        game.dust_many(dead_units.iter().map_into().collect()).await;

        // Trigger death effects
        for unit_id in dead_units.into_iter() {
          for effect in unit_id.instance(game, None).unwrap().effects.clone() {
            if let Effect::Unit { triggers, .. } = effect.effect() {
              for trigger in triggers {
                if let TriggerVariant::Normal(trigger) = trigger {
                  let mut queue = Queue::default();
                  (trigger.run)(
                    game,
                    &mut queue,
                    unit_id,
                    ResolvedPhaseMoveToZone {
                      card: unit_id.into(),
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
                        id: unit_id,
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
      })
    },
  }
});

#[test]
fn card_741() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let zomboid = BaseCard::C20013;
      let random_unit = game.create_card(0, BaseCard::Dummy).await;
      game.summon(random_unit).await;
      let z = game.create_card(0, zomboid).await;
      game.move_to_zone(z, Zone::Graveyard).await;

      let id = game.create_card(0, BaseCard::C3049).await;

      let hero_hp = game.hero(1).health;
      game
        .resolve_card_effect_as_player(id, Some(random_unit), 0.into())
        .await;
      game.resolve_triggers().await;
      assert_eq!(game.hero(1).health, hero_hp - 1); // zomboid triggered
    })
  })
}
