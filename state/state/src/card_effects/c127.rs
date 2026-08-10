use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: xcost_modify!(
    |game, my_id| {
      let owner = game.owner(my_id);
      if game.player(owner).this_turn_stats.hero_attacked {
        -5
      } else {
        0
      }
    },
    AuraLayer::DecreaseCost
  ),
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, _owner| {
      Box::pin(async move {
        let owner = game.owner(my_id);
        let my_cost = game.reveal_from_card(my_id, |c| c.cost).await;
        game
          .draw_into_play(owner, move |c, _| c.cost == my_cost)
          .await;
      })
    },
  }
});

attachable_effect!(
  struct HowlingHorn();,
  HOWLINGHORN,
  Effect::Spell {
    on_play: OnPlayEffect::None,
    triggers: vec![]
  }
);

#[test]
fn test_howling_horn_cost_change() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let howling_horn = game.create_card(0, BaseCard::C127).await;
      let owner = game.owner(howling_horn);
      let enemy_hero = game.hero_id(enemy(owner));
      let my_hero = game.hero_id(game.owner(howling_horn));
      game.fight(my_hero, enemy_hero).await;
      game.resolve_triggers().await;

      game
        .move_to_zone(howling_horn, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      let cost = game.reveal_from_card(howling_horn, |c| c.cost).await;
      assert_eq!(cost, 3);
      game.move_to_zone(howling_horn, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(howling_horn, None, 2.into())
        .await;
      game.move_to_zone(howling_horn, Zone::Graveyard).await;
      game.resolve_triggers().await;
      let cost = game.reveal_from_card(howling_horn, |c| c.cost).await;
      assert_eq!(cost, 8);
    })
  })
}
