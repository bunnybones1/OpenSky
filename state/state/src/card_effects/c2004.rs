use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.is_spell(),
    |game, my_id, _phase| Box::pin(async move {
      game.conjure_spell_onto(my_id, |_, _| true).await;
    })
  )
  .into()],
  on_play: None
});

#[test]
fn card_110() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let mask = BaseCard::C2004;

      let c = game.create_card(0, mask).await;
      game.summon(c).await;
      let og_spell = c.instance(&game, None).unwrap().attachment();
      let spell = game.fake_spell().await;
      game
        .resolve_card_effect_as_player(spell, None, 0.into())
        .await;
      game.resolve_triggers().await;
      assert_ne!(c.instance(&game, None).unwrap().attachment(), og_spell);
    })
  })
}
