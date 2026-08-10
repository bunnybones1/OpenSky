use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);

    game
      .draw(owner, |c, _| {
        // using base instance so attachments that give an effect type aren't counted.
        c.is_unit()
          && c
            .base
            .instance()
            .get_effect_types()
            .any(|e| e == EffectType::Death)
      })
      .await;
  }))
  .into()],
  on_play: None
});

#[test]
fn test_crypto_doesnt_draw_fate_unit() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let unit_with_fate_and_no_base_death_effect = BaseCard::iter()
        .find(|c| {
          c.attached_spell().map_or(false, |a| a == enchant::FATE)
            && !c
              .instance()
              .get_effect_types()
              .any(|e| e == EffectType::Death)
        })
        .expect("There is no unit with fate & no base death effect!!");
      let deck = game.deck_cards(0);
      game.dust_many(deck).await;
      let hand = game.hand_cards(0);
      game.dust_many(hand).await;

      let unit = game
        .create_card(0, unit_with_fate_and_no_base_death_effect)
        .await;
      game.move_to_zone(unit, Zone::Deck).await;

      // summon crypto
      let crypto = game
        .instantiate_and_summon(0, BaseCard::C3051)
        .await
        .unwrap();
      game.kill(crypto).await;
      game.resolve_triggers().await;

      assert_eq!(game.hand_cards(0).len(), 1);

      let hand_card = game.hand_cards(0)[0];
      let id = game.reveal_from_card(hand_card, |c| c.id()).await;
      assert_ne!(id, unit, "Crypto drew a non-death unit with fate!!");
    })
  })
}
