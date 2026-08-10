use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| Box::pin(async move {
      let owner = game.owner(my_id);

      if let Ok(ResolvedPhaseModifyCard {
        card,
        modifier: Modifier::ModifyHealth(health, _),
        ..
      }) = phase.try_into()
      {
        let last_card_context = game.card_execution_context.last().copied();
        if game
          .reveal_if_any(vec![my_id.into()], move |c| {
            if let Some(last_card_context) = last_card_context {
              c.zone.is_field()
                && c
                  .effects
                  .iter()
                  .find_map(|m| match m {
                    CardEffect::HexedSurit(id) if *id == last_card_context => Some(false),
                    _ => None,
                  })
                  .unwrap_or(true)
            } else {
              c.zone.is_field()
            }
          })
          .await
          && game
            .reveal_from_card(card, move |c| c.zone.is_field() && c.owner == owner)
            .await
          && health > 0
        {
          queue.add_alive_in_play_resolution(my_id, move |game| {
            Box::pin(async move {
              let lowest_hp_in_hand = game
                .lowest_stat_cards_in_hand_indexes(owner, |c, _| c.is_unit(), |c, _| c.health)
                .await;
              let picked = if lowest_hp_in_hand.is_empty() {
                None
              } else if lowest_hp_in_hand.len() == 1 {
                Some(lowest_hp_in_hand[0])
              } else {
                let mut rng = game.context().random().await;
                lowest_hp_in_hand.choose(&mut rng).copied()
              };
              if let Some(picked) = picked {
                let card = game.hand_card(owner, picked);
                game.berf(card, 1, 1).await;
              }
            })
          });
          if let Some(last_card_context) = last_card_context {
            game
              .add_modifier(
                my_id,
                my_id,
                Modifier::GrantEffect(CardEffect::HexedSurit(last_card_context)),
                false,
                0,
              )
              .await;
          }
        }
      }
    }),
  }
  .into()],
  on_play: None
});

attachable_effect!(
  struct HexedSurit(InstanceID);,
  HEXEDSURIT,
  Effect::Unit {
    on_play: None,
    triggers: vec![unit_aura!(
      |game, my_id| Box::pin(async move {
        game.remove_modifiers_from_source(my_id, my_id).await;
      }),
      AuraLayer::IncreaseCost
    )
    .into()]
  }
);

#[test]
fn test_3124_goblet() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let hexed = game.create_card(0, BaseCard::C3124).await;
      game.move_to_zone(hexed, Zone::Hand { public: false }).await;
      game.resolve_triggers().await;
      game.move_to_zone(hexed, Zone::Field).await;
      game.resolve_triggers().await;
      println!("PLAYING hexed");

      let md1 = game.create_card(0, BaseCard::C20058).await;
      game.move_to_zone(md1, Zone::Field).await;
      game.resolve_triggers().await;
      game.give_spell(md1, BaseCard::C20054).await;
      game.resolve_triggers().await;

      let md2 = game.create_card(0, BaseCard::C20058).await;
      game.move_to_zone(md2, Zone::Field).await;
      game.resolve_triggers().await;
      game.give_spell(md2, BaseCard::C20054).await;
      game.resolve_triggers().await;

      let md3 = game.create_card(0, BaseCard::C20058).await;
      game.move_to_zone(md3, Zone::Hand { public: false }).await;
      game.resolve_triggers().await;

      let goblet = game.create_card(0, BaseCard::C68).await;
      game.move_to_zone(goblet, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(goblet, None, 3.into())
        .await;
      game.resolve_triggers().await;

      let power = game.reveal_from_card(md3, |c| c.power).await;
      let power2 = game.reveal_from_card(md1, |c| c.power).await;
      let power3 = game.reveal_from_card(md2, |c| c.power).await;

      println!("{:?}, {:?}", power2, power3);
      assert_eq!(2, i8::from(power));
    })
  })
}

#[test]
fn test_3124_triggers_twice_vapors() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let hexed = game.create_card(0, BaseCard::C3124).await;
      game.move_to_zone(hexed, Zone::Hand { public: false }).await;
      game.resolve_triggers().await;
      game.move_to_zone(hexed, Zone::Field).await;
      game.resolve_triggers().await;
      println!("PLAYING hexed");

      let md1 = game.create_card(0, BaseCard::C2070).await;
      game.move_to_zone(md1, Zone::Field).await;
      game.resolve_triggers().await;
      game.give_spell(md1, BaseCard::C20054).await;
      game.resolve_triggers().await;

      let md2 = game.create_card(0, BaseCard::C2070).await;
      game.move_to_zone(md2, Zone::Field).await;
      game.resolve_triggers().await;
      game.give_spell(md2, BaseCard::C20054).await;
      game.resolve_triggers().await;

      let md3 = game.create_card(0, BaseCard::C20058).await;
      game.move_to_zone(md3, Zone::Hand { public: false }).await;
      game.resolve_triggers().await;

      let chainlasher = game.create_card(1, BaseCard::C1102).await;
      game.move_to_zone(chainlasher, Zone::Field).await;
      game.resolve_triggers().await;

      let power = game.reveal_from_card(md3, |c| c.power).await;
      let power2 = game.reveal_from_card(md1, |c| c.power).await;
      let power3 = game.reveal_from_card(md2, |c| c.power).await;

      println!("{:?}, {:?}", power2, power3);
      assert_eq!(3, i8::from(power));
    })
  })
}

#[test]
fn test_3124_with_armis() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let hexed = game.create_card(0, BaseCard::C3124).await;
      game.move_to_zone(hexed, Zone::Hand { public: false }).await;
      game.resolve_triggers().await;
      game.move_to_zone(hexed, Zone::Field).await;
      game.resolve_triggers().await;
      println!("PLAYING hexed");

      let armis = game.create_card(0, BaseCard::C123).await;
      game.move_to_zone(armis, Zone::Field).await;
      game.resolve_triggers().await;

      let a1 = game.create_card(0, BaseCard::C20001).await;
      game.move_to_zone(a1, Zone::Field).await;
      game.resolve_triggers().await;
      game.give_spell(a1, BaseCard::C20054).await;
      game.resolve_triggers().await;

      let birb = game.create_card(1, BaseCard::Dummy).await;
      game.move_to_zone(birb, Zone::Field).await;
      game.resolve_triggers().await;

      let birb2 = game.create_card(0, BaseCard::Dummy).await;
      game.move_to_zone(birb2, Zone::Hand { public: false }).await;
      game.resolve_triggers().await;

      game.fight(armis, birb).await;
      game.resolve_triggers().await;

      let power = game.reveal_from_card(birb2, |c| c.power).await;

      assert_eq!(1, i8::from(power));
    })
  })
}
