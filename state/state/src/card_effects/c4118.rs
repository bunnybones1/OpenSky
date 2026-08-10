use super::effect_helpers::*;

serializable_filter!(SerializableFilter::C4118, |c| c.cost == 1 && c.is_unit());

// Cards get buff one time when entering field
intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        game.add_global_modifier(
          owner,
          my_id,
          vec![
            Modifier::ModifyHealth(1, None),
            Modifier::ModifyPower(1, None),
          ],
          SerializableFilter::C4118,
        );
        game.instantiate_and_summon(owner, BaseCard::C20058).await;
        game.instantiate_and_summon(owner, BaseCard::C20058).await;
      })
    },
  }
});

#[test]
fn test_overdrive() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let md2 = game.create_card(0, BaseCard::C20058).await;
      let md3 = game.create_card(0, BaseCard::C20058).await;
      let md4 = game.create_card(0, BaseCard::C20058).await;

      game.move_to_zone(md2, Zone::Deck).await;
      game.move_to_zone(md3, Zone::Hand { public: false }).await;
      game.move_to_zone(md4, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let overdrive = game.create_card(0, BaseCard::C4118).await;
      game
        .move_to_zone(overdrive, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(overdrive, Zone::Casting).await;
      game.resolve_triggers().await;
      println!("PLAYING OVERDRIVE");
      game
        .resolve_card_effect_as_player(overdrive, None, 2.into())
        .await;
      game.move_to_zone(overdrive, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let md1 = game.create_card(0, BaseCard::C20058).await;

      game.resolve_triggers().await;
      println!("PLAYING MD");
      game
        .resolve_card_effect_as_player(md1, None, 1.into())
        .await;
      game.resolve_triggers().await;

      let swarm = game.create_card(0, BaseCard::C4113).await;
      game.move_to_zone(swarm, Zone::Hand { public: false }).await;
      game.resolve_triggers().await;
      game.move_to_zone(swarm, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(swarm, None, 3.into())
        .await;
      game.move_to_zone(swarm, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let units_health: Vec<_> = game
        .player_cards(0)
        .field()
        .iter()
        .filter(|c| *c.instance(&game, None).unwrap().base() != BaseCard::Hero)
        .map(|c| {
          println!("HEALTH: {:?}", c.instance(&game, None).unwrap().base());
          c.instance(&game, None).unwrap().health
        })
        .collect();

      println!("LEN: {:?}", units_health.len());

      game.resolve_triggers().await;
      let md1_health = game.reveal_from_card(md1, |c| c.health).await;
      let md2_health = game.reveal_from_card(md2, |c| c.health).await;
      let md3_health = game.reveal_from_card(md3, |c| c.health).await;
      let md4_health = game.reveal_from_card(md4, |c| c.health).await;
      assert_eq!(md1_health, 2);
      assert_eq!(md2_health, 2);
      assert_eq!(md3_health, 2);
      assert_eq!(md4_health, 1);
      for u in units_health {
        println!("{:?}", u);
        assert_eq!(u, 2);
      }
    })
  })
}

#[test]
fn test_overdrive_unit_steal() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let overdrive = game.create_card(0, BaseCard::C4118).await;
      game
        .move_to_zone(overdrive, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(overdrive, Zone::Casting).await;
      game.resolve_triggers().await;
      println!("PLAYING OVERDRIVE");
      game
        .resolve_card_effect_as_player(overdrive, None, 2.into())
        .await;
      game.move_to_zone(overdrive, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let md1 = game.create_card(0, BaseCard::C20058).await;

      game.resolve_triggers().await;
      println!("PLAYING MD");
      game
        .resolve_card_effect_as_player(md1, None, 1.into())
        .await;
      game.resolve_triggers().await;

      let md1_health = game.reveal_from_card(md1, |c| c.health).await;
      assert_eq!(md1_health, 2);
      println!("STEALING MD");
      game
        .run(PhaseMoveToZone {
          card: md1.into(),
          player: 1,
          zone: Zone::Field,
        })
        .await;
      game.resolve_triggers().await;

      let md1_health = game.reveal_from_card(md1, |c| c.health).await;
      assert_eq!(md1_health, 2);
    })
  })
}
#[test]
fn test_overdrive_unit_change_cost() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let overdrive = game.create_card(0, BaseCard::C4118).await;
      game
        .move_to_zone(overdrive, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(overdrive, Zone::Casting).await;
      game.resolve_triggers().await;
      println!("PLAYING OVERDRIVE");
      game
        .resolve_card_effect_as_player(overdrive, None, 2.into())
        .await;
      game.move_to_zone(overdrive, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let birb = game.create_card(0, BaseCard::C2070).await;
      game.move_to_zone(birb, Zone::Hand { public: false }).await;
      game.resolve_triggers().await;

      game
        .modify_card_single(birb, Modifier::SetCost(1.into()))
        .await;
      game.resolve_triggers().await;
      let birb_power = game.reveal_from_card(birb, |c| c.power).await;

      assert_eq!(birb_power, 2);
    })
  })
}

