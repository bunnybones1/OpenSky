use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let ally_units: Vec<InstanceID> = game
      .units::<&CardInstance<SkyWeaver>>(owner)
      .into_iter()
      .filter(|u| u.marked_for_death.is_none())
      .map_into()
      .collect();
    for unit in ally_units {
      game
        .run(PhaseConjure {
          from: owner,
          to: (
            owner,
            Zone::Attachment {
              parent: unit.into(),
            },
          ),
          predicate: Some(std::rc::Rc::new(|c, _| c.is_spell() && c.cost == 1)),
        })
        .await;
    }
  }))
  .into()],
  on_play: None
});
