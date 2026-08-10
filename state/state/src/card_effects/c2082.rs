use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseDraw {
          to: (player, ..),
          drawn_card,
          ..
        }) = phase.try_into()
        {
          let my_owner = game.owner(my_id);
          if player == my_owner && game.reveal_from_card(drawn_card, |c| c.is_unit()).await {
            queue.add_alive_in_play_resolution(my_id, move |game| {
              Box::pin(async move {
                game.berf(drawn_card, 1, 1).await;
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
