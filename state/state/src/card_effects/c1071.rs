use super::effect_helpers::*;

fn update_oni_effect(game: &mut LiveGame<'_>, owner: Player) {
  let oni_is_on_field = game
    .units::<&CardInstance<SkyWeaver>>(owner)
    .into_iter()
    .any(|c| *c.base() == BaseCard::C1071);
  game.player_mut(owner).glory_repeat = if oni_is_on_field { 2 } else { 1 };
}

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_aura!(
    |game, my_id| Box::pin(async move {
      let owner = game.owner(my_id);
      update_oni_effect(game, owner);
    }),
    AuraLayer::Internal
  )
  .into()],
  on_play: None
});

#[test]
fn card_1071_quest_triggers_twice() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let oni = game
        .instantiate_and_summon(0, BaseCard::C1071)
        .await
        .unwrap();
      // Activate Oni Aura
      game.resolve_triggers().await;
      assert_eq!(
        *oni
          .instance(&game, None)
          .unwrap()
          .attachment()
          .unwrap()
          .instance(&game, None)
          .unwrap()
          .base(),
        enchant::FURY
      );

      let hand_size = game.player_cards(0).hand().len();
      let hero_id = game.hero_id(1);
      game
        .run(PhaseAttack {
          attacker: oni,
          defender: hero_id,
        })
        .await;

      game.resolve_triggers().await;
      assert_eq!(game.player_cards(0).hand().len(), hand_size + 2);
    })
  })
}
