use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    priority: 0,
    is_active: is_on_field_not_silenced,
    effect_type: EffectType::Generic,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseMoveToZone {
          from:
            CardLocation {
              player,
              location: Some((Zone::Hand { .. }, Some(0))),
            },
          to: (_, Zone::Casting),
          ..
        }) = phase.try_into()
        {
          let owner = game.owner(my_id);
          if player == owner {
            queue.add_alive_in_play_resolution(my_id, move |game| {
              Box::pin(async move {
                game.draw_any_card(owner).await;
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
