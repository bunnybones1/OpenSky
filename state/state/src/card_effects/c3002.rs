use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let damage = 3;
    let all_units: Vec<_> = game
      .all_units()
      .into_iter()
      .filter(|id| *id != my_id)
      .collect();

    game.damage_many(&all_units, damage, my_id).await;
  }))
  .into()],
  on_play: None
});

#[test]
fn card_44() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let this_unit = BaseCard::C3002;

      let unit = game.create_card(0, BaseCard::Dummy).await;
      let owner = game.owner(unit);

      game.summon(unit).await;
      game
        .modify_card(
          unit,
          vec![Modifier::SetPower(4.into()), Modifier::SetHealth(4.into())],
        )
        .await;
      game.instantiate_and_summon(owner, this_unit).await;
      game.resolve_triggers().await;
      assert!(unit.instance(&game, None).unwrap().power == 1);
      assert!(unit.instance(&game, None).unwrap().health == 1);
    })
  })
}
