use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: |game, _, player, _, card| {
      let mut enemies = game.enemy_field::<InstanceID>(player).into_iter();
      let left = enemies.next();
      let right = enemies.last();
      Some(card) == left || Some(card) == right
    },
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        let is_left = game.enemy_field::<InstanceID>(owner)[0] == target;
        let mut new_target = target;
        loop {
          game.damage(new_target, 3, my_id).await;
          if new_target
            .instance(game, None)
            .unwrap()
            .marked_for_death
            .is_none()
          {
            // if we didn't kill the target, stop looping.
            return;
          }
          let mut enemies = game
            .enemy_field::<&CardInstance<SkyWeaver>>(owner)
            .into_iter()
            .filter(|c| c.marked_for_death.is_none());
          let maybe_target = if is_left {
            enemies.next()
          } else {
            enemies.last()
          }
          .map(|c| c.id());
          if let Some(target) = maybe_target {
            new_target = target;
          } else {
            return;
          }
        }
      })
    },
  }
});
#[test]
fn card_901() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let trap = BaseCard::C4055;

      let small_unit_1 = game
        .instantiate_and_summon(1, BaseCard::Dummy)
        .await
        .unwrap();
      let small_unit_2 = game
        .instantiate_and_summon(1, BaseCard::Dummy)
        .await
        .unwrap();
      let hero = game.hero_id(1);
      game
        .modify_card(hero, vec![Modifier::SetHealth(1.into())])
        .await;

      let this_id = game.create_card(0, trap).await;
      // a second "normal" unit will summon to the *left* of other units
      game
        .resolve_card_effect_as_player(this_id, Some(small_unit_2), 0.into())
        .await;

      assert!(small_unit_1
        .instance(&game, None)
        .unwrap()
        .marked_for_death
        .is_some());
      assert!(small_unit_2
        .instance(&game, None)
        .unwrap()
        .marked_for_death
        .is_some());
      assert!(game.hero(1).marked_for_death.is_some());
    })
  })
}
