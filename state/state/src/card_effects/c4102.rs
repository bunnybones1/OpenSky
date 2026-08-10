use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![
    unit_aura!(
      |game, my_id| Box::pin(async move {
        let owner = game.owner(my_id);
        let enchant: Vec<_> = game
          .characters::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .filter_map(|c| c.attachment())
          .filter(|c| c.instance(game, None).unwrap().is_enchant())
          .collect();
        for ench in enchant {
          game
            .add_aura_modifier(ench, my_id, Modifier::SetCost(1.into()), 0)
            .await;
        }
      }),
      AuraLayer::SetCost
    )
    .into(),
    NormalTrigger {
      effect_type: EffectType::Generic,
      priority: 0,
      is_active: is_on_field_not_silenced,
      run: |game, queue, my_id, phase, _| {
        Box::pin(async move {
          let owner = game.owner(my_id);
          let should_fire = matches!(phase,
            ResolvedPhase::MoveToZone(ResolvedPhaseMoveToZone {
              card,
              from:
                CardLocation {
                  player,
                  location: Some((Zone::Attachment { parent }, _)),
                },
              ..
            }) if player == owner
              && game.reveal_from_card(parent, |c| c.zone.is_field()).await
            && game.reveal_from_card(card, |c| c.is_enchant()).await);

          if should_fire {
            queue.add_resolution(move |g| {
              Box::pin(async move {
                g.berf(my_id, 1, 1).await;
              })
            });
          }
        })
      }
    }
    .into()
  ],
  on_play: None
});
