use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_glory!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    if !game.hand_is_full(owner) && game.is_alive_on_field(my_id) {
      game.bounce(my_id).await;
    }
  }))
  .into()],
  on_play: None
});
