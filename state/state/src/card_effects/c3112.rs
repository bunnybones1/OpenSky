use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    is_active: |z, _| z.is_graveyard(),
    priority: 0,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseMoveToZone {
          card: dead_card,
          from:
            CardLocation {
              location: Some((Zone::Field, _)),
              ..
            },
          to: (_, Zone::Graveyard),
        }) = phase.try_into()
        {
          let id = match { dead_card.id() } {
            Some(id) => id,
            None => return,
          };
          if game.owner(id) == game.owner(my_id) {
            let unit_traits = game.reveal_from_card(id, |c| c.traits.clone()).await;
            queue.add_resolution(move |game| {
              Box::pin(async move {
                if !game
                  .reveal_from_card(my_id, |c| c.zone.is_graveyard())
                  .await
                {
                  return;
                }
                let modifiers = unit_traits
                  .into_iter()
                  .map(Modifier::GrantTrait)
                  .chain(vec![Modifier::SetCost(2.into())])
                  .collect_vec();
                let hero = game.hero_id(game.owner(my_id));
                game
                  .move_to_zone(
                    my_id,
                    Zone::Attachment {
                      parent: hero.into(),
                    },
                  )
                  .await;
                game.modify_card(my_id, modifiers).await;
              })
            })
          }
        }
      })
    }
  }
  .into()],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, my_id, target, _| {
      Box::pin(async move {
        let my_traits = game.reveal_from_card(my_id, |c| c.traits.clone()).await;
        let modifiers = many![
          Modifier::ModifyPower(1, None),
          Modifier::ModifyHealth(1, None)
        ]
        .chain(my_traits.into_iter().map(Modifier::GrantTrait))
        .collect_vec();
        game.modify_card(target, modifiers).await;
      })
    }
  },
});

#[test]
fn test_tireless_iteration() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let some_unit = game
        .instantiate_and_summon(0, BaseCard::Dummy)
        .await
        .unwrap();
      assert_eq!(
        game.reveal_from_card(some_unit, |c| c.traits.len()).await,
        0,
        "Dummy card should not have traits."
      );
      let iteration = game.create_card(0, BaseCard::C3112).await;
      assert_eq!(
        game.reveal_from_card(iteration, |c| c.traits.len()).await,
        0,
        "Iteration should not have traits."
      );
      game
        .modify_card(
          iteration,
          vec![
            Modifier::GrantTrait(Trait::Armor),
            Modifier::GrantTrait(Trait::Guard),
          ],
        )
        .await;
      assert_eq!(
        game.reveal_from_card(iteration, |c| c.traits.len()).await,
        2,
        "Iteration should have traits."
      );
      game.move_to_zone(iteration, Zone::Casting).await;
      game
        .resolve_card_effect_as_player(iteration, Some(some_unit), 0.into())
        .await;
      game.resolve_triggers().await;
      assert_eq!(
        game
          .reveal_from_card(some_unit, |c| c.traits.clone())
          .await
          .into_iter()
          .collect_vec(),
        vec![Trait::Armor, Trait::Guard],
        "Unit should get tireless iteration's traits"
      );

      game.move_to_zone(iteration, Zone::Graveyard).await;
      game.resolve_triggers().await;
      assert_eq!(
        game.reveal_from_card(iteration, |c| c.traits.len()).await,
        0,
        "Iteration should not have traits after going to graveyard."
      );

      game.kill(some_unit).await;
      game.resolve_triggers().await;

      assert!(
        game
          .reveal_from_card(iteration, |c| c.zone.is_attachment())
          .await,
        "Iteration should come out of graveyard."
      );
      assert_eq!(
        game.reveal_from_card(iteration, |c| c.cost).await,
        2,
        "Iteration should come out of graveyard."
      );

      assert_eq!(
        game.reveal_from_card(iteration, |c| c.traits.len()).await,
        2,
        "Iteration should have traits after coming out of graveyard."
      );
    })
  })
}
