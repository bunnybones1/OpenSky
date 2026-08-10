use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_aura!(
    |game, my_id| Box::pin(async move {
      let owner = game.owner(my_id);
      game
        .aura_cards_have(
          owner,
          my_id,
          |c| c.is_spell() && c.cost >= 1,
          vec![Modifier::GrantTrait(Trait::Banner)],
          0,
        )
        .await;
    }),
    AuraLayer::OtherKeyword
  )
  .into()],
  on_play: None
});

#[test]
fn test_nimbus_gives_banner_to_xc_spells_that_match() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let xc_spell = game.create_card(0, BaseCard::C3014).await;
      game
        .move_to_zone(xc_spell, Zone::Hand { public: false })
        .await;
      game.aura_update().await;
      game.set_mana(0, 1).await;
      game.resolve_triggers().await;
      assert_eq!(
        game.reveal_from_card(xc_spell, |c| c.cost).await,
        1,
        "X-cost spell should cost all of player's mana."
      );
      assert!(
        game
          .reveal_from_card(xc_spell, |c| !c.traits.contains(&Trait::Banner))
          .await,
        "X-cost spell should not have banner yet!"
      );

      // summon nimbus!
      game.instantiate_and_summon(0, BaseCard::C4005).await;
      game.aura_update().await;
      assert_eq!(
        game.reveal_from_card(xc_spell, |c| c.cost).await,
        1,
        "X-cost spell should cost all of player's mana."
      );
      assert!(
        game
          .reveal_from_card(xc_spell, |c| c.traits.contains(&Trait::Banner))
          .await,
        "X-cost spell should have banner from Nimbus!"
      );
    })
  })
}

#[test]
fn test_nimbus_gives_banner_to_aura_cost_modify_spells() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let spell_0c = game.fake_spell().await;
      game
        .modify_card(spell_0c, vec![Modifier::SetCost(0.into())])
        .await;
      game
        .move_to_zone(spell_0c, Zone::Hand { public: true })
        .await;
      game.aura_update().await;

      assert_eq!(
        game.reveal_from_card(spell_0c, |c| c.cost).await,
        0,
        "Spell should cost 0."
      );
      assert!(
        game
          .reveal_from_card(spell_0c, |c| !c.traits.contains(&Trait::Banner))
          .await,
        "Spell should not have banner yet!"
      );

      // summon nimbus!
      game.instantiate_and_summon(0, BaseCard::C4005).await;
      game.aura_update().await;
      assert!(
        game
          .reveal_from_card(spell_0c, |c| !c.traits.contains(&Trait::Banner))
          .await,
        "Spell should not have banner yet, we haven't summoned Geod so the condition won't match!"
      );

      // Summon Geod!
      game.instantiate_and_summon(1, BaseCard::C3).await;
      game.aura_update().await;
      assert_eq!(
        game.reveal_from_card(spell_0c, |c| c.cost).await,
        1,
        "Spell should cost 1."
      );
      assert!(
        game
          .reveal_from_card(spell_0c, |c| c.traits.contains(&Trait::Banner))
          .await,
        "Spell should have banner from Nimbus!"
      );
    })
  })
}
