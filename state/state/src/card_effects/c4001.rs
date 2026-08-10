use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_glory!(|game, my_id, _| Box::pin(async move {
    for _ in 0..5 {
      game
        .dust_top_dead_card(enemy(game.owner(my_id)), |_| true)
        .await;
    }
  }))
  .into()],
  on_play: None
});
