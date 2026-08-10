use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    if game
      .reveal_from_card(my_id, |c| c.zone.is_graveyard())
      .await
    {
      game.move_to_zone(my_id, Zone::Deck).await;
      game.reset_card(my_id).await;
    }

    let existing_shroom_size = game
      .hero(game.owner(my_id))
      .effects
      .iter()
      .find_map(|m| match m {
        CardEffect::Mechshroom(id, amount) if *id == my_id => Some(*amount),
        _ => None,
      })
      .unwrap_or(0);
    let hero = game.hero_id(game.owner(my_id));

    game.remove_modifiers_from_source(hero, my_id).await;
    game
      .add_modifier(
        hero,
        my_id,
        Modifier::GrantEffect(CardEffect::Mechshroom(my_id, existing_shroom_size + 1)),
        false,
        0,
      )
      .await;
    apply_mechshroom_effect(game, my_id).await;
  }))
  .into()],
  on_play: None
});

//normal trig, whenever phase reset card finish, give it buff w modify card
attachable_effect!(
  struct Mechshroom(InstanceID, u8);,
  MECHSHROOM,
  Effect::Unit {
    on_play: None,
    triggers: vec![NormalTrigger {
      effect_type: EffectType::Internal,
      priority: 0,
      is_active: |_, _| true,
      run: |game, _, _, phase, card_effect| Box::pin(async move {
        if let (Ok(ResolvedPhaseResetCard(card)), CardEffect::Mechshroom(id, _)) =
          (phase.try_into(), card_effect)
        {
          let is_ms = game.reveal_from_card(card, move |c| c.id() == id).await;
          if is_ms {
            apply_mechshroom_effect(game, id).await;
          }
        }
      })
    }
    .into()]
  }
);

async fn apply_mechshroom_effect(game: &mut LiveGame<'_>, my_id: InstanceID) {
  let existing_shroom_size = game
    .hero(game.owner(my_id))
    .effects
    .iter()
    .find_map(|m| match m {
      CardEffect::Mechshroom(id, amount) if *id == my_id => Some(*amount),
      _ => None,
    })
    .unwrap_or(0);
  let existing_shroom_size_enemy = game
    .hero(enemy(game.owner(my_id)))
    .effects
    .iter()
    .find_map(|m| match m {
      CardEffect::Mechshroom(id, amount) if *id == my_id => Some(*amount),
      _ => None,
    })
    .unwrap_or(0);

  let old_size: Option<i8> = game
    .reveal_from_card(my_id, |c| {
      c.temporary_modifiers.iter().find_map(|m| {
        if let Modifier::MechshroomSize(size) = m.modifier {
          Some(size.into())
        } else {
          None
        }
      })
    })
    .await;
  let new_size = SaturatingU8::from(existing_shroom_size + existing_shroom_size_enemy);
  let size_increase = i8::from(new_size) - old_size.unwrap_or(0);
  game.remove_modifiers_from_source(my_id, my_id).await;
  game
    .modify_card(
      my_id,
      vec![
        Modifier::ModifyHealth(size_increase, None),
        Modifier::ModifyPower(size_increase, None),
      ],
    )
    .await;

  game
    .add_modifier(my_id, my_id, Modifier::MechshroomSize(new_size), false, 0)
    .await;
}

