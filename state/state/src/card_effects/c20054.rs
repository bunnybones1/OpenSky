use super::effect_helpers::*;
intrinsic_effect!(effect_while_attached!(CardEffect::Vapors));

attachable_effect!(
  struct Vapors;,
  VAPORS,
  when_enchant_is_removed_in_play!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    game.change_health(my_id, 2).await;
    game.draw_any_card(owner).await;
  }))
);

#[test]
fn card_1098() -> Result<(), String> {
  // It should work when regularly dusted
  run_test(|mut game| {
    let vapors = enchant::VAPORS;
    Box::pin(async move {
      let unit = game.create_card(0, BaseCard::Dummy).await;
      game.summon(unit).await;
      game.give_spell(unit, vapors).await;
      game.resolve_triggers().await;
      let hand_size = game.player_cards(0).hand().len();
      let s_id = unit.instance(&game, None).unwrap().attachment().unwrap();
      game.dust(s_id).await;
      game.resolve_triggers().await;
      assert_eq!(game.player_cards(0).hand().len(), hand_size + 1);
    })
  })?;

  // But shouldn't fire if it gets removed as the result of a card reset
  run_test(|mut game| {
    let vapors = enchant::VAPORS;
    let unit_with_spell: BaseCard = BaseCard::iter()
      .find(|c| matches!(c.attached_spell(), Some(c) if c != vapors))
      .expect("WTF? No cards have attached spells.");
    Box::pin(async move {
      let unit = game.create_card(0, unit_with_spell).await;
      game.summon(unit).await;
      game.give_spell(unit, vapors).await;
      game.resolve_triggers().await;
      let hand_size = game.player_cards(0).hand().len();
      game.kill(unit).await;
      game.resolve_triggers().await;
      assert_eq!(
        *unit
          .instance(&game, None)
          .unwrap()
          .attachment()
          .unwrap()
          .instance(&game, None)
          .unwrap()
          .base(),
        unit_with_spell.attached_spell().unwrap()
      );
      assert_ne!(
        *unit
          .instance(&game, None)
          .unwrap()
          .attachment()
          .unwrap()
          .instance(&game, None)
          .unwrap()
          .base(),
        vapors
      );
      assert_eq!(game.player_cards(0).hand().len(), hand_size);
    })
  })
}

#[test]
fn vapors_doesnt_draw_into_play_from_hand() -> Result<(), String> {
  let vapors = enchant::VAPORS;
  let spell_with_0c: BaseCard = BaseCard::iter()
    .find(|c| c.instance().is_spell() && c.instance().cost == 0)
    .expect("WTF? No cards are 0c spells.");

  run_test(move |mut game| {
    Box::pin(async move {
      assert_eq!(game.player_cards(0).deck(), 0);

      let hero = game.hero_id(0);
      game.give_spell(hero, vapors).await;
      game.resolve_triggers().await;

      let deck_spell = game.create_card(0, spell_with_0c).await;
      game.move_to_zone(deck_spell, Zone::Deck).await;
      game.resolve_triggers().await;
      assert_eq!(game.player_cards(0).deck(), 1);

      let hand_size = game.player_cards(0).hand().len();

      // "Spend your mana. {Draw} your highest cost spell of that cost or less onto your hero. Set it to {0c}."
      let call_to_mind = game.create_card(0, BaseCard::C2092).await;
      game
        .resolve_card_effect_as_player(call_to_mind, None, 25.into())
        .await;
      game.resolve_triggers().await;

      // We should have drawn a card! If we didn't, this is the bug #2545:
      // https://github.com/horizon-games/issue-tracker/issues/2545
      assert_eq!(game.player_cards(0).hand().len(), hand_size + 1);
    })
  })
}
