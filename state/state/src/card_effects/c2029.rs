use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(
    |_, card: CardInfo<SkyWeaver>| card.element == Element::Water,
    |game, my_id, _| {
      Box::pin(async move {
        let owner = game.owner(my_id);
        let hand_cards = game.hand_cards(owner);
        let first_last = game
          .filter_cards(hand_cards, |card| card.cost > 0)
          .await
          .into_iter()
          .first_last();
        for card in first_last {
          game.modify_card(card, vec![Modifier::ModifyCost(-1)]).await;
        }
      })
    }
  )
  .into()],
  on_play: None
});
