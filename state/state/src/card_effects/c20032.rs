use super::effect_helpers::*;

intrinsic_effect!(effect_while_attached!(CardEffect::Dazed));

attachable_effect!(
  struct Dazed;,
  DAZED,
  Effect::Unit {
    on_play: None,
    triggers: vec![NormalTrigger {
      effect_type: EffectType::Sunrise,
      priority: -1,
      is_active: is_on_field_not_silenced,
      run: |game, queue, my_id, phase, _| {
        Box::pin(async move {
          if let Ok(ResolvedPhaseStartTurn { player, .. }) = phase.try_into() {
            if player == game.owner(my_id) {
              let dazed_id = my_id.instance(game, None).unwrap().attachment().unwrap();
              queue.add_resolution(move |game| {
                Box::pin(async move {
                  game.sleep(my_id).await;
                  game.dust(dazed_id).await;
                })
              })
            }
          }
        })
      },
    }
    .into()]
  }
);

#[test]
fn card_653() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let hero = game.hero_id(0);
      game.give_spell(hero, enchant::DAZED).await;
      game.pass_turn().await;
      game.pass_turn().await;
      game.resolve_triggers().await;
      assert_eq!(game.hero(0).attack_state, AttackState::Sleeping);
    })
  })
}
