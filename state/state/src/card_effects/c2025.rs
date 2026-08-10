use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let enemy_player = enemy(owner);
    let enemies = game.characters(enemy_player);

    for unit_id in enemies {
      game.sleep(unit_id).await;
    }
  }))
  .into()],
  on_play: None
});
