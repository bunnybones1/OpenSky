use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let enemy = game.lowest_health_character(enemy(owner), |_| true).await;
    if let Some(randomly_selected_enemy) = enemy {
      game.fight(my_id, randomly_selected_enemy).await;
    }
  }))
  .into()],
  on_play: None
});
