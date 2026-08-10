use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let enemy_units = game.units::<InstanceID>(enemy(owner));
    let highest_hp = enemy_units
      .iter()
      .filter_map(|c| {
        let instance = c.instance(game, None).unwrap();
        if instance.marked_for_death.is_some() {
          None
        } else {
          Some(instance.health)
        }
      })
      .max();
    let high_health_enemy_units: Vec<InstanceID> = enemy_units
      .into_iter()
      .filter(|c| Some(c.instance(game, None).unwrap().health) == highest_hp)
      .collect();

    if let Some(picked_high_hp_enemy_unit) = if high_health_enemy_units.len() > 1 {
      let mut rng = game.context().random().await;
      high_health_enemy_units.choose(&mut rng)
    } else {
      high_health_enemy_units.get(0)
    }
    .copied()
    {
      game.damage(picked_high_hp_enemy_unit, 6, my_id).await;
    }
  }))
  .into()],
  on_play: None
});
