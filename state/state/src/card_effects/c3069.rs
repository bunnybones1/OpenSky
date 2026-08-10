use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_target,
    mutate: |game, my_id, target, _| {
      Box::pin(async move {
        game.damage(target, 1, my_id).await;
        let owner = game.owner(my_id);
        if target
          .instance(game, None)
          .unwrap()
          .marked_for_death
          .is_some()
        {
          let mut slay_trigger = true;
          while slay_trigger {
            slay_trigger = false;

            if let Some(lowest_health_enemy) = game
              .lowest_health_character(enemy(owner), |c| c.health > 0)
              .await
            {
              game.damage(lowest_health_enemy, 1, my_id).await;
              if lowest_health_enemy
                .instance(game, None)
                .unwrap()
                .marked_for_death
                .is_some()
              {
                slay_trigger = true;
              }
            }
          }
        }
      })
    },
  }
});

#[test]
fn test_3069() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let card_id = game.create_card(0, BaseCard::C3069).await;

      let target = game
        .instantiate_and_summon(1, BaseCard::Dummy)
        .await
        .unwrap();
      game.instantiate_and_summon(1, BaseCard::Dummy).await;
      game.instantiate_and_summon(1, BaseCard::Dummy).await;
      let slay3 = game
        .instantiate_and_summon(1, BaseCard::Dummy)
        .await
        .unwrap();
      game.berf(slay3, 1, 1).await;
      game.resolve_triggers().await;
      assert_eq!(game.units::<InstanceID>(1).len(), 4);

      game.move_to_zone(card_id, Zone::Casting).await;
      game
        .resolve_card_effect_as_player(card_id, Some(target), 2.into())
        .await;
      game.move_to_zone(card_id, Zone::Graveyard).await;
      game.resolve_triggers().await;
      assert_eq!(game.units::<InstanceID>(1).len(), 1);
    })
  })
}
