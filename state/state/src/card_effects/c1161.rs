use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![
    unit_death!(|game, my_id, _phase| Box::pin(async move {
      let owner = game.owner(my_id);
      if game
        .hero(owner)
        .effects
        .iter()
        .any(|m| matches!(&m, CardEffect::MagmaHarrier))
        && game.player_has_room_for_unit(owner)
      {
        game.move_to_zone(my_id, Zone::Field).await;
      }
    }))
    .into(),
    NormalTrigger {
      effect_type: EffectType::Continuous,
      priority: 0,
      is_active: is_on_field_not_silenced,
      run: |game, _, my_id, phase, _| {
        Box::pin(async move {
          let owner = game.owner(my_id);
          if let Ok(ResolvedPhaseAttack { attacker, .. }) = phase.try_into() {
            if attacker != my_id {
              return;
            }
            let hero = game.hero_id(owner);
            game
              .grant_modifier_for_turns(
                hero,
                my_id,
                Modifier::GrantEffect(CardEffect::MagmaHarrier),
                0,
                1,
              )
              .await;
          }
        })
      },
    }
    .into()
  ],
  on_play: None
});

attachable_effect!(
  struct MagmaHarrier;,
  MAGMA_HARRIER,
  Effect::Unit {
    triggers: vec![],
    on_play: None
  }
);
#[test]
fn test_magma_harrier() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let magma = game.create_card(0, BaseCard::C1161).await;
      game.move_to_zone(magma, Zone::Field).await;
      game.resolve_triggers().await;
      let init_field = game.field_cards(0).len();
      let enemy_hero = game.hero_id(1);
      game.fight(magma, enemy_hero).await;
      game.resolve_triggers().await;
      game.kill(magma).await;
      game.resolve_triggers().await;

      assert_eq!(init_field, game.field_cards(0).len());
    })
  })
}
