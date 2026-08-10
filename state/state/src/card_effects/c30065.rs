use super::effect_helpers::*;

const WRAPPED_GIFT: BaseCard = BaseCard::C30074;
const KRAMPUS: BaseCard = BaseCard::C30065;

// Don't try to understand too hard how Krampus works.
// I just kept modifying this until the tests passed

fn krampus_special_summon<'a>(game: &'a mut LiveGame, krampus: InstanceID) -> Promisify<'a, ()> {
  Box::pin(async move {
    // Hidden rule B:
    // If Krampus tries to resummon himself but they already have 6 units, dust the rightmost.

    let krampus_owner = game.owner(krampus);

    if !game.player_has_room_for_unit(krampus_owner) {
      let rightmost_unit = *game.units::<InstanceID>(krampus_owner).last().unwrap();
      // ULTRA DUST: Krampus can even dust Lead units.
      game
        .run(PhaseMoveToZone {
          card: rightmost_unit.into(),
          zone: Zone::Limbo { public: true },
          player: krampus_owner,
        })
        .await;
      game
        .run(PhaseMoveToZone {
          card: rightmost_unit.into(),
          zone: Zone::Dust { public: true },
          player: krampus_owner,
        })
        .await;
    }

    game.summon(krampus).await;
  })
}

const KRAMPUS_KEEP_STATS: EarlyTrigger = EarlyTrigger {
  effect_type: EffectType::Generic,
  priority: 0,
  is_active: |z, _| z.is_public().unwrap(), // unwrap since kramp is never attached, runs when silenced.
  run: |game, my_id, phase, _| {
    Box::pin(async move {
      if let Ok(PhaseResetCard(card)) = phase.try_into() {
        // if we're about to reset
        if game.reveal_from_card(card, move |c| c.id() == my_id).await {
          let krampus_buff = game.reveal_from_card(card, |c| get_krampus_buff(&c)).await;

          if let Some((buff_size, _)) = krampus_buff {
            game.queue.push(PhaseResolveTrigger {
              id: my_id,
              effect: CardEffect::Intrinsic(KRAMPUS),
              effect_type: EffectType::Generic,
              fire: Box::new(move |game| {
                Box::pin(async move {
                  // Propagate Krampus buff to the post-reset location
                  let existing_krampus_buff =
                    game.reveal_from_card(card, |c| get_krampus_buff(&c)).await;
                  let buff_size =
                    std::cmp::max(buff_size, existing_krampus_buff.map_or(0, |k| k.0));
                  let new_buff = Modifier::KrampusBuff(buff_size);
                  // TODO review Krampus when we bring him back
                  game
                    .add_modifier(my_id, my_id, new_buff.clone(), false, 0)
                    .await;
                  game
                    .modify_card(
                      my_id,
                      vec![
                        Modifier::SetPower(SaturatingU8::from(buff_size + 1)),
                        Modifier::SetHealth(SaturatingU8::from(buff_size + 1)),
                      ],
                    )
                    .await;
                })
              }),
            });
          }
        }
      }
    })
  },
};
serializable_filter!(SerializableFilter::C30065, |c| c.base()
  == &BaseCard::C30065);

const KRAMPUS_DEATH: NormalTrigger = NormalTrigger {
  effect_type: EffectType::Death,
  priority: 0,
  is_active: is_on_field_not_silenced,
  run: |_, queue, my_id, phase, _| {
    Box::pin(async move {
      if let Ok(ResolvedPhaseMoveToZone {
        card: dead_card,
        from: CardLocation {
          location: Some((Zone::Field, _)),
          ..
        },
        to: (_, Zone::Graveyard),
      }) = phase.try_into()
      {
        if dead_card.id() == Some(my_id) {
          queue.add_resolution(move |game| {
            Box::pin(async move {
              let current_player = game.owner(my_id);
              let gift = game.create_card(current_player, WRAPPED_GIFT).await;
              super::c30074::set_to_random_element(game, gift).await;
              game.move_to_zone(gift, Zone::Hand { public: true }).await;
              // game.instantiate_and_summon(enemy(current_player), BaseCard::C30065).await;
              game.add_global_modifier(
                current_player,
                my_id,
                vec![
                  Modifier::ModifyHealth(1, None),
                  Modifier::ModifyPower(1, None),
                ],
                SerializableFilter::C30065,
              );
              game.add_global_modifier(
                enemy(current_player),
                my_id,
                vec![
                  Modifier::ModifyHealth(1, None),
                  Modifier::ModifyPower(1, None),
                ],
                SerializableFilter::C30065,
              );

              game
                .run(PhaseMoveToZone {
                  card: dead_card,
                  zone: Zone::Limbo { public: true },
                  player: enemy(current_player),
                })
                .await;
              krampus_special_summon(game, my_id).await;
            })
          });
        }
      }
    })
  },
};

