use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: xcost_modify!(
    |game, my_id| {
      let power: i8 = i8::try_from(u8::from(game.hero(game.owner(my_id)).power)).unwrap();
      -power
    },
    AuraLayer::DecreaseCost
  ),
  on_play: None
});

#[test]
fn test_blademaster_unit_banner() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      assert_eq!(game.hero(0).power, 1);
      let unit = game
        .instantiate_and_summon(0, BaseCard::Dummy)
        .await
        .unwrap();
      game
        .modify_card(unit, vec![Modifier::GrantTrait(Trait::Banner)])
        .await;
      game.resolve_triggers().await;
      assert_eq!(game.hero(0).power, 2);

      let card = game.create_card(0, BaseCard::C1083).await; // me!
      game.move_to_zone(card, Zone::Hand { public: false }).await;
      game.resolve_triggers().await;
      let original_cost = BaseCard::C1083.instance().cost;
      assert_eq!(
        game.reveal_from_card(card, |c| c.cost).await,
        original_cost - 2
      )
    })
  })
}
