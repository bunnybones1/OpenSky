use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Continuous,
    priority: 0,
    is_active: |z, _| z.is_graveyard(),
    run: |game, _queue, my_id, phase, _| {
      Box::pin(async move {
        let owner = game.owner(my_id);
        if let Ok(ResolvedPhaseMoveToZone {
          card,
          to: (unit_owner, to_zone),
          from:
            CardLocation {
              location: Some((from_zone, _)),
              ..
            },
        }) = phase.try_into()
        {
          if (matches!(from_zone, Zone::Graveyard))
            && (to_zone.is_field() || to_zone.is_hand())
            && game.reveal_from_card(card, |c| c.is_unit()).await
            && unit_owner == owner
            && card.id() != Some(my_id)
          {
            game
              .run_instant_trigger(BaseCard::C3132, my_id, EffectType::Generic, move |game| {
                Box::pin(async move {
                  game.move_to_zone(my_id, to_zone).await;
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

// rags should not return with bone mask
#[test]
fn test_rags() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let rags = game.create_card(0, BaseCard::C3132).await;
      let bone_mask = game.create_card(0, BaseCard::C3011).await;
      game.move_to_zone(rags, Zone::Graveyard).await;
      game
        .move_to_zone(bone_mask, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(bone_mask, Zone::Casting).await;
      game.resolve_triggers().await;

      game
        .resolve_card_effect_as_player(bone_mask, None, 1.into())
        .await;
      game.move_to_zone(bone_mask, Zone::Graveyard).await;
      game.resolve_triggers().await;
      assert!(game.reveal_from_card(rags, |c| c.zone.is_graveyard()).await);

      let scrap = game.create_card(1, BaseCard::C3110).await;
      game.move_to_zone(scrap, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let glacial_tomb = game.create_card(0, BaseCard::C3017).await;
      game
        .move_to_zone(glacial_tomb, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(glacial_tomb, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(glacial_tomb, None, 4.into())
        .await;
      game.move_to_zone(glacial_tomb, Zone::Graveyard).await;
      game.resolve_triggers().await;
      assert!(game.reveal_from_card(rags, |c| c.zone.is_field()).await);
    })
  })
}
