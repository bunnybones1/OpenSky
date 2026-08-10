use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _| Box::pin(async move {
    game.draw(game.owner(my_id), |c, _| c.cost == 2).await;
  }))
  .into()],
  on_play: None
});
