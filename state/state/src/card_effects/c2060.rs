use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    if game.player_cards(owner).deck() == 0 {
      game
        .conjure(owner, |c, _| c.element == Element::Water)
        .await;
    }
  }))
  .into()],
  on_play: None
});