const KRAMPUS_REMOVE: NormalTrigger = NormalTrigger {
  effect_type: EffectType::Internal,
  priority: 0,
  is_active: is_on_field_not_silenced,
  run: |game, _, my_id, phase, _| {
    Box::pin(async move {
      // Hidden rule A: If krampus is ever removed from the field outside of dying, a new one will spawn.
      if let Ok(ResolvedPhaseMoveToZone {
        card: removed_card,
        from: CardLocation {
          location: Some((Zone::Field, _)),
          player,
        },
        to: (_, dest_zone),
      }) = phase.clone().try_into()
      {
        if !dest_zone.is_graveyard() && !dest_zone.is_field() && removed_card.id() == Some(my_id) {
          // Only summon a new one if there's no kramps on the field
          if kramp_count(game) > 0 {
            return;
          }
          let new_krampus = game.create_card(player, KRAMPUS).await;
          krampus_special_summon(game, new_krampus).await;
        }
      }
    })
  },
};

intrinsic_effect!(Effect::Unit {
  triggers: vec![
    KRAMPUS_KEEP_STATS.into(),
    KRAMPUS_DEATH.into(),
    KRAMPUS_REMOVE.into()
  ],
  on_play: None
});

#[test]
fn test_krampus() -> Result<(), String> {
  run_test(|mut game| {
    game.context.enable_logs(false);
    Box::pin(async move {
      let krampus = game.instantiate_and_summon(0, KRAMPUS).await.unwrap();

      game.resolve_triggers().await;
      // Starts as a 1/1
      assert_eq!(
        {
          let inst = krampus.instance(&*game, None).unwrap();
          (inst.power, inst.health)
        },
        (1.into(), 1.into())
      );

      game.kill(krampus).await;
      game.resolve_triggers().await;

      // Krampus comes back for the other player
      assert!(game.location(krampus).location.unwrap().0.is_field());
      assert_eq!(game.owner(krampus), 1);

      // Revives as a 2/2
      assert_eq!(
        {
          let inst = krampus.instance(&*game, None).unwrap();
          (inst.power, inst.health)
        },
        (2.into(), 2.into())
      );

      game.kill(krampus).await;
      game.resolve_triggers().await;

      // Krampus comes back for the other player
      assert!(game.location(krampus).location.unwrap().0.is_field());
      assert_eq!(game.owner(krampus), 0);
      // Revives again as a 3/3
      assert_eq!(
        {
          let inst = krampus.instance(&*game, None).unwrap();
          (inst.power, inst.health)
        },
        (3.into(), 3.into())
      );

      game.bounce(krampus).await;
      game.resolve_triggers().await;

      // Krampus went to hand
      assert!(
        game
          .reveal_from_card(krampus, |card| card.zone.is_public_hand())
          .await
      );
      // He's still 3/3
      assert_eq!(
        game
          .reveal_from_card(krampus, |card| (card.power, card.health))
          .await,
        (3.into(), 3.into())
      );

      // a new one is summoned
      let new_kramp = game.units::<&CardInstance<SkyWeaver>>(0)[0];
      assert_eq!(*new_kramp.base(), KRAMPUS);

      // assert_eq!((new_kramp.power, new_kramp.health), (1.into(), 1.into()));
      let new_kramp = new_kramp.id();
      assert_eq!(game.owner(new_kramp), 0);

      for _ in 0..6 {
        game.instantiate_and_summon(1, BaseCard::C20000).await;
      }
      game.pass_turn().await;
      game.resolve_triggers().await;
      assert_eq!(game.units::<InstanceID>(1).len(), 6);

      // Now p0 has 6 units, and its p1's turn

      game.kill(new_kramp).await;
      game.resolve_triggers().await;
      // Krampus should have dusted one of those units, and now be on p1's field
      assert_eq!(game.owner(new_kramp), 1);
      assert_eq!(game.units::<InstanceID>(1).len(), 6);
      assert!(game.location(new_kramp).location.unwrap().0.is_field());

      // He can drop below his statted health
      game.damage(new_kramp, 99, new_kramp).await;
      assert_eq!(new_kramp.instance(&*game, None).unwrap().health, 0);

      game.resolve_triggers().await;

      assert_eq!(kramp_count(&game), 1);
      for _ in 0..3 {
        game.instantiate_and_summon(0, KRAMPUS).await;
      }
      let units = game.all_units();
      for unit in units {
        game.bounce(unit).await;
      }
      game.resolve_triggers().await;
      // WHen many kramps get dusted at once, only one new one gets summoned
      assert_eq!(kramp_count(&game), 1);
    })
  })
}

fn get_krampus_buff(card: &CardState) -> Option<(u8, Modifier)> {
  card.temporary_modifiers.iter().find_map(|modifier| {
    if let Modifier::KrampusBuff(size) = modifier.modifier {
      Some((size, modifier.modifier.clone()))
    } else {
      None
    }
  })
}

fn kramp_count(game: &LiveGame) -> usize {
  game
    .all_units::<&CardInstance<SkyWeaver>>()
    .into_iter()
    .filter(|unit| *unit.base() == KRAMPUS)
    .count()
}