#[test]
fn test_mechshroom() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let attacker = game
        .instantiate_and_summon(0, BaseCard::Dummy)
        .await
        .unwrap();
      let base_health = BaseCard::C3107.instance().health;
      let base_power = BaseCard::C3107.instance().power;
      game
        .modify_card_single(attacker, Modifier::SetPower(5.into()))
        .await;
      let shroom = game
        .instantiate_and_summon(0, BaseCard::C3107)
        .await
        .unwrap();
      game.resolve_triggers().await;
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power, base_health)
      );

      eprintln!("Killing shroom...");
      game.kill(shroom).await;
      game.resolve_triggers().await;

      assert!(game.reveal_from_card(shroom, |c| c.zone.is_deck()).await);
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power + 1, base_health + 1)
      );
      game.bounce(shroom).await;
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power + 1, base_health + 1)
      );
      // Try moving to oppt's field
      game
        .run(PhaseMoveToZone {
          card: shroom.into(),
          player: 1,
          zone: Zone::Field,
        })
        .await;
      game.resolve_triggers().await;
      eprintln!(
        "Shroom moved to opt field, now it's {:?}",
        game
          .reveal_from_card(shroom, |c| (
            c.power,
            c.health,
            c.temporary_modifiers.iter().find_map(|m| {
              if let Modifier::MechshroomSize(size) = m.modifier {
                Some(size)
              } else {
                None
              }
            })
          ))
          .await
      );

      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power + 1, base_health + 1)
      );
      game.fight(attacker, shroom).await; //mech shroom dies here
      game.resolve_triggers().await;

      assert!(game.reveal_from_card(shroom, |c| c.zone.is_deck()).await);
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power + 2, base_health + 2)
      );

      game.summon(shroom).await;
      game.resolve_triggers().await;
      eprintln!("Killing shroom...");
      game.kill(shroom).await;
      game.resolve_triggers().await;

      assert!(game.reveal_from_card(shroom, |c| c.zone.is_deck()).await);
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power + 3, base_health + 3)
      );
    })
  })
}

#[test]
fn test_mechshroom_gravekin() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let base_health = BaseCard::C3107.instance().health;
      let base_power = BaseCard::C3107.instance().power;
      // summon gravekin...
      game.instantiate_and_summon(0, BaseCard::C3074).await;
      let shroom = game
        .instantiate_and_summon(0, BaseCard::C3107)
        .await
        .unwrap();
      game.resolve_triggers().await;
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power, base_health)
      );

      eprintln!("Killing shroom...");
      game.kill(shroom).await;
      game.resolve_triggers().await;

      assert!(game.reveal_from_card(shroom, |c| c.zone.is_deck()).await);
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power + 2, base_health + 2)
      );
    })
  })
}

#[test]
fn test_mechshroom_molten_heart() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let base_health = BaseCard::C3107.instance().health;
      let base_power = BaseCard::C3107.instance().power;
      let shroom = game
        .instantiate_and_summon(0, BaseCard::C3107)
        .await
        .unwrap();
      game.resolve_triggers().await;
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power, base_health)
      );

      let molten_heart = game.create_card(0, BaseCard::C3078).await;
      game.move_to_zone(molten_heart, Zone::Casting).await;
      game
        .resolve_card_effect_as_player(molten_heart, Some(shroom), 2.into())
        .await;
      game.resolve_triggers().await;

      assert!(game.reveal_from_card(shroom, |c| c.zone.is_field()).await);
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power + 2, base_health + 2)
      );
    })
  })
}
#[test]
fn test_mechshroom_rebirth() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let base_health = BaseCard::C3107.instance().health;
      let base_power = BaseCard::C3107.instance().power;
      let shroom = game
        .instantiate_and_summon(0, BaseCard::C3107)
        .await
        .unwrap();
      game.resolve_triggers().await;
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power, base_health)
      );

      let rebirth = game.create_card(0, BaseCard::C3127).await;
      game.move_to_zone(rebirth, Zone::Casting).await;
      game
        .resolve_card_effect_as_player(rebirth, Some(shroom), 2.into())
        .await;
      game.resolve_triggers().await;

      assert!(game.reveal_from_card(shroom, |c| c.zone.is_field()).await);
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power + 1, base_health + 1)
      );

      let rebirth = game.create_card(0, BaseCard::C3127).await;
      game.move_to_zone(rebirth, Zone::Casting).await;
      game
        .resolve_card_effect_as_player(rebirth, Some(shroom), 2.into())
        .await;
      game.resolve_triggers().await;

      assert!(game.reveal_from_card(shroom, |c| c.zone.is_field()).await);
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power + 2, base_health + 2)
      );
    })
  })
}
#[test]
fn test_mechshroom_grave_to_field_yoink() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let base_health = BaseCard::C3107.instance().health;
      let base_power = BaseCard::C3107.instance().power;
      let shroom = game
        .instantiate_and_summon(0, BaseCard::C3107)
        .await
        .unwrap();
      game.resolve_triggers().await;
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power, base_health)
      );
      game.move_to_zone(shroom, Zone::Graveyard).await; //mfd

      assert!(
        game
          .reveal_from_card(shroom, |c| c.marked_for_death.is_some())
          .await
      );
      game.move_to_zone(shroom, Zone::Field).await;
      game.resolve_triggers().await;
      assert!(game.reveal_from_card(shroom, |c| c.zone.is_field()).await);
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power + 1, base_health + 1)
      );
      game.move_to_zone(shroom, Zone::Graveyard).await;
      game.move_to_zone(shroom, Zone::Field).await;
      game.resolve_triggers().await;
      assert!(game.reveal_from_card(shroom, |c| c.zone.is_field()).await);
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power + 2, base_health + 2)
      );
    })
  })
}

