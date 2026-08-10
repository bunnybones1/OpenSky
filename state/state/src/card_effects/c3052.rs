use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_aura!(
    |game, my_id| Box::pin(async move {
      let my_owner = game.owner(my_id);
      let hero_and_units: Vec<InstanceID> = game.characters(my_owner);
      for character in hero_and_units {
        game
          .add_aura_modifier(
            character,
            my_id,
            Modifier::RemoveAttackRestrictions(indexset!(AttackRestriction::GuardOnField)),
            4,
          )
          .await;
      }
    }),
    AuraLayer::RemoveAttackRestriction
  )
  .into()],
  on_play: None
});

#[test]
fn test_blood_dash() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let hunter = game
        .instantiate_and_summon(0, BaseCard::C3052)
        .await
        .unwrap();
      let unit = game
        .instantiate_and_summon(0, BaseCard::Dummy)
        .await
        .unwrap();
      game
        .instantiate_and_run_and_summon(1, BaseCard::Dummy, |game, id| {
          Box::pin(async move {
            game
              .modify_card_single(id, Modifier::GrantTrait(Trait::Guard))
              .await;
          })
        })
        .await
        .unwrap();
      game.resolve_triggers().await;
      game.ready(unit).await;
      game.resolve_triggers().await;

      game
        .modify_card_single(hunter, Modifier::GrantTrait(Trait::Dash))
        .await;
      game.resolve_triggers().await;
      game
        .reveal_from_card(unit, |c| {
          assert_eq!(
            c.attack_restrictions,
            indexset!(AttackRestriction::HeroNotHitStealth)
          )
        })
        .await;
    })
  })
}
