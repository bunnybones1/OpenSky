use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    game.damage_many(&game.enemy_units(owner), 3, my_id).await;
  }))
  .into()],
  on_play: None
});
