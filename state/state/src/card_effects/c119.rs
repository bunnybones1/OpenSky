use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        game.draw(owner, |c, _| c.cost == 3).await;

        let hand_cards = game.hand_cards(owner);
        if game.reveal_if_any(hand_cards, |card| card.cost >= 7).await {
          game.draw(owner, |c, _| c.cost == 4).await;
        }
      })
    },
  }
});
