use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let enemy = enemy(owner);
    let right_enemy = game
      .characters::<InstanceID>(enemy)
      .into_iter()
      .last()
      .unwrap();
    game.damage(right_enemy, 5, my_id).await;
  }))
  .into()],
  on_play: None
});
