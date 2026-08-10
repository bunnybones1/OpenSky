use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Continuous,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, _queue, my_id, phase, _| {
      Box::pin(async move {
        let owner = game.owner(my_id);
        if let Ok(ResolvedPhaseMoveToZone {
          card,
          to: (unit_owner, Zone::Field),
          from,
        }) = phase.try_into()
        {
          if from.is_casting() && unit_owner == owner && card.id() != Some(my_id) {
            game
              .run_instant_trigger(BaseCard::C148, my_id, EffectType::Generic, move |game| {
                Box::pin(async move {
                  game
                    .modify_card_single(card, Modifier::ModifyPower(1, None))
                    .await;
                })
              })
              .await;
          }
        }
      })
    },
  }
  .into()],
  on_play: None
});

#[test]
fn test_c148() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let c148 = game.create_card(0, BaseCard::C148).await;
      game.move_to_zone(c148, Zone::Field).await;
      game.resolve_triggers().await;
      assert!(game.field_cards(0).len() == 2);
      let c147 = game.create_card(0, BaseCard::C147).await;
      game.move_to_zone(c147, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(c147, None, 0.into())
        .await;
      game.resolve_triggers().await;
      assert!(game.field_cards(0).len() == 4);
    })
  })
}
