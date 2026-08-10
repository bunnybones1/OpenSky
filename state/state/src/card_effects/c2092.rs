use super::effect_helpers::*;
intrinsic_effect!(Effect::Spell {
  triggers: xcost_all_your_mana!(),
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let cost = my_id.instance(game, None).unwrap().cost;
        let my_mana = game.player(owner).mana;
        if my_mana >= cost {
          game.change_mana(owner, -i32::from(cost)).await;
          let hero_id = game.hero_id(owner);
          let card = game
            .draw_high_cost_x_or_less(
              owner,
              (
                owner,
                Zone::Attachment {
                  parent: hero_id.into(),
                },
              ),
              cost.into(),
              |_, _| true,
            )
            .await;
          if let Some(card) = card {
            // OK to reveal, because the card is public.
            let current_cost_without_modifiers =
              game.reveal_from_card(card, |c| c.instance.cost).await;
            let delta = i8::from(current_cost_without_modifiers);
            // decrease cost now
            game
              .modify_card(card, vec![Modifier::ModifyCost(-delta)])
              .await;

            // and queue up increase later. This modifier gets wiped if the card gets reset :)
            game
              .grant_modifier_for_turns(
                card,
                my_id,
                Modifier::ApplyAtTurnEnd(Box::new(Modifier::ModifyCost(delta))),
                0,
                1,
              )
              .await;
          }
        }
      })
    },
  }
});

#[test]
fn test_eldritch_lore() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let drawn_card = setup_lore_test(&mut game).await;

      let (drawn_card_cost, drawn_card_base) = game
        .reveal_from_card(drawn_card, |c| (c.cost, *c.base()))
        .await;

      // should not be a 0c base card.
      assert_ne!(drawn_card_base.instance().cost, 0,);
      // should be set to 0c now
      assert_eq!(drawn_card_cost, 0);

      game.pass_turn().await;
      game.resolve_triggers().await;

      let drawn_card_cost = game.reveal_from_card(drawn_card, |c| c.cost).await;

      // should no longer be set to 0c
      assert_ne!(drawn_card_cost, 0);
    })
  })
}

#[test]
fn test_eldritch_lore_card_cost_incr_while_0c() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let drawn_card = setup_lore_test(&mut game).await;

      let (drawn_card_cost, drawn_card_base) = game
        .reveal_from_card(drawn_card, |c| (c.cost, *c.base()))
        .await;

      let base_cost = drawn_card_base.instance().cost;

      // should not be a 0c base card.
      assert_ne!(base_cost, 0,);
      // should be set to 0c now
      assert_eq!(drawn_card_cost, 0);

      // give it +2c
      game
        .modify_card(drawn_card, vec![Modifier::ModifyCost(2)])
        .await;
      assert_eq!(game.reveal_from_card(drawn_card, |c| c.cost).await, 2);

      game.pass_turn().await;
      game.resolve_triggers().await;

      let drawn_card_cost = game.reveal_from_card(drawn_card, |c| c.cost).await;

      assert_eq!(drawn_card_cost, base_cost + 2);
    })
  })
}

#[test]
fn test_eldritch_lore_card_cost_decr_while_0c() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let drawn_card = setup_lore_test(&mut game).await;

      let (drawn_card_cost, drawn_card_base) = game
        .reveal_from_card(drawn_card, |c| (c.cost, *c.base()))
        .await;

      let base_cost = drawn_card_base.instance().cost;

      // should not be a 0c base card.
      assert_ne!(base_cost, 0,);
      // should be set to 0c now
      assert_eq!(drawn_card_cost, 0);

      // give it -2c
      game
        .modify_card(drawn_card, vec![Modifier::ModifyCost(-2)])
        .await;
      assert_eq!(game.reveal_from_card(drawn_card, |c| c.cost).await, 0);

      game.pass_turn().await;
      game.resolve_triggers().await;

      let drawn_card_cost = game.reveal_from_card(drawn_card, |c| c.cost).await;

      assert_eq!(
        drawn_card_cost, base_cost,
        "card cost did not saturate at 0!"
      );
    })
  })
}

