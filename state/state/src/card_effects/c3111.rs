use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![
    NormalTrigger {
      effect_type: EffectType::Internal,
      priority: 0,
      is_active: |zone, _card| { matches!(zone, Zone::Hand { public: true }) }, // ignore card, because we still run if silenced
      run: |game, _, my_id, phase, _| {
        Box::pin(async move {
          if let Ok(ResolvedPhaseMoveToZone {
            from:
              CardLocation {
                player,
                location: Some((Zone::Field, _)),
                ..
              },
            to: (_, Zone::Graveyard),
            ..
          }) = phase.try_into()
          {
            if player == game.owner(my_id) {
              game
                .run_instant_trigger(BaseCard::C3111, my_id, EffectType::Generic, move |game| {
                  Box::pin(async move {
                    game
                      .modify_card_single(my_id, Modifier::ModifyCost(-1))
                      .await;
                  })
                })
                .await;
            }
          }
        })
      },
    }
    .into(),
    SecretNormalTrigger {
      effect_type: EffectType::Internal,
      priority: 0,
      is_active: |zone, _card| { matches!(zone, Zone::Hand { public: false }) }, // ignore card, because we still run if silenced
      run: |_game, secret, _random, log, my_id, phase| {
        if let Ok(ResolvedPhaseMoveToZone {
          from:
            CardLocation {
              player,
              location: Some((Zone::Field, _)),
              ..
            },
          to: (_, Zone::Graveyard),
          ..
        }) = phase.try_into()
        {
          if player == secret.player() {
            secret
              .modify_card(my_id, log, |mut card| {
                card.apply_modifier(Modifier::ModifyCost(-1), my_id);
              })
              .unwrap();
          }
        }
      }
    }
    .into(),
  ],
  on_play: None
});
