use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Continuous,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, _, my_id, phase, _| {
      Box::pin(async move {
        let owner = game.owner(my_id);
        if let Ok(ResolvedPhaseDamage {
          overkill,
          source,
          kind,
          target,
          ..
        }) = phase.try_into()
        {
          if source != my_id || overkill == 0 || game.owner(target) == owner {
            return;
          }

          // don't fire if this is because another unit punched *us*
          if let DamageKind::Combat {
            is_retaliation: false,
          } = kind
          {
            game
              .run_instant_trigger(BaseCard::C1107, my_id, EffectType::Generic, move |game| {
                Box::pin(async move {
                  game
                    .damage(game.hero_id(enemy(owner)), overkill.into(), my_id)
                    .await;
                })
              })
              .await;
          }
        }
      })
    },
  }
  .into()],
  on_play: None
});

#[test]
fn test_drillbot() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let unit = game
        .instantiate_and_summon(1, BaseCard::C20000)
        .await
        .unwrap();
      let drillbot = game
        .instantiate_and_summon(0, BaseCard::C1107)
        .await
        .unwrap();
      assert!(
        game.reveal_from_card(unit, |c| c.health).await
          < game.reveal_from_card(drillbot, |c| c.power).await
      );
      game.resolve_triggers().await;
      let hero_hp = game.hero(1).health;
      game.fight(drillbot, unit).await;
      game.resolve_triggers().await;
      assert!(game.hero(1).health < hero_hp);
    })
  })
}

#[test]
fn test_drillbot_doesnt_fire_if_attacked() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let unit = game
        .instantiate_and_summon(1, BaseCard::C20000)
        .await
        .unwrap();
      let drillbot = game
        .instantiate_and_summon(0, BaseCard::C1107)
        .await
        .unwrap();
      assert!(
        game.reveal_from_card(unit, |c| c.health).await
          < game.reveal_from_card(drillbot, |c| c.power).await
      );
      game.resolve_triggers().await;
      let hero_hp = game.hero(1).health;
      game.fight(unit, drillbot).await;
      game.resolve_triggers().await;
      assert_eq!(game.hero(1).health, hero_hp);
    })
  })
}
