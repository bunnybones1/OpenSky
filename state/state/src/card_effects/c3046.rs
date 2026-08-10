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
            && Some(&id) == game.player(owner).this_turn_stats.allies_died.get(0)
            && game
              .player(owner)
              .this_turn_stats
              .allies_died
              .iter()
              .filter(|c| c == &&id)
              .collect_vec()
              .len()
              == 1
          {
            queue.add_resolution(move |game| {
              Box::pin(async move {
                game.change_mana(owner, 2).await;
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
fn test_teenage_witch() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let witch = game.create_card(0, BaseCard::C3046).await;
      game.resolve_triggers().await;
      game.move_to_zone(witch, Zone::Field).await;
      game.resolve_triggers().await;

      let dummy = game.create_card(0, BaseCard::Dummy).await;
      let starting_mana = game.players[0].mana;
      game.move_to_zone(dummy, Zone::Field).await;
      game.resolve_triggers().await;
      // kill dummy once
      game.kill(dummy).await;
      game.resolve_triggers().await;

      assert_eq!(starting_mana + 2, game.players[0].mana);

      game.move_to_zone(dummy, Zone::Field).await;
      game.resolve_triggers().await;
      // kill dummy twice
      game.kill(dummy).await;
      game.resolve_triggers().await;

      assert_eq!(starting_mana + 2, game.players[0].mana);
    })
  })
}
