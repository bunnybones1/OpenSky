use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |_, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseMoveToZone {
          card,
          from,
          to: (_, Zone::Field),
          ..
        }) = phase.try_into()
        {
          if !from.is_field() && card.id() != Some(my_id) {
            queue.add_alive_in_play_resolution(my_id, move |game| {
              Box::pin(async move {
                game.give_spell(card, enchant::SILENCE).await;
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
