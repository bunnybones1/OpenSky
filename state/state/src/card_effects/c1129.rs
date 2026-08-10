use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game.damage(target, 2, my_id).await;
        for _ in 0..2u8 {
          let id = game.create_card(owner, BaseCard::C20029).await;
          game
            .modify_card_single(id, Modifier::GrantTrait(Trait::Banner))
            .await;
          game.move_to_zone(id, Zone::Hand { public: true }).await;
        }
        if game
          .reveal_from_card(target, |c| c.marked_for_death.is_some())
          .await
        {
          let id = game.create_card(owner, BaseCard::C20029).await;
          game
            .modify_card_single(id, Modifier::GrantTrait(Trait::Banner))
            .await;
          game.move_to_zone(id, Zone::Hand { public: true }).await;
        }
      })
    },
  }
});

#[test]
fn test_vile_deal_slay() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let songbird = game.create_card(0, BaseCard::C20000).await;
      game.move_to_zone(songbird, Zone::Field).await;
      game.resolve_triggers().await;

      let vile_deal = game.create_card(0, BaseCard::C1129).await;
      game
        .move_to_zone(vile_deal, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.context.enable_logs(true);

      game.move_to_zone(vile_deal, Zone::Casting).await;
      game.resolve_triggers().await;
      println!("PLAYING vile_deal");
      game
        .resolve_card_effect_as_player(vile_deal, Some(songbird), 1.into())
        .await;
      game.resolve_triggers().await;

      game.move_to_zone(vile_deal, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let hand_cards = game.hand_cards(0);
      let viles = game
        .filter_cards(hand_cards, |c| c.base() == &BaseCard::C20029)
        .await;
      assert_eq!(viles.len(), 3);
    })
  })
}
