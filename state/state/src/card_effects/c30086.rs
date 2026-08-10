use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, _| Box::pin(async move {
    game.change_health(my_id, 1).await;
  }))
  .into()],
  on_play: None
});
