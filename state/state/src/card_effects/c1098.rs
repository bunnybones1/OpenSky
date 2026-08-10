use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let hand_cards = game.hand_cards(owner);
        for card in hand_cards {
          game.move_to_zone(card, Zone::Deck).await;
        }
        for _ in 0..3 {
          game.draw_any_card(owner).await;
        }
      })
    },
  }
});
