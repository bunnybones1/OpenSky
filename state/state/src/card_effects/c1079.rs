use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let front_and_back: Vec<_> = game.enemy_field(owner).into_iter().first_last().collect();
    for unit in front_and_back {
      game.damage(unit, 1, my_id).await;
    }
  }))
  .into()],
  on_play: None
});
