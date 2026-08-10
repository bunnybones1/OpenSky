use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![PhaseModifier {
    effect_type: EffectType::Continuous,
    priority: 0,
    is_active: is_on_field_not_silenced,
    run: |game, my_id, phase, _| Box::pin(async move {
      if let Ok(&PhaseDraw {
        from: (from_player, pool),
        to: (to_player, to_zone),
        ref predicate,
      }) = phase.try_into()
      {
        if to_player != game.owner(my_id) {
          return None;
        }
        let always_predicate = predicate.clone().unwrap_or(std::rc::Rc::new(|_, _| true));
        let cloned_predicate = always_predicate.clone();
        if let Some(min_cost) = game
          .high_cost_in_pool(
            from_player,
            move |c, b| cloned_predicate(c, b),
            pool,
            to_zone,
          )
          .await
        {
          let cloned_predicate = always_predicate.clone();

          return Some(
            PhaseDraw {
              from: (from_player, pool),
              to: (to_player, to_zone),
              predicate: Some(Rc::new(move |c, b| {
                c.cost == min_cost && cloned_predicate(c, b)
              })),
            }
            .into(),
          );
        }
        // if there's nothing matching the cost, we fail anyways.
      }
      None
    }),
  }
  .into()],
  on_play: None
});
