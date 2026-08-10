use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let enemy_units = game.enemy_units(owner);
        game.give_spell_many(&enemy_units, enchant::HEX).await;

        let enemy_hero = game.hero_id(enemy(game.owner(my_id)));
        let is_enemy_turn = game.current_player != game.owner(my_id);
        game
          .grant_modifier_for_turns(
            enemy_hero,
            my_id,
            Modifier::GrantEffect(CardEffect::IllWill),
            0,
            if is_enemy_turn { 1 } else { 2 },
          )
          .await;
      })
    }
  }
});

attachable_effect!(
  struct IllWill;,
  ILL_WILL,
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
              .aura_cards_have(owner, my_id, |_| true, vec![Modifier::ModifyCost(1)], 0)
              .await;
          }
        })
      },
    }
    .into()],
    on_play: None
  }
);
