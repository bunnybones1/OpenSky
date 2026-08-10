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
          from,
          to: (card_owner, Zone::Field),
        }) = phase.try_into()
        {
          let owner = game.owner(my_id);
          if from.is_casting() && card_owner == owner && card.id() != Some(my_id) {
            queue.add_alive_in_play_resolution(my_id, move |game| {
              Box::pin(async move {
                game.berf(my_id, 1, 1).await;
              })
            });
          }
        }
      })
    },
  }
  .into()],
  on_play: None
});
