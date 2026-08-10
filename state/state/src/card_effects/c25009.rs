use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![],

  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let hero = game.hero_id(owner);
        let num_field_units = game.units::<&CardInstance<SkyWeaver>>(owner).len();

        game
          .grant_modifier_for_turns(
            hero,
            my_id,
            Modifier::GrantEffect(CardEffect::PackLeader(num_field_units / 2)), // int division floors :)
            0,
            1,
          )
          .await;
      })
    }
  }
});

attachable_effect!(
  struct PackLeader(usize);,
  PACK_LEADER,
  Effect::Unit {
    on_play: None,
    triggers: vec![EarlyTrigger {
      effect_type: EffectType::Continuous,
      priority: 0,
      is_active: |_, _| true,
      run: |game, my_id, phase, effect| {
        Box::pin(async move {
          if let (Ok(PhaseAuraUpdate), CardEffect::PackLeader(bonus_buff)) =
            (phase.try_into(), effect)
          {
            let owner = game.owner(my_id);
            let my_hero = game.hero_id(owner);
            let amt = 1 + bonus_buff;
            game
              .add_aura_modifier(my_hero, my_id, Modifier::ModifyPower(amt as i8, None), 0)
              .await;
          }
        })
      },
    }
    .into()],
  }
);

#[test]
fn test_pack_leader() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      assert_eq!(game.hero(0).power, 1);
      for _ in 0..2 {
        game.instantiate_and_summon(0, BaseCard::Dummy).await;
      }
      game.resolve_triggers().await;
      assert_eq!(game.hero(0).power, 1);
      let pack_leader = game.create_card(0, BaseCard::C25009).await;
      game
        .resolve_card_effect_as_player(pack_leader, None, 0.into())
        .await;
      game.resolve_triggers().await;
      assert_eq!(game.hero(0).power, 3);

      game.instantiate_and_summon(0, BaseCard::Dummy).await;
      game.resolve_triggers().await;
      assert_eq!(game.hero(0).power, 3);

      game.instantiate_and_summon(0, BaseCard::Dummy).await;
      game.resolve_triggers().await;
      assert_eq!(game.hero(0).power, 3);
    })
  })
}
