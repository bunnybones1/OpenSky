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
          to: (player, Zone::Field),
          from,
        }) = phase.try_into()
        {
          let my_owner = game.owner(my_id);
          if from.is_casting() && card.id() != Some(my_id) && player == my_owner {
            queue.add_alive_in_play_resolution(my_id, move |game| {
              Box::pin(async move {
                game.give_spell(card, BaseCard::C20022).await;
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
