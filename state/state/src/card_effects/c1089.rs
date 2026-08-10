use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![EarlyTrigger {
    effect_type: EffectType::Generic,
    priority: -1,
    is_active: is_on_field_not_silenced,
    run: |game, my_id, phase, _| Box::pin(async move {
      // should still cancel death effects, Jon says!
      if let Ok(PhaseMoveToZone {
        card,
        zone: Zone::Graveyard,
        ..
      }) = phase.clone().try_into()
      {
        if card.id() != Some(my_id) {
          game.log(crate::client::GameAction::EnterPhase(
            crate::phase::PhaseResolveTrigger {
              id: my_id,
              effect: CardEffect::Intrinsic(BaseCard::C1089),
              effect_type: EffectType::Generic,
              fire: Box::new(move |_| Box::pin(async move {})),
            }
            .into(),
          ));
          game.dust(card).await;
          game.log(crate::client::GameAction::ExitPhase(
            crate::phase::ResolvedPhaseResolveTrigger {
              id: my_id,
              effect: CardEffect::Intrinsic(BaseCard::C1089),
              effect_type: EffectType::Generic,
            }
            .into(),
          ));
        }
      }
    }),
  }
  .into()],
  on_play: None
});

#[test]
fn rightous_cancels_death_effects() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      // SUmmon righteous
      let righteous = game
        .instantiate_and_summon(0, BaseCard::C1089)
        .await
        .unwrap();
      let shroom = game
        .instantiate_and_summon(0, BaseCard::C3010)
        .await
        .unwrap();
      game.resolve_triggers().await;

      let righteous_hp = righteous.instance(&game, None).unwrap().health;
      let enemy_hero_hp = game.hero(1).health;
      game.kill(shroom).await;
      game.resolve_triggers().await;

      assert_eq!(
        righteous.instance(&game, None).unwrap().health,
        righteous_hp
      );
      assert_eq!(game.hero(1).health, enemy_hero_hp);
    })
  })
}

#[test]
fn enemy_rightous_cancels_death_effects() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      // SUmmon righteous
      let righteous = game
        .instantiate_and_summon(1, BaseCard::C1089)
        .await
        .unwrap();
      let shroom = game
        .instantiate_and_summon(0, BaseCard::C3010)
        .await
        .unwrap();
      game.resolve_triggers().await;

      let righteous_hp = righteous.instance(&game, None).unwrap().health;
      let enemy_hero_hp = game.hero(1).health;
      game.kill(shroom).await;
      game.resolve_triggers().await;

      assert_eq!(
        righteous.instance(&game, None).unwrap().health,
        righteous_hp
      );
      assert_eq!(game.hero(1).health, enemy_hero_hp);
    })
  })
}

#[test]
fn rightous_works_with_lead() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game
        .instantiate_and_summon(1, BaseCard::C1089)
        .await
        .unwrap();
      let shroom = game
        .instantiate_and_summon(0, BaseCard::C3010)
        .await
        .unwrap();
      game.give_spell(shroom, BaseCard::C20047).await;
      game.resolve_triggers().await;

      game.kill(shroom).await;
      game.resolve_triggers().await;
      let shroom_zone = game.reveal_from_card(shroom, |c| c.zone).await;
      assert!(shroom_zone.is_graveyard());
    })
  })
}

#[test]
fn enemy_rightous_cancels_death_effects_with_simultaneous_death() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let righteous = game
        .instantiate_and_summon(1, BaseCard::C1089)
        .await
        .unwrap();

      let enemy_shroom = game
        .instantiate_and_summon(0, BaseCard::C3010)
        .await
        .unwrap();

      let shroom = game
        .instantiate_and_summon(0, BaseCard::C3010)
        .await
        .unwrap();

      game.resolve_triggers().await;

      let hero_hp = game.hero(0).health;
      let enemy_hero_hp = game.hero(1).health;
      game.kill_many(vec![shroom, enemy_shroom, righteous]).await;
      game.resolve_triggers().await;

      // All the units should be dusted except righteous

      let righteous_zone = game.location(righteous).location.unwrap().0;
      assert!(
        matches!(righteous_zone, Zone::Graveyard),
        "Expected righteous to be in Zone::Graveyard, but it was in zone {:?} ",
        righteous_zone
      );

      let enemy_shroom_zone = game.location(enemy_shroom).location.unwrap().0;
      assert!(
        matches!(enemy_shroom_zone, Zone::Dust { public: true }),
        "Expected enemy_shroom to be in zone Zone::Dust {{ public: true }}, but it was in {:?} ",
        enemy_shroom_zone
      );

      let shroom_zone = game.location(shroom).location.unwrap().0;
      assert!(
        matches!(shroom_zone, Zone::Dust { public: true }),
        "Expected shroom to be in zone Zone::Dust {{ public: true }}, but it was in {:?} ",
        shroom_zone
      );

      // And neither shroom fired
      assert_eq!(game.hero(0).health, hero_hp);
      assert_eq!(game.hero(1).health, enemy_hero_hp);
    })
  })
}
