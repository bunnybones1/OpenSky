use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_glory!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let hero_id = game.hero_id(enemy(owner));
    game.damage(hero_id, 2, my_id).await;
  }))
  .into()],
  on_play: None
});
