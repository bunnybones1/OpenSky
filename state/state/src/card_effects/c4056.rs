use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let player_mana = game.player(owner).mana;
    if player_mana > 0 {
      game.change_power(my_id, player_mana.into()).await;
    }
  }))
  .into()],
  on_play: None
});
