use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    game.change_max_mana(owner, 1).await;
  }))
  .into()],
  on_play: None
});
