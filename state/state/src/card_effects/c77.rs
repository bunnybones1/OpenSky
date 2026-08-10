use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, owner| {
        Box::pin(async move {
          while let Some(front_unit) = game
            .enemy_units::<&CardInstance<SkyWeaver>>(owner)
            .into_iter()
            .filter(|c| c.marked_for_death.is_none())
            .last()
            .map(|c| c.id())
          {
            game.fight(my_id, front_unit).await;
            if front_unit
              .instance(game, None)
              .unwrap()
              .marked_for_death
              .is_none()
            {
              break; // stop the loop if we didn't kill our target!
            }
          }
        })
      },
    }
  }))
});

#[test]
fn test_999() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      for _ in 0..5 {
        game.instantiate_and_summon(1, BaseCard::C20000).await;
      }
      let me = game.create_card(0, BaseCard::C77).await;
      game.move_to_zone(me, Zone::Casting).await;
      game.resolve_card_effect_as_player(me, None, 0.into()).await;
      game.resolve_triggers().await;
      assert_eq!(game.graveyard::<InstanceID>(1).len(), 5);
    })
  })
}

#[test]
fn test_999_doesnt_work_while_silenced() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      for _ in 0..5 {
        game.instantiate_and_summon(1, BaseCard::C20000).await;
      }
      let me = game.create_card(0, BaseCard::C77).await;
      game.move_to_zone(me, Zone::Casting).await;
      game.modify_card(me, vec![Modifier::Silenced(true)]).await;
      game.resolve_triggers().await;
      game.resolve_card_effect_as_player(me, None, 0.into()).await;
      game.resolve_triggers().await;
      assert_eq!(game.graveyard::<InstanceID>(1).len(), 0);
      assert_eq!(game.player_cards(1).field().len(), 6);
    })
  })
}
