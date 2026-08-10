use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_glory!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    game
      .conjure_from_enemy(owner, |c, _| c.cost == 1 && c.is_spell())
      .await;
  }))
  .into()],
  on_play: None
});
