use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    for _ in 0..3 {
      game
        .run(PhaseConjure {
          from: owner,
          to: (owner, Zone::Graveyard),
          predicate: Some(Rc::new(|c, _| {
            c.is_unit()
              && c
                .base
                .instance()
                .get_effect_types()
                .any(|e| e == EffectType::Death)
          })),
        })
        .await;
    }
  }))
  .into()],
  on_play: None
});
