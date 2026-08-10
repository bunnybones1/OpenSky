use super::effect_helpers::*;

intrinsic_effect!(effect_while_attached!(CardEffect::Shield));

attachable_effect!(
  struct Shield;,
  SHIELD,
  Effect::Unit {
    on_play: None,
    triggers: vec![PhaseModifier {
      effect_type: EffectType::Generic,
      priority: 2, // run after armor!
      is_active: is_on_field_not_silenced,
      run: |game, my_id, phase, _| Box::pin(async move {
        match <&_>::try_from(phase) {
          Ok(PhaseDamage {
            target,
            kind: DamageKind::Combat { is_retaliation },
            amount,
            source,
            is_wither,
            lifesteal_from,
          }) if my_id == *target && *amount > 0 => {
            if let Some(strike_shield) = my_id.instance(game, None).and_then(|c| c.attachment()) {
              game.dust(strike_shield).await;
              return Some(
                PhaseDamage {
                  target: *target,
                  kind: DamageKind::Combat {
                    is_retaliation: *is_retaliation,
                  },
                  amount: 0.into(),
                  source: *source,
                  is_wither: *is_wither,
                  lifesteal_from: *lifesteal_from,
                }
                .into(),
              );
            }
          }
          _ => {}
        }
        None
      }),
    }
    .into()]
  }
);

#[test]
fn card_452() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let p1_hero = game.hero_id(0);
      let p2_hero = game.hero_id(1);
      game.give_spell(p2_hero, enchant::SHIELD).await;
      let p2_hero_hp = game.hero(1).health;
      game.fight(p1_hero, p2_hero).await;
      assert_eq!(game.hero(1).health, p2_hero_hp);
      assert_eq!(game.hero(1).attachment(), None);
    })
  })
}

#[test]
fn card_452_hit_by_0_power_unit_doesnt_pop() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let p1_hero = game.hero_id(0);
      let p2_hero = game.hero_id(1);
      game
        .modify_card(p1_hero, vec![Modifier::SetPower(0.into())])
        .await;
      game.give_spell(p2_hero, enchant::SHIELD).await;
      let p2_hero_hp = game.hero(1).health;
      game.fight(p1_hero, p2_hero).await;
      assert_eq!(game.hero(1).health, p2_hero_hp);
      assert!(game.hero(1).attachment().is_some());
    })
  })
}

#[test]
fn card_452_hit_by_1_power_unit_but_has_armor_does_not_pop() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let p1_hero = game.hero_id(0);
      let p2_hero = game.hero_id(1);
      game.give_spell(p2_hero, enchant::SHIELD).await;
      let p2_hero_hp = game.hero(1).health;
      game
        .modify_card(p2_hero, vec![Modifier::GrantTrait(Trait::Armor)])
        .await;
      assert_eq!(game.hero(1).power, 1);
      game.fight(p1_hero, p2_hero).await;
      assert_eq!(game.hero(1).health, p2_hero_hp);
      assert!(game.hero(1).attachment().is_some());
    })
  })
}
