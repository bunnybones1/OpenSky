use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let left_enemy = game.enemy_field(owner).into_iter().next().unwrap();
    game.fight(my_id, left_enemy).await;
  }))
  .into()],
  on_play: None
});
