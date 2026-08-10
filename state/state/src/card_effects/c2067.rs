use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.element == Element::Air,
    |game, my_id, _phase| Box::pin(async move {
      let player = game.owner(my_id);

      // TODO don't leak info here
      let high_cost_in_hand = game.highest_cost_in_hand(player, |_| true).await;
      game
        .mulligan_hand_with_filter(player, move |c| Some(c.cost) == high_cost_in_hand)
        .await;
    })
  )
  .into()],
  on_play: None
});
