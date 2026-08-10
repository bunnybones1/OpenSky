use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![
    unit_glory!(|game, my_id, _| Box::pin(async move {
      let enemy_hero = game.hero_id(enemy(game.owner(my_id)));
      game.damage(enemy_hero, 2, my_id).await;
    }))
    .into(),
    unit_death!(|game, my_id, _phase| Box::pin(async move {
      let enemy_hero = game.hero_id(enemy(game.owner(my_id)));
      game.damage(enemy_hero, 2, my_id).await;
    }))
    .into()
  ],
  on_play: None
});
