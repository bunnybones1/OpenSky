use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunrise!(|game, my_id, _| Box::pin(async move {
    let damage = 13;
    let enemy_player_hero = game.hero(enemy(game.owner(my_id))).id();
    game.damage(enemy_player_hero, damage, my_id).await;
  }))
  .into()],
  on_play: None
});
