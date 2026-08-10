use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseMoveToZone {
          from:
            CardLocation {
              location: Some((Zone::Attachment { parent }, _)),
              ..
            },
          to: (player, Zone::Casting),
          ..
        }) = phase.try_into()
        {
          let my_owner = game.owner(my_id);
          if player == my_owner
            && parent
              .id()
              .map(|id| id.instance(game, None).unwrap().is_unit())
              .unwrap_or(false)
          {
            queue.add_alive_in_play_resolution(my_id, move |game| {
              Box::pin(async move {
                game.berf(parent, 1, 1).await;
              })
            });
          };
        }
      })
    },
  }
  .into()],
  on_play: None
});
