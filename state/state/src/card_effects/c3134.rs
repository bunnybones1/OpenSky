use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let enemy = game
      .lowest_health_character(enemy(owner), |c| c.is_unit())
      .await;
    if let Some(randomly_selected_enemy) = enemy {
      game.kill(randomly_selected_enemy).await;
    }
  }))
  .into()],
  on_play: None
});
