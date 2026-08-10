use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let deck = game.deck_cards(owner);
        let hand = game.hand_cards(owner);
        let deck_size = deck.len();
        let hand_size = hand.len();
        game.dust_many(deck).await;
        game.dust_many(hand).await;
        for _ in 0..deck_size {
          let c = game.create_card(owner, BaseCard::C20018).await;
          game.modify_card(c, vec![Modifier::ModifyCost(-5)]).await;
          game.move_to_zone(c, Zone::Deck).await;
        }
        for _ in 0..hand_size {
          let c = game.create_card(owner, BaseCard::C20018).await;
          game.modify_card(c, vec![Modifier::ModifyCost(-5)]).await;
          game.move_to_zone(c, Zone::Hand { public: true }).await;
        }
      })
    },
  }
});
