use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_slay!(|game, my_id, _target| Box::pin(async move {
    let owner = game.owner(my_id);
    game.draw_any_card(owner).await;
  }))
  .into()],
  on_play: None
});
