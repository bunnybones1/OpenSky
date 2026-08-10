use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let hand_cards = game.hand_cards(owner);
        let player_hand_air_cards = game
          .filter_cards(hand_cards, |c| c.element != Element::Air)
          .await;
        let amount = player_hand_air_cards.len() + 1;
        for card_id in player_hand_air_cards {
          game.move_to_zone(card_id, Zone::Deck).await;
        }

        for _ in 0..amount {
          game.draw(owner, |c, _| c.element == Element::Air).await;
        }
      })
    },
  }
});
