use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_aura!(
    |game, my_id| Box::pin(async move {
      let owner = game.owner(my_id);
      game
        .aura_cards_have(
          enemy(owner),
          my_id,
          |c| c.is_spell(),
          vec![Modifier::ModifyCost(1)],
          0,
        )
        .await;
    }),
    AuraLayer::IncreaseCost
  )
  .into()],
  on_play: None
});

#[test]
fn test_geod_doesnt_affect_xc_spells() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let xc_spell = game.create_card(0, BaseCard::C3014).await;
      game
        .move_to_zone(xc_spell, Zone::Hand { public: true })
        .await;
      game.aura_update().await;
      assert_eq!(
        game.reveal_from_card(xc_spell, |c| c.cost).await,
        game.player(0).mana,
        "X-cost spell should cost all of player's mana."
      );

      // summon geod!
      game.instantiate_and_summon(0, BaseCard::C3).await;
      game.aura_update().await;
      assert_eq!(
        game.reveal_from_card(xc_spell, |c| c.cost).await,
        game.player(0).mana,
        "Geod modified x-cost spell cost!!."
      );
    })
  })
}
