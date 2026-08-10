use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunrise!(|game, my_id, owner| Box::pin(async move {
    let enemy_hero = game.hero_id(enemy(owner));
    game.fight(my_id, enemy_hero).await;
  }))
  .into()],
  on_play: None
});
