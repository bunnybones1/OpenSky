use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_glory!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let enemy_player = enemy(owner);
    let enemy_hero = game.hero_id(enemy_player);
    game.give_spell(enemy_hero, enchant::DAZED).await;
  }))
  .into()],
  on_play: None
});