#[test]
fn test_overdrive_unit_hand_to_field() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let md1 = game.create_card(0, BaseCard::C20058).await;
      game.move_to_zone(md1, Zone::Deck).await;
      game.resolve_triggers().await;

      let overdrive = game.create_card(0, BaseCard::C4118).await;
      game
        .move_to_zone(overdrive, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(overdrive, Zone::Casting).await;
      game.resolve_triggers().await;
      println!("PLAYING OVERDRIVE");
      game
        .resolve_card_effect_as_player(overdrive, None, 2.into())
        .await;
      game.move_to_zone(overdrive, Zone::Graveyard).await;
      game.resolve_triggers().await;
      println!("MOVING MD1 -> HAND");

      game.move_to_zone(md1, Zone::Hand { public: false }).await;
      game
        .resolve_card_effect_as_player(md1, None, 1.into())
        .await;
      game.resolve_triggers().await;

      let md1_health = game.reveal_from_card(md1, |c| c.health).await;
      assert_eq!(md1_health, 2);
      println!("MOVING MD1 -> HAND");
      game
        .run(PhaseMoveToZone {
          card: md1.into(),
          player: 1,
          zone: Zone::Field,
        })
        .await;
      game.resolve_triggers().await;

      let md1_health = game.reveal_from_card(md1, |c| c.health).await;
      assert_eq!(md1_health, 2);
    })
  })
}

#[test]
fn test_overdrive_twice_different_copy() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let md3 = game.create_card(0, BaseCard::C20058).await;
      game.move_to_zone(md3, Zone::Deck).await;
      game.resolve_triggers().await;

      let overdrive_1 = game.create_card(0, BaseCard::C4118).await;
      game
        .move_to_zone(overdrive_1, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(overdrive_1, Zone::Casting).await;
      game.resolve_triggers().await;
      println!("PLAYING overdrive_1");
      game
        .resolve_card_effect_as_player(overdrive_1, None, 2.into())
        .await;
      game.move_to_zone(overdrive_1, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let md1 = game.create_card(0, BaseCard::C20058).await;
      game.resolve_triggers().await;

      println!("PLAYING MD");
      game
        .resolve_card_effect_as_player(md1, None, 1.into())
        .await;
      game.resolve_triggers().await;

      let md1_health = game.reveal_from_card(md1, |c| c.health).await;
      assert_eq!(md1_health, 2);

      let overdrive_2 = game.create_card(0, BaseCard::C4118).await;
      game
        .move_to_zone(overdrive_2, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(overdrive_2, Zone::Casting).await;
      game.resolve_triggers().await;
      println!("PLAYING overdrive_2");
      game
        .resolve_card_effect_as_player(overdrive_2, None, 2.into())
        .await;
      game.move_to_zone(overdrive_2, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let md1_health = game.reveal_from_card(md1, |c| c.health).await;
      assert_eq!(md1_health, 3);

      let md2 = game.create_card(0, BaseCard::C20058).await;

      game.resolve_triggers().await;
      println!("PLAYING MD 2");
      game
        .resolve_card_effect_as_player(md2, None, 1.into())
        .await;
      game.resolve_triggers().await;

      let md2_health = game.reveal_from_card(md2, |c| c.health).await;
      assert_eq!(md2_health, 3);

      println!("MOVING MD1");

      game
        .run(PhaseMoveToZone {
          card: md1.into(),
          player: 1,
          zone: Zone::Field,
        })
        .await;
      game.resolve_triggers().await;

      let md1_health = game.reveal_from_card(md1, |c| c.health).await;
      assert_eq!(md1_health, 3);

      println!("DRAWING MD3");
      game.move_to_zone(md3, Zone::Hand { public: false }).await;
      game.resolve_triggers().await;

      let md3_health = game.reveal_from_card(md3, |c| c.health).await;
      assert_eq!(md3_health, 3);
    })
  })
}

