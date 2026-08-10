use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: xcost_all_your_mana!(),
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, my_id, target_id, owner| {
      Box::pin(async move {
        let cost = my_id.instance(game, None).unwrap().cost;
        let my_mana = game.player(owner).mana;
        if my_mana >= cost {
          game.change_mana(owner, -i32::from(cost)).await;
          game.berf(target_id, cost.into(), cost.into()).await;
          game
            .grant_modifier_for_turns(
              target_id,
              my_id,
              Modifier::GrantEffect(CardEffect::EtheranLore),
              0,
              1,
            )
            .await;
          game
            .grant_modifier_for_turns(
              target_id,
              my_id,
              Modifier::GrantAttackRestrictions(indexset![AttackRestriction::Dash]),
              0,
              1,
            )
            .await;
        }
      })
    },
  }
});

attachable_effect!(
  struct EtheranLore;,
  ETHERANLORE,
  Effect::Unit {
    on_play: None,
    triggers: vec![PhaseModifier {
      effect_type: EffectType::Internal,
      priority: -1,
      is_active: is_on_field_not_silenced,
      run: |game, my_id, phase, _| Box::pin(async move {
        if let Ok(PhaseAttack {
          attacker, defender, ..
        }) = <&PhaseAttack>::try_from(phase)
        {
          let owner = game.owner(my_id);
          let enemy_hero = game.hero_id(enemy(owner));
          if *attacker == my_id && *defender == enemy_hero {
            return Some(PhaseCancelled.into());
          }
        };
        None
      }),
    }
    .into(),]
  }
);
