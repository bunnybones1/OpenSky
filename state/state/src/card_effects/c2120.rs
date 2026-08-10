use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    game.change_mana_next_turn(owner, 1, my_id).await;
  }))
  .into()],
  on_play: None
});
