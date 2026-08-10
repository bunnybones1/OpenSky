use super::effect_helpers::*;
fn update_sapphire_effect(game: &mut LiveGame<'_>, owner: Player) {
  let sapphire_is_on_field = game
    .units::<&CardInstance<SkyWeaver>>(owner)
    .into_iter()
    .any(|c| *c.base() == BaseCard::C4023);
  game.player_mut(owner).inspire_repeat = if sapphire_is_on_field { 2 } else { 1 };
}

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_aura!(
    |game, my_id| Box::pin(async move {
      let owner = game.owner(my_id);
      update_sapphire_effect(game, owner);
    }),
    AuraLayer::Internal
  )
  .into()],
  on_play: None
});

#[test]
fn c4023_doubles_inspire_effects() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      // this card
      game.instantiate_and_summon(0, BaseCard::C4023).await;

      // 959 Bubbles: {trigger:Inspire {Water}:} Gets {+1hp}.
      let bubbles = game
        .instantiate_and_summon(0, BaseCard::C4067)
        .await
        .unwrap();
      let hp = bubbles.instance(&game, None).unwrap().health;

      let fake_water_card = game.create_card(0, BaseCard::Dummy).await;
      game
        .modify_card(
          fake_water_card,
          vec![
            Modifier::SetElement(Element::Water),
            Modifier::SetCost(1.into()),
          ],
        )
        .await;
      game
        .resolve_card_effect_as_player(fake_water_card, None, 1.into())
        .await;
      game.resolve_triggers().await;

      assert_eq!(bubbles.instance(&game, None).unwrap().health, hp + 2);
    })
  })
}

#[test]
fn c4023_is_singleton_effect() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      // summon two copies of this card
      for _ in 0..2 {
        game.instantiate_and_summon(0, BaseCard::C4023).await;
      }
      game.resolve_triggers().await;

      // 959 Bubbles: {trigger:Inspire {Water}:} Gets {+1hp}.
      let bubbles = game
        .instantiate_and_summon(0, BaseCard::C4067)
        .await
        .unwrap();
      let hp = bubbles.instance(&game, None).unwrap().health;

      let fake_water_card = game.create_card(0, BaseCard::Dummy).await;
      game
        .modify_card(
          fake_water_card,
          vec![
            Modifier::SetElement(Element::Water),
            Modifier::SetCost(1.into()),
          ],
        )
        .await;

      game
        .resolve_card_effect_as_player(fake_water_card, None, 1.into())
        .await;
      game.resolve_triggers().await;

      // make sure we only triggered once!
      assert_eq!(bubbles.instance(&game, None).unwrap().health, hp + 2);
    })
  })
}
