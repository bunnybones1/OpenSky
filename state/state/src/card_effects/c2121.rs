use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![PhaseModifier {
    effect_type: EffectType::Continuous,
    priority: -2,
    is_active: is_on_field_not_silenced,
    run: |game, my_id, phase, _| {
      Box::pin(async move {
        match <&PhaseDamage>::try_from(phase) {
          Ok(damage)
          // if my unit is doing combat dmg
            if game.owner(damage.source) == game.owner(my_id)
              && (matches!(damage.kind, DamageKind::Combat { .. }))
              && game.reveal_from_card(damage.source, |c| c.is_unit()).await =>
          {
            //if enemy unit is attacking me, use cached health value
            let health_before_enemy_hit =
              game
                .hero(game.owner(my_id))
                .effects
                .iter()
                .find_map(|m| match m {
                  CardEffect::ScarredServitor(h)
                    if matches!(
                      damage.kind,
                      DamageKind::Combat {
                        is_retaliation: true
                      }
                    ) =>
                  {
                    Some(*h)
                  }
                  _ => None,
                });
            let health = if let Some(h) = health_before_enemy_hit {
              h.into()
            } else {
              damage.source.instance(game, None).unwrap().health
            };
            let hero = game.hero_id(game.owner(my_id));
            game.remove_modifiers_from_source(hero, my_id).await;
            Some(
              PhaseDamage {
                amount: health,
                ..*damage
              }
              .into(),
            )
          }
          Ok(damage)
          //if enemy unit or hero doing combat dmg to my unit
            if game.owner(damage.source) == enemy(game.owner(my_id))
              && (matches!(damage.kind, DamageKind::Combat { is_retaliation: false }))
              && game
                .reveal_from_card(damage.source, |c| c.is_unit() || c.is_hero())
                .await
              && game.reveal_from_card(damage.target, |c| c.is_unit()).await =>
          {
            let hero = game.hero_id(game.owner(damage.target));
            let health = damage.target.instance(game, None).unwrap().health;
            //cache health for next dmg phase. Attacker always goes first
            game
              .add_modifier(
                hero,
                my_id,
                Modifier::GrantEffect(CardEffect::ScarredServitor(health.into())),
                false,
                0,
              )
              .await;
            Some(PhaseDamage { ..*damage }.into())
          }
          _ => None,
        }
      })
    },
  }
  .into()],
  on_play: None
});

attachable_effect!(
  struct ScarredServitor(u8);,
  SCARREDSERVITOR,
  Effect::Unit {
    on_play: None,
    triggers: vec![]
  }
);

// Servitor has four important scenarios:
// You attack on your turn, enemy attacks on your turn,
// you attack on enemy turn, enemy attacks on enemy turn
#[test]
fn test_scarred_servitor_uses_health() -> Result<(), String> {
  // This tests: you attack on your turn, also tests multiple attacks during a turn
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let servitor = game.create_card(0, BaseCard::C2121).await;
      game.move_to_zone(servitor, Zone::Field).await;
      game.resolve_triggers().await;

      let enemy_dummy = game.create_card(1, BaseCard::Dummy).await;
      let my_dummy = game.create_card(0, BaseCard::Dummy).await;
      // set to 13 health
      game
        .modify_card_single(enemy_dummy, Modifier::SetHealth(13.into()))
        .await;
      game
        .modify_card_single(my_dummy, Modifier::SetHealth(7.into()))
        .await;
      game.move_to_zone(enemy_dummy, Zone::Field).await;
      game.move_to_zone(my_dummy, Zone::Field).await;
      game.resolve_triggers().await;

      let dummy_health = game.reveal_from_card(enemy_dummy, |c| c.health).await;
      let dummy_power = game.reveal_from_card(enemy_dummy, |c| c.power).await;
      game.berf(enemy_dummy, 3, 0).await;
      assert_eq!(dummy_health, 13);
      assert_eq!(dummy_power, 0);
      game.resolve_triggers().await;

      // hit for 6
      game.fight(servitor, enemy_dummy).await;
      game.resolve_triggers().await;

      let enemy_dummy_health = game.reveal_from_card(enemy_dummy, |c| c.health).await;
      let my_dummy_health = game.reveal_from_card(my_dummy, |c| c.health).await;
      assert_eq!(enemy_dummy_health, 6);
      assert_eq!(my_dummy_health, 7);
      game.fight(my_dummy, enemy_dummy).await;
      game.resolve_triggers().await;
      // hit for 7
      let dead = game
        .reveal_from_card(enemy_dummy, |c| c.zone.is_graveyard())
        .await;
      assert!(dead);
    })
  })
}

