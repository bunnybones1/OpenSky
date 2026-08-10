use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![NormalTrigger {
    effect_type: EffectType::Generic,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, queue, my_id, phase, _| {
      Box::pin(async move {
        if let Ok(ResolvedPhaseMoveToZone {
          card: dead_card,
          from:
            CardLocation {
              location: Some((Zone::Field, _)),
              ..
            },
          to: (_, Zone::Graveyard),
        }) = phase.try_into()
        {
          let id = match { dead_card.id() } {
            Some(id) => id,
            None => return,
          };
          let my_owner = game.owner(my_id);
          if game.owner(id) == my_owner && id != my_id {
            queue.add_resolution(move |game| {
              Box::pin(async move {
                let element = game.reveal_from_card(id, |c| c.element).await;
                game
                  .draw(my_owner, move |c, _| c.element == element && c.is_spell())
                  .await;
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
