use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| {
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
          let id = match { dead_card.id() } {
            Some(id) => id,
            None => return,
          };
          let owner = game.owner(my_id);
          if game.owner(id) != owner {
            return;
          }

          // If there's multiple of us on the field, only the leftmost
          // should resolve to prevent duplicating the effect.
          if !game.is_unit_leftmost_field_copy_of_itself(my_id).await {
            return;
          }
          // Trigger death effects
          let card = id.instance(game, None).unwrap();
          if card.is_silenced {
            // Card is silenced, don't do anything
            return;
          }
          let effects = card.effects.clone();

          queue.add_resolution(move |game| {
            Box::pin(async move {
              let mut queue = Queue::default();
              for card_effect in effects {
                if let Effect::Unit { triggers, .. } = card_effect.effect() {
                  for trigger in triggers {
                    if let TriggerVariant::Normal(trigger) = trigger {
                      if trigger.effect_type == EffectType::Death {
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
                          card_effect,
                        )
                        .await;
                      }
                    }
                  }
                }
              }
              for effect in queue.into_inner() {
                effect(game).await;
              }
            })
          });
        }
      })
    },
  }
  .into()],
  on_play: None
});

#[test]
fn card_3074() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let zomboid = game
        .instantiate_and_summon(0, BaseCard::C20013)
        .await
        .unwrap(); // zomboid
      game.instantiate_and_summon(0, BaseCard::C3074).await;
      let hero_hp = game.hero(1).health;
      game.kill(zomboid).await;
      game.resolve_triggers().await;
      // zomboid should have fired twice
      assert_eq!(game.hero(1).health, hero_hp - 2);
    })
  })
}

#[test]
fn card_3074_fate() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let unit = game
        .instantiate_and_summon(0, BaseCard::Dummy)
        .await
        .unwrap();
      game.give_spell(unit, enchant::FATE).await;
      assert!(matches!(
        game.location(unit).location.unwrap().0,
        Zone::Field
      ));
      game.instantiate_and_summon(0, BaseCard::C3074).await;
      game.resolve_triggers().await;

      let hand_size = game.player_cards(0).hand().len();
      game.kill(unit).await;
      game.resolve_triggers().await;
      // fate should have fired twice
      assert_eq!(game.player_cards(0).hand().len(), hand_size + 2);
    })
  })
}

#[test]
fn card_3074_fate_self() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let unit = game
        .instantiate_and_summon(0, BaseCard::C3074)
        .await
        .unwrap();
      game.give_spell(unit, enchant::FATE).await;
      assert!(matches!(
        game.location(unit).location.unwrap().0,
        Zone::Field
      ));
      game.resolve_triggers().await;

      let hand_size = game.player_cards(0).hand().len();
      game.kill(unit).await;
      game.resolve_triggers().await;
      // fate should have fired twice
      assert_eq!(
        game.player_cards(0).hand().len(),
        hand_size + 2,
        "Fate didn't fire twice"
      );
    })
  })
}

#[test]
fn card_1031_cant_fire_silenced_death_triggers() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let zomboid = game
        .instantiate_and_summon(0, BaseCard::C20000)
        .await
        .unwrap(); // zomboid
      game.instantiate_and_summon(0, BaseCard::C3074).await;
      let hero_hp = game.hero(1).health;
      game.give_spell(zomboid, enchant::SILENCE).await; // silence zomboid
      game.resolve_triggers().await;
      game.kill(zomboid).await;
      game.resolve_triggers().await;
      // zomboid not should have fired at all
      assert_eq!(game.hero(1).health, hero_hp);
    })
  })
}