#[test]
fn test_scarred_servitor_works_with_armor() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let servitor = game.create_card(1, BaseCard::C2121).await;
      game.move_to_zone(servitor, Zone::Field).await;
      game.resolve_triggers().await;

      let dummy = game.create_card(0, BaseCard::Dummy).await;
      game.move_to_zone(dummy, Zone::Field).await;
      game
        .modify_card_single(dummy, Modifier::GrantTrait(Trait::Armor))
        .await;
      game.resolve_triggers().await;
      let dummy_health = game.reveal_from_card(dummy, |c| c.health).await;
      let dummy_power = game.reveal_from_card(dummy, |c| c.power).await;
      assert_eq!(dummy_health, 1);
      assert_eq!(dummy_power, 0);
      game.berf(dummy, 5, 9).await;
      game.resolve_triggers().await;

      game.fight(servitor, dummy).await;
      game.resolve_triggers().await;
      let dummy_health = game.reveal_from_card(dummy, |c| c.health).await;
      assert_eq!(dummy_health, 4); //armor
    })
  })
}
#[test]
fn test_scarred_servitor_frost() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let servitor = game.create_card(1, BaseCard::C2121).await;
      game.move_to_zone(servitor, Zone::Field).await;
      game.resolve_triggers().await;

      let enemy_hero = game.hero_id(enemy(game.owner(servitor)));
      let enemy_hero_health = game.reveal_from_card(enemy_hero, |c| c.health).await;
      let servitor_hero_health = game.reveal_from_card(servitor, |c| c.health).await;
      game.give_spell(enemy_hero, BaseCard::C20009).await;
      game.resolve_triggers().await;
      game.fight(servitor, enemy_hero).await;
      game.resolve_triggers().await;
      assert_eq!(
        enemy_hero_health - servitor_hero_health - 2,
        game.reveal_from_card(enemy_hero, |c| c.health).await
      );
    })
  })
}
#[test]
fn test_scarred_servitor_enemy_attacks_your_turn() -> Result<(), String> {
  // This tests enemy attack on your turn
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let servitor = game.create_card(0, BaseCard::C2121).await;
      let enemy_cloud_guard = game.create_card(1, BaseCard::C93).await;
      let my_cloud_guard = game.create_card(0, BaseCard::C93).await;
      let my_dummy = game.create_card(0, BaseCard::Dummy).await;
      game.move_to_zone(my_dummy, Zone::Field).await;
      game
        .modify_card_single(my_dummy, Modifier::SetHealth(7.into()))
        .await;
      game.move_to_zone(servitor, Zone::Field).await;
      game.resolve_triggers().await;
      game.move_to_zone(enemy_cloud_guard, Zone::Field).await;
      game.resolve_triggers().await;
      game.move_to_zone(my_cloud_guard, Zone::Field).await;
      //enemy hit for 6, has 7 health. m == 6
      game.resolve_triggers().await;
      game.fight(my_dummy, enemy_cloud_guard).await;
      game.resolve_triggers().await;
      let dead = game
        .reveal_from_card(enemy_cloud_guard, |c| c.zone.is_graveyard())
        .await;
      assert!(dead);
    })
  })
}
#[test]
fn test_scarred_servitor_you_attack_enemies_turn() -> Result<(), String> {
  // This tests enemy attack on your turn
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let servitor = game.create_card(1, BaseCard::C2121).await;
      let my_cloud_guard = game.create_card(1, BaseCard::C93).await;
      let enemy_cloud_guard = game.create_card(0, BaseCard::C93).await;
      game.move_to_zone(servitor, Zone::Field).await;
      game.resolve_triggers().await;
      game.move_to_zone(enemy_cloud_guard, Zone::Field).await;
      game.resolve_triggers().await;
      game.move_to_zone(my_cloud_guard, Zone::Field).await;
      game.resolve_triggers().await;
      let dead = game
        .reveal_from_card(enemy_cloud_guard, |c| c.zone.is_graveyard())
        .await;
      assert!(dead);
    })
  })
}
#[test]
fn test_scarred_servitor_enemy_attacks_enemy_turn() -> Result<(), String> {
  // This tests enemy attack on enemy turn
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let servitor = game.create_card(1, BaseCard::C2121).await;
      game.move_to_zone(servitor, Zone::Field).await;
      game.resolve_triggers().await;

      let dummy = game.create_card(0, BaseCard::Dummy).await;
      game.move_to_zone(dummy, Zone::Field).await;
      game.resolve_triggers().await;
      let dummy_health = game.reveal_from_card(dummy, |c| c.health).await;
      let dummy_power = game.reveal_from_card(dummy, |c| c.power).await;
      assert_eq!(dummy_health, 1);
      assert_eq!(dummy_power, 0);
      game.berf(dummy, 5, 9).await;
      game.resolve_triggers().await;

      game.fight(dummy, servitor).await;
      game.resolve_triggers().await;
      let dummy_health = game.reveal_from_card(dummy, |c| c.health).await;
      assert_eq!(dummy_health, 3);
    })
  })
}
#[test]
fn test_scarred_servitor_retaliation_tracker() -> Result<(), String> {
  // This tests enemy attack on enemy turn
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let servitor = game.create_card(0, BaseCard::C2121).await;
      let my_dummy = game.create_card(0, BaseCard::Dummy).await;
      let enemy_dummy = game.create_card(1, BaseCard::Dummy).await;
      let enemy_cloud_guard = game.create_card(1, BaseCard::C93).await;
      let pre_cloud_guard_health = game.reveal_from_card(enemy_cloud_guard, |c| c.health).await;
      game.move_to_zone(servitor, Zone::Field).await;
      game.move_to_zone(enemy_dummy, Zone::Field).await;
      game.resolve_triggers().await;
      game.move_to_zone(enemy_cloud_guard, Zone::Field).await;
      game.resolve_triggers().await;

      game.berf(enemy_dummy, 1, 2).await; // 1/3 now
      game.resolve_triggers().await;

      game.fight(servitor, enemy_dummy).await;
      game.resolve_triggers().await;

      game.move_to_zone(my_dummy, Zone::Field).await;
      game.resolve_triggers().await;
      let cloud_guard_health = game.reveal_from_card(enemy_cloud_guard, |c| c.health).await;
      assert_eq!(pre_cloud_guard_health - 1, cloud_guard_health);
    })
  })
}
