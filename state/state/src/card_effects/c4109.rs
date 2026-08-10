use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        let owner = game.owner(my_id);
        if let Ok(ResolvedPhaseMoveToZone {
          card,
          from,
          to: (field_owner, Zone::Field),
          ..
        }) = phase.try_into()
        {
          if !from.is_field()
            && field_owner == owner
            && game.reveal_from_card(card, |c| c.cost <= 1).await
          {
            queue.add_alive_in_play_resolution(my_id, move |game| {
              Box::pin(async move {
                game.change_power(card, 1).await;
                game.give_spell(card, BaseCard::C20019).await;
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
fn test_micro_manager_cost_reduction() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let mm = game.create_card(0, BaseCard::C4109).await;
      game.move_to_zone(mm, Zone::Field).await;
      game.resolve_triggers().await;
      let big_friend = game.create_card(0, BaseCard::C4116).await;
      let pre_power = game.reveal_from_card(big_friend, |c| c.power).await;
      for _ in 0..game.reveal_from_card(big_friend, |c| c.cost).await.into() {
        let drone_1c = game.create_card(0, BaseCard::C20058).await;
        game.move_to_zone(drone_1c, Zone::Graveyard).await;
        game.resolve_triggers().await;
      }
      game
        .modify_card_single(big_friend, Modifier::SetCost(0.into()))
        .await;
      game.move_to_zone(big_friend, Zone::Field).await;
      game.resolve_triggers().await;

      assert_eq!(
        pre_power + 1,
        game.reveal_from_card(big_friend, |c| c.power).await
      );
    })
  })
}
