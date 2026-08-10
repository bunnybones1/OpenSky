use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, owner| Box::pin(async move {
        let enemy_hero = game.hero_id(enemy(owner));
        game
          .grant_modifier_for_turns(
            enemy_hero,
            my_id,
            Modifier::GrantEffect(CardEffect::AntiMago),
            0,
            2,
          )
          .await;
      })
    }
  ))
});

attachable_effect!(
  struct AntiMago;,
  ANTI_MAGO,
  Effect::Unit {
    triggers: vec![EarlyTrigger {
      effect_type: EffectType::Continuous,
      priority: aura_order(false, AuraLayer::IncreaseCost),
      is_active: |z, _| z.is_field(), // works while silenced.
      run: |game, my_id, phase, _| {
        Box::pin(async move {
          if let Ok(PhaseAuraUpdate) = phase.try_into() {
            let owner = game.owner(my_id);
            game
              .aura_cards_have(
                owner,
                my_id,
                |c| c.is_spell() && c.cost >= 5,
                vec![Modifier::ModifyCost(5)],
                0,
              )
              .await;
          }
        })
      },
    }
    .into()],
    on_play: None
  }
);
