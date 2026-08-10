use super::effect_helpers::*;

intrinsic_effect!(Effect::Enchant {
  on_attach: |parent, enchant| {
    parent.add_aura_modifier(enchant.id(), Modifier::NoTraits, 2);
    parent.add_modifier(
      enchant.id(),
      0,
      Modifier::GrantEffect(CardEffect::Chains),
      ModifierExpiry::Never { copyable: false },
    );
  },
  on_detach: |parent, attach| {
    parent.remove_modifiers_from(attach.id());
  },
});

attachable_effect!(
  struct Chains;,
  CHAINS,
  Effect::Unit {
    on_play: None,
    triggers: vec![unit_aura!(
      |game, my_id: InstanceID| Box::pin(async move {
        let my_attach = my_id
          .instance(game, None)
          .unwrap()
          .attachment()
          .expect("This trigger comes from an attach, so the attach should exist");
        game
          .add_aura_modifier(my_id, my_attach, Modifier::NoTraits, 2)
          .await;
      }),
      AuraLayer::Internal,
      true
    )
    .into()]
  }
);

#[test]
fn card_579() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let id = game
        .instantiate_and_summon(0, BaseCard::Dummy)
        .await
        .unwrap();
      game
        .modify_card(id, vec![Modifier::GrantTrait(Trait::Guard)])
        .await;

      // Chains removes keywords when added
      game.give_spell(id, enchant::CHAINS).await;
      assert_eq!(id.instance(&game, None).unwrap().traits.len(), 0);

      // Keywords are still gone after aura update
      game.resolve_triggers().await;
      assert_eq!(id.instance(&game, None).unwrap().traits.len(), 0);

      // Keywords can't be added while chains is applied,
      // but they'll show up when it's removed
      game
        .modify_card(id, vec![Modifier::GrantTrait(Trait::Lifesteal)])
        .await;
      assert_eq!(id.instance(&game, None).unwrap().traits.len(), 0);

      // Keywords are still gone after aura update
      game.resolve_triggers().await;
      assert_eq!(id.instance(&game, None).unwrap().traits.len(), 0);

      // Keywords are re-enabled after chains is removed
      game.draw_spell_onto(id, |_, _| true).await;
      assert_eq!(id.instance(&game, None).unwrap().traits.len(), 2);

      // Keywords aren't still gone after aura update
      game.resolve_triggers().await;
      assert_eq!(id.instance(&game, None).unwrap().traits.len(), 2);

      // Keywords can be added after Chains is removed
      game
        .modify_card(id, vec![Modifier::GrantTrait(Trait::Armor)])
        .await;
      assert_eq!(id.instance(&game, None).unwrap().traits.len(), 3);
    })
  })
}

#[test]
fn card_579_doesnt_remove_keywords_in_hand() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let id = game
        .instantiate_and_summon(0, *crate::tests::UNIT_WITH_ONLY_GUARD)
        .await
        .unwrap();

      // Chains removes keywords when added
      game.give_spell(id, enchant::CHAINS).await;
      assert_eq!(id.instance(&game, None).unwrap().traits.len(), 0);

      // Keywords are still gone after aura update
      game.resolve_triggers().await;
      assert_eq!(id.instance(&game, None).unwrap().traits.len(), 0);

      game.bounce(id).await;
      game.resolve_triggers().await;
      assert!(game.location(id).location.unwrap().0.is_hand());
      assert_eq!(id.instance(&game, None).unwrap().traits.len(), 1);
    })
  })
}
