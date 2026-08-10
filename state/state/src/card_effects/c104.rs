use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        let owner = game.owner(my_id);
        if let Ok(ResolvedPhaseMoveToZone {
          card,
          from,
          to: (field_owner, Zone::Field),
          ..
        }) = phase.try_into()
        {
          if !from.is_field() && field_owner == owner && card.id() != Some(my_id) {
            queue.add_alive_in_play_resolution(my_id, move |game| {
              Box::pin(async move {
                game.give_spell(card, enchant::ANIMA).await;
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
