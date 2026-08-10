use super::effect_helpers::*;
intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, my_id, target, _| {
      Box::pin(async move {
        game.give_spell(target, enchant::HEX).await;
        let all_chars = game.all_characters::<InstanceID>();
        let turn_count = game.turn_count;
        for unit in &all_chars {
          let e_id = unit.instance(game, None).unwrap().attachment();
          if let Some(e_id) = e_id {
            if e_id.instance(game, None).unwrap().is_enchant() {
              game
                .modify_card_single(e_id, Modifier::GrantTrait(Trait::Wither))
                .await;
            }
          }
        }

        for unit in all_chars {
          let owner = game.owner(unit);
          let sunrise: ResolvedPhase = ResolvedPhaseStartTurn {
            player: owner,
            turn_count,
          }
          .into();
          let sunset: ResolvedPhase = ResolvedPhaseEndTurn {
            player: owner,
            turn_count,
          }
          .into();

          let triggers = game.get_active_public_triggers().2;
          for trigger in triggers
            .into_iter()
            .filter(|trigger| {
              trigger.card_effect().source_card().instance().is_enchant()
                && trigger.instance() == unit
                && matches!(
                  trigger.get().effect_type,
                  EffectType::Sunrise | EffectType::Sunset
                )
            })
            .collect_vec()
          {
            let mut queue = Queue::default();
            let run = trigger.get().run;
            run(
              game,
              &mut queue,
              unit,
              sunrise.clone(),
              trigger.card_effect(),
            )
            .await;
            run(
              game,
              &mut queue,
              unit,
              sunset.clone(),
              trigger.card_effect(),
            )
            .await;
            for item in queue.into_inner() {
              game
                .run_instant_trigger(BaseCard::C3103, my_id, trigger.get().effect_type, |game| {
                  item(game)
                })
                .await;
            }
          }
        }
      })
    },
  }
});

#[test]
fn test_bewitching_brew_triggers_sunset_sunrise() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let pre_hand_size = game.hand_cards(0).len();
      game.context.enable_logs(false);
      let unit = game.create_card(0, BaseCard::C1070).await;
      let unit2 = game.create_card(0, BaseCard::C22).await;
      game.summon(unit).await;
      game.summon(unit2).await;
      game.give_spell(unit, enchant::HEX).await;
      let brew = game.create_card(0, BaseCard::C3103).await;

      game.move_to_zone(brew, Zone::Hand { public: false }).await;
      game.resolve_triggers().await;
      game.move_to_zone(brew, Zone::Casting).await;

      game
        .resolve_card_effect_as_player(brew, Some(unit2), (0i8).into())
        .await;
      game.move_to_zone(brew, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let graveyard: Vec<_> = game.graveyard::<InstanceID>(0);
      let post_hand_size = game.hand_cards(0).len();
      assert_eq!(graveyard.len(), 3);
      assert!(graveyard.contains(&unit));
      assert!(graveyard.contains(&unit2));

      assert_eq!(post_hand_size, pre_hand_size);
    })
  })
}