#[test]
fn test_overdrive_twice_same_copy() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let overdrive_1 = game.create_card(0, BaseCard::C4118).await;
      game
        .move_to_zone(overdrive_1, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(overdrive_1, Zone::Casting).await;
      game.resolve_triggers().await;
      println!("PLAYING overdrive_1");
      game
        .resolve_card_effect_as_player(overdrive_1, None, 2.into())
        .await;
      game.move_to_zone(overdrive_1, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let md1 = game.create_card(0, BaseCard::C20058).await;

      game.resolve_triggers().await;
      println!("PLAYING MD");
      game
        .resolve_card_effect_as_player(md1, None, 1.into())
        .await;
      game.resolve_triggers().await;

      let md1_health = game.reveal_from_card(md1, |c| c.health).await;
      assert_eq!(md1_health, 2);

      game
        .move_to_zone(overdrive_1, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(overdrive_1, Zone::Casting).await;
      game.resolve_triggers().await;
      println!("PLAYING overdrive_1 AGAIN");
      game
        .resolve_card_effect_as_player(overdrive_1, None, 2.into())
        .await;
      game.move_to_zone(overdrive_1, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let md1_health = game.reveal_from_card(md1, |c| c.health).await;
      assert_eq!(md1_health, 3);

      let md2 = game.create_card(0, BaseCard::C20058).await;

      game.resolve_triggers().await;
      println!("PLAYING MD 2");
      game
        .resolve_card_effect_as_player(md2, None, 1.into())
        .await;
      game.resolve_triggers().await;

      let md2_health = game.reveal_from_card(md2, |c| c.health).await;
      assert_eq!(md2_health, 3);

      println!("MOVING MD1");

      game
        .run(PhaseMoveToZone {
          card: md1.into(),
          player: 1,
          zone: Zone::Field,
        })
        .await;
      game.resolve_triggers().await;

      let md1_health = game.reveal_from_card(md1, |c| c.health).await;
      assert_eq!(md1_health, 3);
    })
  })
}

#[test]
fn test_overdrive_mind_control_setting_cost() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let overdrive = game.create_card(0, BaseCard::C4118).await;
      game
        .move_to_zone(overdrive, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(overdrive, Zone::Casting).await;
      game.resolve_triggers().await;
      println!("PLAYING OVERDRIVE");
      game
        .resolve_card_effect_as_player(overdrive, None, 2.into())
        .await;
      game.move_to_zone(overdrive, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let md1 = game.create_card(1, BaseCard::C20058).await;
      game.move_to_zone(md1, Zone::Field).await;
      game.resolve_triggers().await;

      let mind_control = game.create_card(0, BaseCard::C3031).await;
      game
        .move_to_zone(mind_control, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(mind_control, Zone::Casting).await;
      game.resolve_triggers().await;
      println!("PLAYING mind_control");
      game
        .resolve_card_effect_as_player(mind_control, md1.into(), 2.into())
        .await;
      game.move_to_zone(mind_control, Zone::Graveyard).await;
      game.resolve_triggers().await;
      let md1_health = game.reveal_from_card(md1, |c| c.health).await;
      assert_eq!(md1_health, 2);
    })
  })
}
#[test]
fn test_overdrive_units_can_die() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let overdrive = game.create_card(0, BaseCard::C4118).await;
      game
        .move_to_zone(overdrive, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(overdrive, Zone::Casting).await;
      game.resolve_triggers().await;
      println!("PLAYING OVERDRIVE");
      game
        .resolve_card_effect_as_player(overdrive, None, 2.into())
        .await;
      game.move_to_zone(overdrive, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let pharonis = game.create_card(1, BaseCard::C3100).await;
      game.move_to_zone(pharonis, Zone::Field).await;
      game.resolve_triggers().await;

      let md1 = game.create_card(0, BaseCard::C20058).await;
      game.move_to_zone(md1, Zone::Field).await;
      game.resolve_triggers().await;
      println!("ATTACKING");
      game.fight(md1, pharonis).await;
      game.resolve_triggers().await;
      let md1_zone = game.reveal_from_card(md1, |c| c.zone).await;
      println!("MY ZONE IS: {:?}", md1_zone);
      assert!(md1_zone.is_graveyard());
    })
  })
}

#[test]
fn test_overdrive_cost_change_keeps_buff() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let overdrive = game.create_card(0, BaseCard::C4118).await;
      game
        .move_to_zone(overdrive, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(overdrive, Zone::Casting).await;
      game.resolve_triggers().await;
      println!("PLAYING OVERDRIVE");
      game
        .resolve_card_effect_as_player(overdrive, None, 2.into())
        .await;
      game.move_to_zone(overdrive, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let md1 = game.create_card(0, BaseCard::C20058).await;
      game.move_to_zone(md1, Zone::Hand { public: false }).await;
      game.resolve_triggers().await;

      let md1_health = game.reveal_from_card(md1, |c| c.health).await;
      assert_eq!(md1_health, 2);

      game
        .modify_card_single(md1, Modifier::SetCost(2.into()))
        .await;
      game.resolve_triggers().await;
      assert_eq!(md1_health, 2);
    })
  })
}
