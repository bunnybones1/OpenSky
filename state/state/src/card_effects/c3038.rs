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
          let owner = game.owner(my_id);
          if game.owner(id) == owner
            && Some(&id) == game.player(owner).this_turn_stats.allies_died.get(0)
            && game
              .player(owner)
              .this_turn_stats
              .allies_died
              .iter()
              .filter(|c| c == &&id)
              .collect_vec()
              .len()
              == 1
          {
            queue.add_resolution(move |game| {
              Box::pin(async move {
                game
                  .draw_low_cost(owner, (owner, Zone::Hand { public: false }), |c, _| {
                    c.element == Element::Dark
                  })
                  .await;
              })
            })
          }
        }
      })
    },
  }
  .into()],
  on_play: None
});
