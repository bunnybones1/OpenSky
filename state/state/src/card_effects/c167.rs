use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![
    NormalTrigger {
      effect_type: EffectType::Generic,
      is_active: is_on_field_not_silenced,
      priority: 0,
      run: |game, queue, my_id, phase, _| {
        Box::pin(async move {
          if let Ok(ResolvedPhaseModifyCard {
            card,
            modifier: Modifier::ModifyPower(amount, _),
            ..
          }) = phase.try_into()
          {
            let owner = game.owner(my_id);

            if game
              .reveal_from_card(card, move |c| c.zone.is_field() && c.owner == owner)
              .await
              && amount > 0
            {
              queue.add_resolution(move |game| {
                Box::pin(async move {
                  let owner = game.owner(my_id);
                  let random_enemies = game.enemy_units(owner);
                  game
                    .smart_random_decrease_hp(amount.into(), random_enemies)
                    .await;
                })
              });
            }
          }
        })
      }
    }
    .into(),
    EarlyTrigger {
      effect_type: EffectType::Generic,
      is_active: is_on_field_not_silenced,
      priority: 0,
      run: |game, my_id, phase, _| {
        Box::pin(async move {
          if let Ok(PhaseModifyCard {
            card,
            modifier: Modifier::SetPower(amount),
            ..
          }) = phase.try_into()
          {
            let owner = game.owner(my_id);

            if game
              .reveal_from_card(card, move |c| {
                c.zone.is_field() && c.owner == owner && c.power < amount
              })
              .await
            {
              let delta = amount - game.reveal_from_card(card, |c| c.power).await;
              let owner = game.owner(my_id);
              let random_enemies = game.enemy_units(owner);

              game.log(crate::client::GameAction::EnterPhase(
                crate::phase::PhaseResolveTrigger {
                  id: my_id,
                  effect: CardEffect::Intrinsic(BaseCard::C167),
                  effect_type: EffectType::Generic,
                  fire: Box::new(move |_| Box::pin(async move {})),
                }
                .into(),
              ));

              game.smart_random_decrease_hp(delta, random_enemies).await;
              game.log(crate::client::GameAction::ExitPhase(
                crate::phase::ResolvedPhaseResolveTrigger {
                  id: my_id,
                  effect: CardEffect::Intrinsic(BaseCard::C167),
                  effect_type: EffectType::Generic,
                }
                .into(),
              ));
            }
          }
        })
      }
    }
    .into()
  ],
  on_play: None
});

#[test]
fn test_shaman_scrapstrosity() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let shaman = game.create_card(0, BaseCard::C167).await;
      game.move_to_zone(shaman, Zone::Field).await;
      game.resolve_triggers().await;

      let birb1 = game.create_card(0, BaseCard::C2070).await;
      game.move_to_zone(birb1, Zone::Graveyard).await;
      let birb2 = game.create_card(0, BaseCard::C2070).await;
      game.move_to_zone(birb2, Zone::Graveyard).await;

      let dummy = game.create_card(1, BaseCard::Dummy).await;
      game.move_to_zone(dummy, Zone::Field).await;
      game.resolve_triggers().await;

      let hero = game.hero_id(0);

      let scrap = game.create_card(0, BaseCard::C3110).await;
      game.move_to_zone(scrap, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(scrap, Some(hero), 7.into())
        .await;
      game.resolve_triggers().await;
      assert_eq!(game.field_cards(1).len(), 1);
    })
  })
}
