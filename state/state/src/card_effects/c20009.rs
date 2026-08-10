use super::effect_helpers::*;

intrinsic_effect!(effect_while_attached!(CardEffect::Frostbite));

attachable_effect!(
  struct Frostbite;,
  FROSTBITE,
  Effect::Unit {
    on_play: None,
    triggers: vec![PhaseModifier {
      effect_type: EffectType::Continuous,
      priority: -1,
      is_active: is_on_field_not_silenced,
      run: |_, my_id, phase, _| Box::pin(async move {
        if let Ok(damage) = <&PhaseDamage>::try_from(phase) {
          if damage.amount > 0 && my_id == damage.target {
            return Some(
              PhaseDamage {
                amount: damage.amount + 2,
                ..*damage
              }
              .into(),
            );
          }
        };
        None
      }),
    }
    .into()]
  }
);

#[test]
fn card_84() -> Result<(), String> {
  // frozen works
  run_test(|mut game| {
    Box::pin(async move {
      let frozen = enchant::FROSTBITE;

      let hero = game.hero_id(1);
      assert_eq!(game.hero(0).power, 1);
      let enemy_starting_hp = hero.instance(&game, None).unwrap().health;
      game.give_spell(hero, frozen).await;
      let hero_0 = game.hero_id(0);

      game.fight(hero_0, hero).await;
      assert_eq!(game.hero(1).health, enemy_starting_hp - 3);
    })
  })?;

  // frozen doesn't go off if dmg was 0
  run_test(|mut game| {
    Box::pin(async move {
      let frozen = enchant::FROSTBITE;

      let hero_0 = game.hero_id(0);
      let hero = game.hero_id(1);
      game
        .modify_card(hero_0, vec![Modifier::SetPower(0.into())])
        .await;
      assert_eq!(game.hero(0).power, 0);
      let enemy_starting_hp = hero.instance(&game, None).unwrap().health;
      game.give_spell(hero, frozen).await;
      game.fight(hero_0, hero).await;
      assert_eq!(game.hero(1).health, enemy_starting_hp);
    })
  })?;

  // frozen happens *before* armor
  run_test(|mut game| {
    Box::pin(async move {
      let frozen = enchant::FROSTBITE;

      let hero_1 = game.hero_id(1);
      game
        .modify_card(hero_1, vec![Modifier::GrantTrait(Trait::Armor)])
        .await;
      let enemy_starting_hp = hero_1.instance(&game, None).unwrap().health;
      game.give_spell(hero_1, frozen).await;

      let hero_0 = game.hero_id(0);
      game.fight(hero_0, hero_1).await;

      assert_eq!(game.hero(1).health, enemy_starting_hp - 2); // 1 + (2 -1)dmg
    })
  })
}
