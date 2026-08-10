use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseResolveTrigger {
          id, effect_type, ..
        }) = phase.try_into()
        {
          if effect_type != EffectType::Death || game.owner(id) != game.owner(my_id) {
            return;
          }

          queue.add_resolution(move |game| {
            Box::pin(async move {
              let mut units = vec![my_id.into()];
              if game.reveal_from_card(id, |c| !c.zone.is_graveyard()).await {
                units.push(id.into());
              }
              game.give_spell_many(&units, BaseCard::C20019).await;
            })
          });
        }
      })
    },
  }
  .into()],
  on_play: None
});

#[test]
fn card_3133_with_molten_heart() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let dawn = game
        .instantiate_and_summon(0, BaseCard::C3133)
        .await
        .unwrap();
      let chester = game
        .instantiate_and_summon(0, BaseCard::C3096)
        .await
        .unwrap();
      let molten = game.create_card(0, BaseCard::C3078).await;
      game.resolve_triggers().await;
      game.move_to_zone(molten, Zone::Casting).await;
      game
        .resolve_card_effect_as_player(molten, Some(chester), 3.into())
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(molten, Zone::Graveyard).await;
      game.resolve_triggers().await;
      let dawn_spell = game.reveal_from_card(dawn, move |c| c.attachment()).await;
      let chester_spell = game
        .reveal_from_card(chester, move |c| c.attachment())
        .await;
      assert_eq!(
        dawn_spell.map(|a| *a.instance(&game, None).unwrap().base()),
        Some(BaseCard::C20019)
      );
      assert_eq!(
        chester_spell.map(|a| *a.instance(&game, None).unwrap().base()),
        Some(BaseCard::C20019)
      );
    })
  })
}

#[test]
fn card_3133_with_plume() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let dawn = game
        .instantiate_and_summon(0, BaseCard::C3133)
        .await
        .unwrap();
      let chester = game.create_card(0, BaseCard::C3096).await;
      game.move_to_zone(chester, Zone::Graveyard).await;

      let plume = game.create_card(0, BaseCard::C3099).await;
      game.resolve_triggers().await;
      game.move_to_zone(plume, Zone::Casting).await;
      game
        .resolve_card_effect_as_player(plume, None, 3.into())
        .await;
      game.move_to_zone(plume, Zone::Graveyard).await;
      game.resolve_triggers().await;

      let dawn_spell = game.reveal_from_card(dawn, move |c| c.attachment()).await;
      let chester_spell = game
        .reveal_from_card(chester, move |c| c.attachment())
        .await;

      assert_eq!(
        dawn_spell.map(|a| *a.instance(&game, None).unwrap().base()),
        Some(BaseCard::C20019)
      );
      assert_eq!(
        chester_spell.map(|a| *a.instance(&game, None).unwrap().base()),
        Some(BaseCard::C20019)
      );
    })
  })
}
#[test]
fn card_3133_with_deaths_king() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let dawn = game
        .instantiate_and_summon(0, BaseCard::C3133)
        .await
        .unwrap();
      let chester = game.create_card(0, BaseCard::C3096).await;
      game.move_to_zone(chester, Zone::Field).await;

      let king = game.create_card(0, BaseCard::C3024).await;
      game.resolve_triggers().await;
      game.move_to_zone(king, Zone::Field).await;
      game.resolve_triggers().await;
      let enemy_hero = game.hero_id(1);
      game.fight(king, enemy_hero).await;
      game.resolve_triggers().await;

      let dawn_spell = game.reveal_from_card(dawn, move |c| c.attachment()).await;
      let chester_spell = game
        .reveal_from_card(chester, move |c| c.attachment())
        .await;

      assert_eq!(
        dawn_spell.map(|a| *a.instance(&game, None).unwrap().base()),
        Some(BaseCard::C20019)
      );
      assert_eq!(
        chester_spell.map(|a| *a.instance(&game, None).unwrap().base()),
        Some(BaseCard::C20019)
      );
    })
  })
}
