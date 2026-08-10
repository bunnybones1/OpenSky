use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let player_mana = game.player(owner).mana;
    if player_mana >= 2 {
      game.draw_any_card(owner).await;
    }
  }))
  .into()],
  on_play: None
});
