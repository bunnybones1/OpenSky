use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let right_enemy = game
      .enemy_field::<InstanceID>(owner)
      .into_iter()
      .last()
      .unwrap();
    game.fight(my_id, right_enemy).await;
  }))
  .into()],
  on_play: None
});
