use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| Box::pin(async move {
      let owner = game.owner(my_id);
      if game.current_player != owner {
        return;
      }
      if let Ok(ResolvedPhaseAttack {
        attacker, defender, ..
      }) = phase.try_into()
      {
        if attacker == game.hero_id(owner) {
          queue.add_alive_in_play_resolution(my_id, move |game| {
            Box::pin(async move {
              game.fight(my_id, defender).await;
            })
          })
        }
      }
    }),
  }
  .into()],
  on_play: None
});

#[test]
fn card_1117() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let wukin = game
        .instantiate_and_summon(0, BaseCard::C1117)
        .await
        .unwrap();

      let large_unit = game
        .instantiate_and_summon(1, BaseCard::Dummy)
        .await
        .unwrap();
      let hero = game.hero_id(0);
      game
        .modify_card(
          large_unit,
          vec![Modifier::SetHealth(10.into()), Modifier::SetPower(4.into())],
        )
        .await;
      game.resolve_triggers().await;

      // a second "normal" unit will summon to the *left* of other units
      game.fight(hero, large_unit).await;
      game.resolve_triggers().await;
      assert_eq!(large_unit.instance(&game, None).unwrap().health, 4);
      assert_eq!(wukin.instance(&game, None).unwrap().health, 3);
    })
  })
}
