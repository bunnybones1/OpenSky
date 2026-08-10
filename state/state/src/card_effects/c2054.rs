use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let right_ally = game
      .characters::<InstanceID>(owner)
      .into_iter()
      .last()
      .unwrap();
    game.heal(right_ally, 3).await;
  }))
  .into()],
  on_play: None
});
