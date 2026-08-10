use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_glory!(|game, my_id, _| Box::pin(async move {
    let enemy_player = enemy(game.owner(my_id));
    let targets_to_damage = game.characters(enemy_player);
    game.damage_many(&targets_to_damage, 3, my_id).await;
    game.change_max_mana(enemy_player, -1).await;
  }))
  .into()],
  on_play: None
});
