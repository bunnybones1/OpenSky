use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseMoveToZone {
          card,
          from,
          to: (unit_owner, Zone::Field),
        }) = phase.try_into()
        {
          let my_owner = game.owner(my_id);
          if !from.is_field() && unit_owner != my_owner {
            queue.add_alive_in_play_resolution(my_id, move |game| {
              Box::pin(async move {
                game
                  .modify_card(my_id, vec![Modifier::MarkedForDeath(my_id)])
                  .await;
                game.give_spell(card, enchant::HEX).await;
                game.draw(my_owner, |c, _| c.element == Element::Dark).await;
              })
            });
          }
        }
      })
    },
  }
  .into()],
  on_play: None
});

#[test]
fn test_fly_guy_only_hexes_first_summon_it_sees() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game
        .instantiate_and_summon(0, BaseCard::C1087)
        .await
        .unwrap();
      game.resolve_triggers().await;
      let mut units: Vec<InstanceID> = vec![];
      for _ in 0..3u8 {
        let unit = game
          .instantiate_and_summon(1, BaseCard::Dummy)
          .await
          .unwrap();
        units.push(unit);
      }
      game.resolve_triggers().await;
      for (x, unit) in units.into_iter().enumerate() {
        assert_eq!(
          unit.instance(&**game, None).unwrap().attachment().is_some(),
          x == 0
        );
      }
    })
  })
}

#[test]
fn test_fly_guy_doesnt_fire_if_killed_by_play_effect() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let fly_guy = game
        .instantiate_and_summon(0, BaseCard::C1087)
        .await
        .unwrap();
      game.resolve_triggers().await;

      // "Play: kill fly guy and then summon 3x {card:0}"
      game
        .modify_card(fly_guy, vec![Modifier::MarkedForDeath(fly_guy)])
        .await;
      let mut units: Vec<InstanceID> = vec![];
      for _ in 0..3u8 {
        let unit = game
          .instantiate_and_summon(1, BaseCard::Dummy)
          .await
          .unwrap();
        units.push(unit);
      }
      game.resolve_triggers().await;

      for unit in units.into_iter() {
        assert!(unit.instance(&**game, None).unwrap().attachment().is_none(),);
      }
    })
  })
}