#[test]
fn test_mechshroom_casket() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let base_health = BaseCard::C3107.instance().health;
      let base_power = BaseCard::C3107.instance().power;
      assert_eq!(game.deck_cards(0).len(), 0);
      let casket = game
        .instantiate_and_summon(0, BaseCard::C3095)
        .await
        .unwrap();
      let shroom = game.create_card(0, BaseCard::C3107).await;
      game.move_to_zone(shroom, Zone::Deck).await;
      game.resolve_triggers().await;
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power, base_health)
      );

      game.kill(casket).await;
      game.resolve_triggers().await;

      assert!(game.reveal_from_card(shroom, |c| c.zone.is_hand()).await);
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power + 1, base_health + 1)
      );

      game.move_to_zone(casket, Zone::Field).await;
      game.resolve_triggers().await;
      game.kill(casket).await;
      game.resolve_triggers().await;

      assert!(game.reveal_from_card(shroom, |c| c.zone.is_hand()).await);
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power + 1, base_health + 1)
      );

      game.move_to_zone(shroom, Zone::Field).await;
      game.resolve_triggers().await;
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power + 1, base_health + 1)
      );
      game.move_to_zone(shroom, Zone::Hand { public: true }).await;
      game.resolve_triggers().await;
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power + 1, base_health + 1)
      );
    })
  })
}

#[test]
fn test_mechshroom_gravekin_casket() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let base_health = BaseCard::C3107.instance().health;
      let base_power = BaseCard::C3107.instance().power;
      assert_eq!(game.deck_cards(0).len(), 0);
      // summon gravekin
      game.instantiate_and_summon(0, BaseCard::C3074).await;
      let casket = game
        .instantiate_and_summon(0, BaseCard::C3095)
        .await
        .unwrap();
      let shroom = game.create_card(0, BaseCard::C3107).await;
      game.move_to_zone(shroom, Zone::Deck).await;
      game.resolve_triggers().await;
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power, base_health)
      );

      eprintln!("kill casket:");
      game.kill(casket).await;
      game.resolve_triggers().await;

      assert!(game.reveal_from_card(shroom, |c| c.zone.is_hand()).await);
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power + 1, base_health + 1)
      );

      eprintln!("summon shroom:");
      game.move_to_zone(shroom, Zone::Field).await;
      game.resolve_triggers().await;
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power + 1, base_health + 1)
      );
      game.kill(shroom).await;
      game.resolve_triggers().await;
      assert_eq!(
        game.reveal_from_card(shroom, |c| (c.power, c.health)).await,
        (base_power + 3, base_health + 3)
      );
    })
  })
}
