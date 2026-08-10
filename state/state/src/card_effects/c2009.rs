use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: xcost_all_your_mana!(),
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, my_id, target_id, owner| {
      Box::pin(async move {
        let cost = my_id.instance(game, None).unwrap().cost;
        let my_mana = game.player(owner).mana;
        if my_mana >= cost {
          game.change_mana(owner, -i32::from(cost)).await;
          game.change_health(target_id, cost.into()).await;
          game
            .modify_card_single(target_id, Modifier::GrantTrait(Trait::Guard))
            .await;
          game.give_spell(target_id, BaseCard::C20019).await;
        }
      })
    },
  }
});

#[test]
fn storms_echo_invest() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      game
        .instantiate_and_summon(0, BaseCard::Dummy)
        .await
        .unwrap();
      let invest = game.create_card(0, BaseCard::C2009).await;
      let storm_echo = game.create_card(0, BaseCard::C4126).await;
      game.set_mana(0, 12).await;

      game.move_to_zone(invest, Zone::Graveyard).await;
      game
        .move_to_zone(storm_echo, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(storm_echo, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(storm_echo, None, 10.into())
        .await;
      game.resolve_triggers().await;

      assert_eq!(game.player(0).mana, 0);
    })
  })
}
