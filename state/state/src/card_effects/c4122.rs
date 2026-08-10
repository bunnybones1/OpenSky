use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_slay!(|game, my_id, _target| Box::pin(async move {
    let owner = game.owner(my_id);
    let hero = game.hero_id(owner);

    game
      .add_modifier(
        hero,
        my_id,
        Modifier::GrantEffect(CardEffect::HexedSiren(my_id)),
        true,
        0,
      )
      .await;
  }))
  .into()],
  on_play: None
});

attachable_effect!(
  struct HexedSiren(InstanceID);,
  HEXEDSIREN,
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
              CardEffect::HexedSiren(source),
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
              let cost = game
                .reveal_from_card(id, |c| c.base().instance().cost)
                .await;
              let is_spell = game.reveal_from_card(id, |c| c.is_spell()).await;

              if cost >= 6 && is_spell {
                game.remove_modifiers_from_source(hero, source).await;
              }
            }
          })
        },
      }
      .into(),
      unit_aura!(
        |game, my_id| Box::pin(async move {
          let owner = game.owner(my_id);
          game
            .aura_cards_have(
              owner,
              my_id,
              |c| c.is_spell() && c.base().instance().cost >= 6,
              vec![Modifier::ModifyCost(-1)],
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

#[test]
fn test_hexed_siren() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      game.context.enable_logs(false);
      let surit = game.create_card(0, BaseCard::C4122).await;
      let my_7c_spell = game.create_card(0, BaseCard::C2035).await;
      let enemy_7c_spell = game.create_card(1, BaseCard::C2035).await;
      let crypto = game.create_card(1, BaseCard::C3051).await;
      let base_tts_cost = game.reveal_from_card(my_7c_spell, |c| c.cost).await;
      game.move_to_zone(surit, Zone::Field).await;
      game.move_to_zone(crypto, Zone::Field).await;
      game
        .move_to_zone(my_7c_spell, Zone::Hand { public: false })
        .await;
      game
        .move_to_zone(enemy_7c_spell, Zone::Hand { public: false })
        .await;
      game.resolve_triggers().await;
      game.fight(surit, crypto).await;
      game.resolve_triggers().await;
      assert_eq!(
        game.reveal_from_card(my_7c_spell, |c| c.cost).await,
        base_tts_cost - 1
      );

      game.move_to_zone(enemy_7c_spell, Zone::Casting).await;
      game.resolve_triggers().await;
      game
        .resolve_card_effect_as_player(enemy_7c_spell, None, 10.into())
        .await;
      game.move_to_zone(enemy_7c_spell, Zone::Graveyard).await;
      game.resolve_triggers().await;

      assert_eq!(
        game.reveal_from_card(my_7c_spell, |c| c.cost).await,
        base_tts_cost - 1
      );
    })
  })
}
