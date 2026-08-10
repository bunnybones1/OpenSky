use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![EarlyTrigger {
    effect_type: EffectType::Generic,
    is_active: is_on_field_not_silenced,
    priority: 0,
    run: |game, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(PhaseAttack { attacker, .. }) = phase.try_into() {
          let owner = game.owner(my_id);
          if game.owner(attacker) == owner && game.reveal_from_card(attacker, |c| c.is_hero()).await
          {
            game.log(crate::client::GameAction::EnterPhase(
              crate::phase::PhaseResolveTrigger {
                id: my_id,
                effect: CardEffect::Intrinsic(BaseCard::C1134),
                effect_type: EffectType::Generic,
                fire: Box::new(move |_| Box::pin(async move {})),
              }
              .into(),
            ));
            game.instantiate_and_summon(owner, BaseCard::C20000).await;

            // manually run aura update since songbird's banner will not apply in time
            game.aura_update().await;

            game.log(crate::client::GameAction::ExitPhase(
              crate::phase::ResolvedPhaseResolveTrigger {
                id: my_id,
                effect: CardEffect::Intrinsic(BaseCard::C1134),
                effect_type: EffectType::Generic,
              }
              .into(),
            ));
          }
        }
      })
    }
  }
  .into()],
  on_play: None
});

#[test]
fn test_overdrive() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);

      let hero_id = game.hero_id(0);
      let enemy_hero_id = game.hero_id(1);
      let enemy_hero_health = game.reveal_from_card(enemy_hero_id, |c| c.health).await;
      game.instantiate_and_summon(0, BaseCard::C1134).await;
      game.resolve_triggers().await;

      game.fight(hero_id, enemy_hero_id).await;
      game.resolve_triggers().await;

      assert_eq!(
        game.reveal_from_card(enemy_hero_id, |c| c.health).await,
        enemy_hero_health - 2
      );
    })
  })
}
