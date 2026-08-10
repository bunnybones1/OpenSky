use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseMoveToZone {
          card,
          from:
            CardLocation {
              player: field_owner,
              location: Some((Zone::Field, _)),
            },
          to: (_, Zone::Graveyard),
          ..
        }) = phase.try_into()
        {
          let id = card.id().unwrap(); // safe to unwrap, cause we're going to graveyard.
          let owner = game.owner(my_id);
          if field_owner == owner {
            let attached_id = game
              .reveal_from_card(id, |c| c.attachment.map(|a| a.id()))
              .await;
            if let Some(attached_id) = attached_id {
              let is_spell = game.reveal_from_card(attached_id, |c| c.is_spell()).await;
              if is_spell {
                queue.add_resolution(move |game| {
                  Box::pin(async move {
                    game
                      .move_to_zone(attached_id, Zone::Hand { public: true })
                      .await;
                  })
                });
              }
            }
          }
        }
      })
    },
  }
  .into()],
  on_play: None
});
