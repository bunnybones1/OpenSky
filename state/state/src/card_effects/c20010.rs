use super::effect_helpers::*;

intrinsic_effect!(effect_while_attached!(CardEffect::Roots));

attachable_effect!(
  struct Roots;,
  ROOTS,
  Effect::Unit {
    on_play: None,
    triggers: vec![
      unit_aura!(
        |game, my_id| Box::pin(async move {
          if game
            .reveal_from_card(my_id, |c| c.attack_state != AttackState::Sleeping)
            .await
          {
            game
              .add_aura_modifier(
                my_id,
                my_id,
                Modifier::SetAttackState(AttackState::Exhausted),
                2,
              )
              .await;
          }
        }),
        AuraLayer::Exhaust,
        true
      )
      .into(),
      PhaseModifier {
        effect_type: EffectType::Internal,
        priority: -1,
        is_active: is_on_field_not_silenced,
        run: |_, my_id, phase, _| Box::pin(async move {
          if let Ok(PhaseAttack { attacker, .. }) = <&PhaseAttack>::try_from(phase) {
            if *attacker == my_id {
              return Some(PhaseCancelled.into());
            }
          };
          None
        }),
      }
      .into(),
    ]
  }
);

#[test]
fn card_104() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let roots = enchant::ROOTS;

      let unit = game.create_card(0, BaseCard::Dummy).await;

      game.summon(unit).await;
      game.ready(unit).await;
      assert_eq!(
        unit.instance(&game, None).unwrap().attack_state,
        AttackState::Ready
      );

      game.give_spell(unit, roots).await;
      assert_eq!(
        *unit
          .instance(&game, None)
          .unwrap()
          .attachment()
          .unwrap()
          .instance(&game, None)
          .unwrap()
          .base(),
        roots
      );
      game.resolve_triggers().await;
      assert_eq!(
        unit.instance(&game, None).unwrap().attack_state,
        AttackState::Exhausted
      );

      let roots_id = unit.instance(&game, None).unwrap().attachment().unwrap();
      game.dust(roots_id).await;
      game.resolve_triggers().await;
      assert_eq!(
        unit.instance(&game, None).unwrap().attack_state,
        AttackState::Ready
      );
    })
  })
}

#[test]
fn unit_with_roots_returns_from_grave_and_still_works() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let unit_with_roots = BaseCard::iter()
        .find(|c| c.attached_spell() == Some(enchant::ROOTS) && c.instance().effects.is_empty())
        .expect("WTF? No cards have roots.");

      let unit = game
        .instantiate_and_summon(0, unit_with_roots)
        .await
        .unwrap();

      game.kill(unit).await;
      game.resolve_triggers().await;
      game.summon(unit).await;
      game.ready(unit).await;
      game.resolve_triggers().await;
      assert_eq!(
        unit.instance(&game, None).unwrap().attack_state,
        AttackState::Exhausted
      );
    })
  })
}

#[test]
fn roots_prevents_auto_attacks() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let unit_with_roots = BaseCard::iter()
        .find(|c| {
          c.attached_spell() == Some(enchant::ROOTS)
            && c.instance().get_effect_types().count() == 0
            && c.instance().power > 0
        })
        .expect("WTF? No cards have roots.");

      let unit = game
        .instantiate_and_summon(0, unit_with_roots)
        .await
        .unwrap();

      let hero = game.hero_id(1);
      let hero_hp = game.hero(1).health;
      game.fight(unit, hero).await;
      game.resolve_triggers().await;

      assert_eq!(hero_hp, game.hero(1).health);
    })
  })
}
