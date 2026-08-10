use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_aura!(
    |game, my_id| Box::pin(async move {
      let owner = game.owner(my_id);
      let spells: Vec<_> = game
        .characters::<&CardInstance<SkyWeaver>>(owner)
        .into_iter()
        .filter_map(|c| c.attachment())
        .collect();
      for spell in spells {
        game
          .add_aura_modifier(spell, my_id, Modifier::ModifyCost(-1), 0)
          .await;
      }
    }),
    AuraLayer::DecreaseCost
  )
  .into()],
  on_play: None
});

#[test]
fn card_323() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let hero = game.hero_id(0);
      let spell = game
        .give_spell(hero, BaseCard::Dummy)
        .await
        .unwrap()
        .id()
        .unwrap();
      game
        .modify_card(spell, vec![Modifier::SetCost(10.into())])
        .await;

      game.instantiate_and_summon(0, BaseCard::C2018).await;
      game.resolve_triggers().await;
      assert_eq!(spell.instance(&game, None).unwrap().cost, 9);
    })
  })
}
