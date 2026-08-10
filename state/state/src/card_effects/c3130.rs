use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseMoveToZone {
          card: dead_card,
          from:
            CardLocation {
              location: Some((Zone::Field, _)),
              ..
            },
          to: (_, Zone::Graveyard),
        }) = phase.try_into()
        {
          let id = match { dead_card.id() } {
            Some(id) => id,
            None => return,
          };
          let owner = game.owner(my_id);
          if game.owner(id) == owner
            && !is_zomboid(*id.instance(game, None).unwrap().base())
            && id != my_id
          {
            queue.add_resolution(move |game| {
              Box::pin(async move {
                game
                  .instantiate_and_run_and_summon(owner, BaseCard::C20013, |game, card| {
                    Box::pin(async move {
                      game
                        .modify_card(card, vec![Modifier::GrantTrait(Trait::Lifesteal)])
                        .await;
                    })
                  })
                  .await;
              })
            })
          }
        }
      })
    },
  }
  .into()],
  on_play: None
});

#[test]
fn test_hordekeeper_inf_loop() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let horde_keeper = game.create_card(0, BaseCard::C3130).await;
      let hexed_prim = game.create_card(0, BaseCard::C1124).await;
      let dummy = game.create_card(0, BaseCard::Dummy).await;
      let cloud_guard = game.create_card(1, BaseCard::C93).await;
      game.move_to_zone(horde_keeper, Zone::Field).await;
      game.move_to_zone(hexed_prim, Zone::Field).await;
      game.move_to_zone(cloud_guard, Zone::Field).await;
      game.resolve_triggers().await;
      game
        .modify_card_single(cloud_guard, Modifier::GrantTrait(Trait::Armor))
        .await;
      game.resolve_triggers().await;
      game.move_to_zone(dummy, Zone::Field).await;
      game.resolve_triggers().await;
      let enemy_hero = game.hero_id(game.owner(cloud_guard));
      let enemy_health = game.reveal_from_card(enemy_hero, |c| c.health).await;
      println!(
        "ENEMY HERO HEALTH {:?}, GRAVE SIZE: {:?}",
        enemy_health,
        game.graveyard_cards(0).len()
      );
    })
  })
}
