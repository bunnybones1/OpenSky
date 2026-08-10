use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::Untargeted {
      mutate: |game, my_id, _owner| {
        Box::pin(async move {
          let owner = game.owner(my_id);
          let hero = game.hero_id(owner);
          game
            .grant_modifier_for_turns(
              hero,
              my_id,
              Modifier::GrantEffect(CardEffect::Lorekeeper(my_id)),
              0,
              1,
            )
            .await;
        })
      },
    }
  }))
});

attachable_effect!(
  struct Lorekeeper(InstanceID);,
  LOREKEEPER,
  Effect::Unit {
    on_play: None,
    triggers: vec![
      NormalTrigger {
        effect_type: EffectType::Internal,
        priority: aura_order(false, AuraLayer::IncreaseCost),
        is_active: is_on_field_not_silenced,
        run: |game, _queue, my_id, phase, card_effect| {
          Box::pin(async move {
            if let (
              Ok(ResolvedPhaseResolveCardEffect {
                id, played_by_unit, ..
              }),
              CardEffect::Lorekeeper(source),
            ) = (phase.try_into(), card_effect)
            {
              if played_by_unit {
                return;
              }
              let cast_owner = game.owner(id);
              let owner = game.owner(my_id);
              if cast_owner != owner {
                return;
              }
              let hero = game.hero_id(owner);

              game.remove_modifiers_from_source(hero, source).await;
            }
          })
        },
      }
      .into(),
      unit_aura!(
        |game, my_id| Box::pin(async move {
          let owner = game.owner(my_id);
          let hand_len = game.hand_cards(owner).len();
          game
            .aura_cards_have(
              owner,
              my_id,
              |_| true,
              vec![Modifier::ModifyCost(-(hand_len as i8))],
              0,
            )
            .await;
        }),
        AuraLayer::IncreaseCost
      )
      .into()
    ]
  }
);
