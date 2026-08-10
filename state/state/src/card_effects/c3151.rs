use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let enemy = game.lowest_health_character(enemy(owner), |_| true).await;
    if let Some(randomly_selected_enemy) = enemy {
      game.damage(randomly_selected_enemy, 3, my_id).await;
    }
  }))
  .into()],
  on_play: None
});
