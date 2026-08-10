use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    while game.player_cards(owner).hand().len() < 3 {
      game.draw_any_card(owner).await;
    }
  }))
  .into()],
  on_play: None
});
