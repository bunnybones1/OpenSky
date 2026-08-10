use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    game
      .give_deck_cards(
        owner,
        |c| c.is_unit() && c.cost >= 7,
        vec![Modifier::ModifyCost(-1)],
        my_id,
      )
      .await;
    game
      .give_hand_cards(
        owner,
        |c| c.is_unit() && c.cost >= 7,
        vec![Modifier::ModifyCost(-1)],
        my_id,
      )
      .await;
  }))
  .into()],
  on_play: None
});