#[test]
fn test_eldritch_lore_card_cost_incr_card_with_already_modified_cost() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      // ensure hero does not have an attachment
      {
        let hero_attachment = game.hero(0).attachment();
        if let Some(hero_attachment) = hero_attachment {
          game.dust(hero_attachment).await;
        }
        game.resolve_triggers().await;
        assert!(game.hero(0).attachment().is_none());
      }

      let lore = game.create_card(0, BaseCard::C2092).await;
      game.move_to_zone(lore, Zone::Hand { public: false }).await;

      // create dummy 6c card modified to 5c
      let deck_cards = game.deck_cards(0);
      game.dust_many(deck_cards).await;

      let dummy_6c = game
        .create_card(
          0,
          BaseCard::iter()
            .find(|c| c.instance().cost == 6 && c.instance().is_spell())
            .expect("a 6c spell doesn't exist??"),
        )
        .await;
      game.move_to_zone(dummy_6c, Zone::Deck).await;
      // make it 7c
      game
        .modify_card(dummy_6c, vec![Modifier::ModifyCost(1)])
        .await;
      game.resolve_triggers().await;

      // set player mana for xcost
      game.set_mana(0, 7).await;
      game.resolve_triggers().await;
      let player_mana = game.player(0).mana;

      // fake cast eldritch lore
      game.move_to_zone(lore, Zone::Casting).await;
      game
        .resolve_card_effect_as_player(lore, None, player_mana)
        .await;
      game.resolve_triggers().await;
      assert!(game.hero(0).attachment().is_some());

      let drawn_card = game.hero(0).attachment().unwrap();

      let (drawn_card_cost, drawn_card_base) = game
        .reveal_from_card(drawn_card, |c| (c.cost, *c.base()))
        .await;

      let base_cost = drawn_card_base.instance().cost;

      // should be a 6c base card.
      assert_eq!(base_cost, 6);
      // should be set to 0c now
      assert_eq!(drawn_card_cost, 0);

      // give it +2c
      game
        .modify_card(drawn_card, vec![Modifier::ModifyCost(2)])
        .await;
      assert_eq!(game.reveal_from_card(drawn_card, |c| c.cost).await, 2);

      game.pass_turn().await;
      game.resolve_triggers().await;

      let drawn_card_cost = game.reveal_from_card(drawn_card, |c| c.cost).await;

      assert_eq!(
        drawn_card_cost,
        base_cost + 1 + 2,
        "card cost did not keep modifiers!"
      );
    })
  })
}
#[test]
fn test_lore_always_0c_in_deck() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      game.change_mana(0, 5).await;
      let lore = game.create_card(0, BaseCard::C2092).await;
      game.move_to_zone(lore, Zone::Deck).await;

      // set player mana for xcost
      game.change_mana(0, 5).await;
      game.resolve_triggers().await;

      let cube = game.create_card(0, BaseCard::C4074).await;
      game.dust_hand(0).await;
      game.move_to_zone(cube, Zone::Casting).await;
      game
        .resolve_card_effect_as_player(cube, None, 1.into())
        .await;
      game.resolve_triggers().await;

      assert!(matches!(
        game.reveal_from_card(lore, |c| c.zone).await,
        Zone::Hand { public: false }
      ));
      game.move_to_zone(lore, Zone::Deck).await;
      game.resolve_triggers().await;
      assert_eq!(game.reveal_from_card(lore, |c| c.cost).await, 0);
    })
  })
}
#[cfg(test)]
async fn setup_lore_test(game: &mut TestGame<'_>) -> InstanceID {
  // ensure hero does not have an attachment
  {
    let hero_attachment = game.hero(0).attachment();
    if let Some(hero_attachment) = hero_attachment {
      game.dust(hero_attachment).await;
    }
    game.resolve_triggers().await;
    assert!(game.hero(0).attachment().is_none());
  }

  let lore = game.create_card(0, BaseCard::C2092).await;
  game.move_to_zone(lore, Zone::Hand { public: false }).await;

  // set player mana for xcost
  game.change_mana(0, 5).await;
  game.resolve_triggers().await;
  let player_mana = game.player(0).mana;

  // fake cast eldritch lore
  game.move_to_zone(lore, Zone::Casting).await;
  game
    .resolve_card_effect_as_player(lore, None, player_mana)
    .await;
  game.resolve_triggers().await;
  assert!(game.hero(0).attachment().is_some());

  game.hero(0).attachment().unwrap()
}
