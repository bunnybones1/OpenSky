use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    if game.player(owner).mana == 0 {
      game.berf(my_id, 1, 1).await;
    }
  }))
  .into()],
  on_play: None
});
