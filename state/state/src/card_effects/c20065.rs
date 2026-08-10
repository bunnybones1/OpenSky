use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let enemy_player = enemy(owner);
    let enemy_hero = game.hero_id(enemy_player);
    let damage = 2;
    game.damage(enemy_hero, damage, my_id).await;
  }))
  .into()],
  on_play: None
});
