use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseResolveCardEffect {
          id,
          played_by_unit: false,
          ..
        }) = phase.try_into()
        {
          let my_owner = game.owner(my_id);
          let phase_card_owner = game.owner(id);
          if phase_card_owner != my_owner {
            queue.add_alive_in_play_resolution(my_id, move |game| {
              Box::pin(async move {
                if !game.hand_is_full(my_owner) {
                  game.draw_any_card(my_owner).await;
                } else {
                  game
                    .instantiate_and_run_and_summon(my_owner, BaseCard::C20058, |game, c| {
                      Box::pin(async move {
                        game
                          .modify_card(
                            c,
                            vec![Modifier::SetHealth(3.into()), Modifier::SetPower(3.into())],
                          )
                          .await;
                      })
                    })
                    .await;
                }
              })
            });
          }
        }
      })
    },
  }
  .into()],
  on_play: None
});

#[test]
fn test_fat_cat() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      //fatcat
      game
        .instantiate_and_summon(0, BaseCard::C2116)
        .await
        .unwrap();
      game.resolve_triggers().await;

      let original_hand_len = game.hand_cards(0).len();
      assert_eq!(original_hand_len, 1);

      //test unit
      let dummy = game.create_card(1, BaseCard::Dummy).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(dummy, None, 1.into())
        .await;
      game.resolve_triggers().await;

      let hand_len = game.hand_cards(0).len();
      assert_eq!(hand_len, original_hand_len + 1);

      //test spell
      let turbo = game.create_card(1, BaseCard::C1118).await;
      game.move_to_zone(turbo, Zone::Hand { public: false }).await;
      game.resolve_triggers().await;
      game.move_to_zone(turbo, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(turbo, None, 2.into())
        .await;
      game.move_to_zone(turbo, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let hand_len = game.hand_cards(0).len();
      assert_eq!(hand_len, original_hand_len + 2);

      //test full hand summons micron drone
      let field_size = game.field_cards(0).len();
      assert_eq!(field_size, 2);
      for _ in 0..9 {
        let dummy2 = game.create_card(0, BaseCard::Dummy).await;
        game
          .move_to_zone(dummy2, Zone::Hand { public: false })
          .await;
        game.resolve_triggers().await;
      }
      game.resolve_triggers().await;
      let hand_len = game.hand_cards(0).len();
      assert_eq!(hand_len, 9);

      game.move_to_zone(dummy, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(dummy, None, 1.into())
        .await;
      game.resolve_triggers().await;
      let field_size = game.field_cards(0).len();
      assert_eq!(field_size, 3);
    })
  })
}
