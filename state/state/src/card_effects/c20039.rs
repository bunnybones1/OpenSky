use super::effect_helpers::*;

intrinsic_effect!(effect_while_attached!(CardEffect::Anima));

attachable_effect!(
  struct Anima;,
  ANIMA,
  when_enchant_is_removed_in_play!(|game, my_id| Box::pin(async move {
    game.berf(my_id, 2, 2).await;
  }))
);

#[test]
fn card_840() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let mask = enchant::ANIMA;

      let unit = game.create_card(0, BaseCard::Dummy).await;

      game.summon(unit).await;
      game
        .modify_card(
          unit,
          vec![Modifier::SetPower(3.into()), Modifier::SetHealth(3.into())],
        )
        .await;
      assert_eq!(unit.instance(&game, None).unwrap().power, 3);
      assert_eq!(unit.instance(&game, None).unwrap().health, 3);
      game.give_spell(unit, mask).await;

      assert_eq!(unit.instance(&game, None).unwrap().power, 3);
      assert_eq!(unit.instance(&game, None).unwrap().health, 3);

      let spell = unit.instance(&game, None).unwrap().attachment().unwrap();
      game.dust(spell).await;
      assert_eq!(unit.instance(&game, None).unwrap().power, 5);
      assert_eq!(unit.instance(&game, None).unwrap().health, 5);

      game.give_spell(unit, mask).await;
      assert_eq!(unit.instance(&game, None).unwrap().power, 5);
      assert_eq!(unit.instance(&game, None).unwrap().health, 5);
      game.give_spell(unit, enchant::ROOTS).await;

      assert_eq!(unit.instance(&game, None).unwrap().power, 7);
      assert_eq!(unit.instance(&game, None).unwrap().health, 7);
    })
  })
}
