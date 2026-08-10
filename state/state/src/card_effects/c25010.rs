use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Continuous,
    priority: 0,
    is_active: is_in_hero_ability,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        let owner = game.owner(my_id);

        if let Ok(ResolvedPhaseResolveCardEffect {
          id, played_by_unit, ..
        }) = phase.try_into()
        {
          let player = game.owner(id);
          let is_spell = game.reveal_from_card(id, |c| c.is_spell()).await;
          if player != owner || !is_spell || played_by_unit {
            return;
          }

          let ability_max_counters = game
            .reveal_from_card(my_id, |c| c.max_counters)
            .await
            .unwrap();
          game
            .modify_card_single(my_id, Modifier::ModifyCounters(1))
            .await;
          if game.reveal_from_card(my_id, |c| c.counters).await.unwrap() == ability_max_counters {
            game
              .modify_card_single(
                my_id,
                Modifier::ModifyCounters(-i8::from(ability_max_counters)),
              )
              .await;
            queue.add_resolution(move |game| {
              Box::pin(async move {
                let owner = game.owner(my_id);
                game.instantiate_and_summon(owner, BaseCard::C20058).await;
              })
            });
          }
        }
      })
    },
  }
  .into()],
  on_play: OnPlayEffect::None
});

#[test]
fn test_mai_ability_vile() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      game.player_mut(0).hero_ability_base = Some(BaseCard::C25010);
      let hero_abil = game.create_card(0, BaseCard::C25010).await;
      game.move_to_zone(hero_abil, Zone::HeroAbility).await;

      for _ in 0..6 {
        let dummy = game.create_card(0, BaseCard::Dummy).await;
        game.move_to_zone(dummy, Zone::Field).await;
      }
      game.resolve_triggers().await;
      for _ in 0..3 {
        let mana = game.create_card(0, BaseCard::C20017).await;
        game.move_to_zone(mana, Zone::Casting).await;
        game
          .resolve_card_effect_as_player(mana, None, 0.into())
          .await;
        game.move_to_zone(mana, Zone::Graveyard).await;
      }
      game.resolve_triggers().await;

      let dummy = game.field_card(0, 0);
      assert!(game.reveal_from_card(dummy, |c| c.health == 1).await);

      let vile = game.create_card(0, BaseCard::C1129).await;
      game.move_to_zone(vile, Zone::Casting).await;
      game
        .resolve_card_effect_as_player(vile, Some(dummy), 1.into())
        .await;
      game.move_to_zone(vile, Zone::Graveyard).await;
      game.resolve_triggers().await;

      assert_eq!(game.field_cards(0).len(), 7);
    })
  })
}

#[test]
fn test_mai_ability_dust() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      game.player_mut(0).hero_ability_base = Some(BaseCard::C25010);
      let hero_abil = game.create_card(0, BaseCard::C25010).await;
      game.move_to_zone(hero_abil, Zone::HeroAbility).await;

      for _ in 0..6 {
        let dummy = game.create_card(0, BaseCard::Dummy).await;
        game.move_to_zone(dummy, Zone::Field).await;
      }
      game.resolve_triggers().await;
      for _ in 0..3 {
        let mana = game.create_card(0, BaseCard::C20017).await;
        game.move_to_zone(mana, Zone::Casting).await;
        game
          .resolve_card_effect_as_player(mana, None, 0.into())
          .await;
        game.move_to_zone(mana, Zone::Graveyard).await;
        game.resolve_triggers().await;
      }
      assert_eq!(game.field_cards(0).len(), 7);

      let dummy = game.field_card(0, 0);
      assert!(game.reveal_from_card(dummy, |c| c.health == 1).await);

      let dust_spell = game.create_card(0, BaseCard::C4011).await;
      game.move_to_zone(dust_spell, Zone::Casting).await;
      game
        .resolve_card_effect_as_player(dust_spell, Some(dummy), 1.into())
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(dust_spell, Zone::Graveyard).await;
      game.resolve_triggers().await;

      assert_eq!(game.field_cards(0).len(), 7);
    })
  })
}
