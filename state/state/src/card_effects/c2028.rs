use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.element == Element::Earth,
    |game, my_id, _phase| Box::pin(async move {
      let owner = game.owner(my_id);
      let hero = game.hero_id(owner);
      game.change_health(hero, 1).await;
      game.change_mana_next_turn(owner, 1, my_id).await;
    })
  )
  .into()],
  on_play: None
});

#[test]
fn card_475() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let aya = BaseCard::C2028;
      game.instantiate_and_summon(0, aya).await;
      let c = game.create_card(0, BaseCard::Dummy).await;
      game
        .modify_card(c, vec![Modifier::SetElement(Element::Earth)])
        .await;

      let orig_mana = game.player(0).mana;
      game.resolve_card_effect_as_player(c, None, 0.into()).await;
      game.resolve_triggers().await;
      game.pass_turn().await;
      game.resolve_triggers().await;

      game.pass_turn().await;
      game.resolve_triggers().await;

      assert_eq!(game.player(0).mana, orig_mana + 1 + 1);
    })
  })
}
