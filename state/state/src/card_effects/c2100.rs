use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Death,
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
          if dead_card.id() == Some(my_id) {
            let stored_cards: Vec<Box<StoredCard>> = game
              .reveal_from_card(my_id, |c| {
                c.temporary_modifiers
                  .iter()
                  .filter_map(|m| {
                    if let Modifier::StoredCard(card) = &m.modifier {
                      Some(card.clone())
                    } else {
                      None
                    }
                  })
                  .collect_vec()
              })
              .await;
            queue.add_resolution(move |game| {
              Box::pin(async move {
                for card in stored_cards {
                  if game.player_has_room_for_unit(card.owner) {
                    let id = game.create_card_from_stored_card(*card).await;
                    game.summon(id).await;
                  }
                }
              })
            })
          };
        }
      })
    },
  }
  .into()],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::MaybeTargeted {
      does_target: targets::any_unit,
      mutate: |game, my_id, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            let stored_card: StoredCard = game
              .reveal_from_card(target, |c| StoredCard {
                owner: c.owner,
                card: (*c.base(), c.exact_copy_card_state()),
                attachment: c.attachment.map(|a| (*a.base(), a.exact_copy_card_state())),
              })
              .await;

            if game.dust(target).await {
              game
                .add_modifier(
                  my_id,
                  my_id,
                  Modifier::StoredCard(Box::new(stored_card)),
                  true,
                  0,
                )
                .await;
            }
          }
        })
      },
    }
  ))
});

#[test]
fn test_maiden_in_maiden() -> Result<(), String> {
  run_test(|mut game| {
    game.context.enable_logs(false);
    Box::pin(async move {
      // Create a dummy unit whose modifiers are expected to stay.
      let some_unit = game
        .create_card(0, *crate::tests::UNIT_WITH_NO_KEYWORDS)
        .await;
      game.change_health(some_unit, 99).await;
      game.summon(some_unit).await;
      assert_eq!(
        some_unit
          .instance(&game, None)
          .expect("unit is public")
          .health,
        99,
        "Unit isn't 99hp??"
      );

      let first_maiden = game.create_card(0, BaseCard::C2100).await;
      let second_maiden = game.create_card(0, BaseCard::C2100).await;

      // Grasping Maiden steals first unit :)
      game.move_to_zone(first_maiden, Zone::Casting).await;
      game
        .resolve_card_effect_as_player(first_maiden, Some(some_unit), 0.into())
        .await;
      game.resolve_triggers().await;
      assert!(
        game
          .player_cards(0)
          .zone(some_unit)
          .expect("has zone")
          .is_dust(),
        "Expected unit to be dusted by first maiden"
      );

      // Second Grasping Maiden steals first Grasping Maiden
      game.move_to_zone(second_maiden, Zone::Casting).await;
      game
        .resolve_card_effect_as_player(second_maiden, Some(first_maiden), 0.into())
        .await;
      game.resolve_triggers().await;

      assert!(
        game
          .player_cards(0)
          .zone(first_maiden)
          .expect("has zone")
          .is_dust(),
        "Expected first maiden to be dusted by second maiden"
      );

      assert_eq!(
        game.units::<InstanceID>(0),
        vec![second_maiden],
        "More than my 2nd maiden on the field, wtf?"
      );

      game.kill(second_maiden).await;
      game.resolve_triggers().await;

      assert_eq!(game.units::<InstanceID>(0).len(), 1);
      let (new_first_maiden, new_first_maiden_base) = {
        let unit = game.units::<InstanceID>(0)[0]
          .instance(&game, None)
          .expect("First maiden resurrected");
        (unit.id(), *unit.base())
      };
      assert_eq!(
        new_first_maiden_base,
        BaseCard::C2100,
        "Killing 2nd maiden didn't res first maiden!"
      );

      game.kill(new_first_maiden).await;
      game.resolve_triggers().await;

      assert_eq!(
        game.units::<InstanceID>(0).len(),
        1,
        "After killing new maiden, old maiden should resummon."
      );
      let (orig_unit, orig_unit_base) = {
        let unit = game.units::<InstanceID>(0)[0]
          .instance(&game, None)
          .expect("original unit resurrected");
        (unit.id(), *unit.base())
      };
      assert_eq!(
        orig_unit_base,
        *crate::tests::UNIT_WITH_NO_KEYWORDS,
        "Killing first maiden didn't res original unit!"
      );
      assert_eq!(
        orig_unit
          .instance(&game, None)
          .expect("unit is public")
          .health,
        99,
        "Rezzed original unit but it's missing modifiers!"
      );
    })
  })
}

#[test]
fn test_maiden_silenced_card_doesnt_perma_silence() -> Result<(), String> {
  run_test(|mut game| {
    game.context.enable_logs(false);
    Box::pin(async move {
      // Create a zomboid (has death effect)
      let zomboid = game.create_card(0, BaseCard::C20013).await;
      game.summon(zomboid).await;
      game.resolve_triggers().await;

      // Silence the zomboid
      game.give_spell(zomboid, enchant::SILENCE).await;
      game.resolve_triggers().await;

      let maiden = game.create_card(0, BaseCard::C2100).await;

      // Grasping Maiden steals zomboid
      game.move_to_zone(maiden, Zone::Casting).await;
      game
        .resolve_card_effect_as_player(maiden, Some(zomboid), 0.into())
        .await;
      game.resolve_triggers().await;
      assert!(
        game
          .player_cards(0)
          .zone(zomboid)
          .expect("has zone")
          .is_dust(),
        "Expected zomboid to be dusted by first maiden"
      );

      // Kill maiden
      game.kill(maiden).await;
      game.resolve_triggers().await;

      // zomboid should be resummoned
      assert_eq!(game.units::<InstanceID>(0).len(), 1);
      let (new_zomboid, new_zomboid_base) = {
        let unit = game.units::<InstanceID>(0)[0]
          .instance(&game, None)
          .expect("Zomboid resurrected");
        (unit.id(), *unit.base())
      };
      assert_eq!(
        new_zomboid_base,
        BaseCard::C20013,
        "Killing maiden didn't res zomboid!"
      );
      assert_eq!(
        new_zomboid
          .instance(&game, None)
          .expect("zomboid public")
          .get_effect_types()
          .collect_vec(),
        vec![EffectType::Death],
        "Zomboid doesn't have death effect???"
      );

      let zomboid_attach = new_zomboid
        .instance(&game, None)
        .unwrap()
        .attachment()
        .expect("zomboid has silence");
      assert_eq!(
        *zomboid_attach.instance(&game, None).unwrap().base(),
        enchant::SILENCE
      );
      dbg!(new_zomboid.instance(&game, None).unwrap());

      game.dust(zomboid_attach).await;
      game.resolve_triggers().await;
      dbg!(new_zomboid.instance(&game, None).unwrap());

      let enemy_hero_hp = game.hero(1).health;
      game.kill(new_zomboid).await;
      game.resolve_triggers().await;
      assert_eq!(
        game.hero(1).health,
        enemy_hero_hp - 1,
        "zomboid didn't do death effect"
      );
    })
  })
}
