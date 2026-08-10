use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let enemy = enemy(owner);
    let my_top = game
      .graveyard::<&CardInstance<SkyWeaver>>(owner)
      .into_iter()
      .find(|c| c.is_unit())
      .map(|c| (c.id(), c.base().instance().traits.clone()));
    let enemy_top = game
      .graveyard::<&CardInstance<SkyWeaver>>(enemy)
      .into_iter()
      .find(|c| c.is_unit())
      .map(|c| (c.id(), c.base().instance().traits.clone()));

    let mut final_kws: IndexSet<_> = game.reveal_from_card(my_id, |c| c.traits.clone()).await;
    for (id, keywords) in [my_top, enemy_top].iter().flatten() {
      game.dust(*id).await;
      final_kws = final_kws.union(keywords).cloned().collect();
      if final_kws.contains(&Trait::Guard) {
        final_kws.remove(&Trait::Stealth);
      }
    }
    game
      .modify_card(my_id, vec![Modifier::SetTraits(final_kws)])
      .await;
  }))
  .into()],
  on_play: None
});

#[test]
fn test_grubbs_gaining_dash() -> Result<(), String> {
  run_test(|mut game| {
    game.context.enable_logs(false);
    Box::pin(async move {
      //steam knight - Dash 4/4
      let dash_unit = game.create_card(1, BaseCard::C107).await;
      //opal golem Guard 1/3
      let guard_unit = game.create_card(0, BaseCard::C3090).await;
      let enemy_defender = game.create_card(1, BaseCard::C3090).await;

      game.move_to_zone(dash_unit, Zone::Graveyard).await;
      game.move_to_zone(guard_unit, Zone::Graveyard).await;
      game.move_to_zone(enemy_defender, Zone::Field).await;

      game.resolve_triggers().await;

      let grubbs = game
        .instantiate_and_summon(0, BaseCard::C3065)
        .await
        .unwrap();
      game.resolve_triggers().await;

      let final_kws: IndexSet<_> = game.reveal_from_card(grubbs, |c| c.traits.clone()).await;
      assert!(final_kws.contains(&Trait::Guard));
      assert!(final_kws.contains(&Trait::Dash));

      game
        .reveal_from_card(grubbs, |c| {
          assert_eq!(c.attack_state, AttackState::Ready);
          assert!(c.attack_restrictions.contains(&AttackRestriction::Dash));
        })
        .await;
    })
  })
}
