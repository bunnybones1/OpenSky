use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunrise!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    game
      .give_hand_cards(owner, |_| true, vec![Modifier::ModifyCost(-1)], my_id)
      .await;
  }))
  .into()],
  on_play: None
});
