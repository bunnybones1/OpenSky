use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| Box::pin(async move {
      let owner = game.owner(my_id);
      if let Ok(ResolvedPhaseResolveCardEffect {
        id, played_by_unit, ..
      }) = phase.try_into()
      {
        if played_by_unit {
          return;
        }
        if game.owner(id) != owner && game.reveal_from_card(id, |c| c.is_spell()).await {
          let card_base = game.reveal_from_card(id, |c| *c.base()).await;
          queue.add_alive_in_play_resolution(my_id, move |game| {
            Box::pin(async move {
              // Coulter said "do a base copy"
              let copy = game.create_card(owner, card_base).await;
              game
                .move_to_zone(
                  copy,
                  Zone::Attachment {
                    parent: my_id.into(),
                  },
                )
                .await;
            })
          });
        }
      }
    }),
  }
  .into()],
  on_play: None
});
