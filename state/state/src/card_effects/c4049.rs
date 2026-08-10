use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: |game, _, player, _, target| game.player_has_room_for_unit(player)
      && target.instance(game, None).unwrap().is_unit()
      && game.owner(target) == player,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        if game.player_has_room_for_unit(owner) {
          let copy = game.copy_card(target, true).await;
          game
            .modify_card(
              copy,
              vec![Modifier::SetPower(3.into()), Modifier::SetHealth(3.into())],
            )
            .await;
          game.summon(copy).await;
        }
      })
    },
  }
});

#[test]
fn test_illusion_trinketeer_interaction() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let trinketeer = game.create_card(0, BaseCard::C4030).await;
      let illusion = game.create_card(0, BaseCard::C4049).await;
      game.summon(trinketeer).await;

      game
        .move_to_zone(illusion, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game
        .modify_card_single(illusion, Modifier::ModifyCost(-2))
        .await;
      let cost = game.reveal_from_card(illusion, |c| c.cost).await;
      game.move_to_zone(illusion, Zone::Casting).await;

      game
        .resolve_card_effect_as_player(illusion, Some(trinketeer), cost)
        .await;
      game.move_to_zone(illusion, Zone::Graveyard).await;
      game.resolve_triggers().await;
      let field: Vec<_> = game.field_cards(0).clone();
      assert_eq!(field.len(), 3);
      let hand = game.hand_cards(0);
      let filtered_cards = game
        .filter_cards(hand, |c| c.base() == &BaseCard::C4049)
        .await;

      assert_ne!(filtered_cards.len(), 1);
    })
  })
}
