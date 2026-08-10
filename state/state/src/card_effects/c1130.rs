use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_slay!(|game, my_id, _target| Box::pin(async move {
    game.ready(my_id).await;
  }))
  .into()],
  on_play: None
});
