use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_slay!(|game, my_id, _target| Box::pin(async move {
    let owner = game.owner(my_id);
    let hero = game.hero_id(owner);
    if game
      .hero(game.owner(my_id))
      .effects
      .iter()
      .find_map(|m| match m {
        CardEffect::Spellbreaker(_id) => Some(false),
        _ => None,
      })
      .unwrap_or(true)
    {
      game
        .add_modifier(
          hero,
          my_id,
          Modifier::GrantEffect(CardEffect::Spellbreaker(my_id)),
          true,
          0,
        )
        .await;
    }
  }))
  .into()],
  on_play: None
});

attachable_effect!(
  struct Spellbreaker(InstanceID);,
  SPELLBREAKER,
  Effect::Unit {
    on_play: None,
    triggers: vec![NormalTrigger {
      effect_type: EffectType::Internal,
      priority: aura_order(false, AuraLayer::IncreaseCost),
      is_active: is_on_field_not_silenced,
      run: |game, _queue, my_id, phase, card_effect| {
        Box::pin(async move {
          if let (
            Ok(ResolvedPhaseResolveCardEffect {
              id,
              played_by_unit,
              target_id,
              ..
            }),
            CardEffect::Spellbreaker(source),
          ) = (phase.try_into(), card_effect)
          {
            if played_by_unit {
              return;
            }

            let owner = game.owner(my_id);
            let hero = game.hero_id(owner);
            if game
              .reveal_from_card(id, move |c| c.is_spell() && owner == c.owner)
              .await
            {
              game.cleanup_dead_units().await;
              game.remove_modifiers_from_source(hero, source).await;

              game.cast_spell_copy_as_unit(id, target_id).await;
            }
          }
        })
      },
    }
    .into()]
  }
);

#[test]
fn test_spellbreaker_dead_units() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let enemy_hero = game.hero_id(1);
      let hero_health_pre = game.reveal_from_card(enemy_hero, |c| c.health).await;

      let spell_breaker = game.create_card(0, BaseCard::C4123).await;
      let timber = game.create_card(0, BaseCard::C4069).await;
      let molten_heart = game.create_card(0, BaseCard::C3078).await;
      let b1 = game.create_card(1, BaseCard::C4020).await; //B Unit
      let b2 = game.create_card(1, BaseCard::C4020).await; //B Unit

      game.move_to_zone(spell_breaker, Zone::Field).await;
      game.move_to_zone(timber, Zone::Field).await;
      game.move_to_zone(b1, Zone::Field).await;
      game.move_to_zone(b2, Zone::Field).await;

      game.resolve_triggers().await;
      game.fight(spell_breaker, b1).await;
      game.resolve_triggers().await;
      game.move_to_zone(molten_heart, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(molten_heart, Some(timber), 2.into())
        .await;
      game.move_to_zone(molten_heart, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let hero_health_post = game.reveal_from_card(enemy_hero, |c| c.health).await;
      assert_eq!(hero_health_post, hero_health_pre - 5);
    })
  })
}

#[test]
fn test_spellbreaker_target_on_field() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let spell_breaker = game.create_card(0, BaseCard::C4123).await;
      let timber = game.create_card(1, BaseCard::C4069).await;
      let blow_away = game.create_card(0, BaseCard::C4000).await;
      let b = game.create_card(1, BaseCard::C4020).await; //B Unit

      game.move_to_zone(spell_breaker, Zone::Field).await;
      game.move_to_zone(timber, Zone::Field).await;
      game.move_to_zone(b, Zone::Field).await;

      game.resolve_triggers().await;
      game.fight(spell_breaker, b).await;
      game.resolve_triggers().await;
      game.move_to_zone(blow_away, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(blow_away, Some(timber), 3.into())
        .await;
      game.move_to_zone(blow_away, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let timber_zone = game.reveal_from_card(timber, |c| c.zone).await;
      assert!(!timber_zone.is_field());
    })
  })
}
#[test]
fn test_spellbreaker_sparky() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let spell_breaker = game.create_card(0, BaseCard::C4123).await;
      let owner = game.owner(spell_breaker);
      let sparky = game.create_card(0, BaseCard::C4063).await;
      let clapback = game.create_card(0, BaseCard::C1035).await;
      let enemy_hero = game.hero_id(enemy(owner));
      let my_hero = game.hero_id(owner);
      let my_hero_health = game.reveal_from_card(my_hero, |c| c.health).await;
      let b = game.create_card(1, BaseCard::C4020).await; //B Unit
      game
        .move_to_zone(clapback, Zone::Hand { public: false })
        .await;

      game.move_to_zone(spell_breaker, Zone::Field).await;
      game.move_to_zone(sparky, Zone::Field).await;
      game.move_to_zone(b, Zone::Field).await;
      game.resolve_triggers().await;

      game.fight(spell_breaker, b).await;
      game.resolve_triggers().await;

      game.move_to_zone(clapback, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(clapback, Some(enemy_hero), 4.into())
        .await;
      game.resolve_triggers().await;

      game.move_to_zone(clapback, Zone::Graveyard).await;
      game.resolve_triggers().await;

      assert_eq!(
        my_hero_health + 12,
        game.reveal_from_card(my_hero, |c| c.health).await
      );
    })
  })
}
