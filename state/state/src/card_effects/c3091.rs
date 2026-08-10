use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let damage = 1;
    let owner = game.owner(my_id);
    let enemy_player = enemy(owner);
    let targets_to_damage = game.units(enemy_player);
    let leftmost = targets_to_damage.get(0);
    if let Some(leftmost) = leftmost {
      game.damage(*leftmost, damage, my_id).await;
    }
  }))
  .into()],
  on_play: None
});
