use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Glory,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, _queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseGlory(id, _)) = phase.try_into() {
          if id == my_id {
            let owner = game.owner(id);
            let ally_units: Vec<InstanceID> = game.units(owner);

            for unit_id in ally_units {
              let death: ResolvedPhase = ResolvedPhaseMoveToZone {
                card: unit_id.into(),
                from: CardLocation {
                  player: owner,
                  location: Some((Zone::Field, None)),
                },
                to: (owner, Zone::Graveyard),
              }
              .into();
              let triggers = game.get_active_public_triggers().2;
              for trigger in triggers.into_iter().filter(|trigger| {
                trigger.instance() == unit_id && trigger.get().effect_type == EffectType::Death
              }) {
                let mut queue = Queue::default();

                (trigger.get().run)(
                  game,
                  &mut queue,
                  unit_id,
                  death.clone(),
                  trigger.card_effect(),
                )
                .await;
                for fire in queue.into_inner() {
                  game
                    .run(PhaseResolveTrigger {
                      id: unit_id,
                      effect: trigger.card_effect(),
                      effect_type: trigger.get().effect_type,
                      fire,
                    })
                    .await;
                }
              }
            }
          }
        }
      })
    },
  }
  .into()],
  on_play: None
});
#[test]
fn card_379() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      game
        .instantiate_and_summon(0, BaseCard::C20013)
        .await
        .unwrap(); // Zomboid
      let king = game
        .instantiate_and_summon(0, BaseCard::C3024)
        .await
        .unwrap();
      let hero = game.hero_id(1);

      let hero_hp = game.hero(1).health;
      let king_pow = game.reveal_from_card(king, |c| c.power).await;
      game
        .run(PhaseAttack {
          attacker: king,
          defender: hero,
        })
        .await;
      game.resolve_triggers().await;
      // zomboid should have fired here
      assert_eq!(game.hero(1).health, hero_hp - 1 - king_pow);
    })
  })
}
