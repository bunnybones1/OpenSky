use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let dead_units: Vec<_> = game
          .graveyard::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .filter(|c| c.is_unit())
          .map(|c| c.id())
          .take(3)
          .collect();
        for id in &dead_units {
          if game.player_has_room_for_unit(owner) {
            game
              .modify_card(
                *id,
                vec![
                  Modifier::SetPower(1.into()),
                  Modifier::SetHealth(1.into()),
                  Modifier::GrantTrait(Trait::Dash),
                ],
              )
              .await;
            game.summon(*id).await;
          }
        }
        for id in dead_units {
          if game.is_on_field(id) {
            game.give_spell(id, BaseCard::C20028).await;
          }
        }
      })
    },
  }
});

#[test]
fn card_805() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let unit = game
        .instantiate_and_summon(0, BaseCard::C20000)
        .await
        .unwrap();
      game.kill(unit).await;
      let jar = game.create_card(0, BaseCard::C3054).await;
      game.move_to_zone(jar, Zone::Hand { public: false }).await;
      game.resolve_triggers().await;
      game.move_to_zone(jar, Zone::Casting).await;

      game
        .resolve_card_effect_as_player(jar, None, 0.into())
        .await;
      game.move_to_zone(jar, Zone::Graveyard).await;
      game.resolve_triggers().await;
      assert!(game.is_alive_on_field(unit));
    })
  })
}

#[test]
fn test_grave() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let unit = game.create_card(0, BaseCard::C20000).await;
      game.move_to_zone(unit, Zone::Graveyard).await;
      game.resolve_triggers().await;
      game
        .modify_card_single(unit, Modifier::SetHealth(10.into()))
        .await;
      assert!(game.reveal_from_card(unit, |c| c.health == 10).await);
    })
  })
}
