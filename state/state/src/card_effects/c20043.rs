use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        {
          let hand_cards = game.hand_cards(owner);
          let num_hand_cards = hand_cards.len();
          game.dust_many(hand_cards).await;
          for _ in 0..num_hand_cards {
            game.draw_any_card(owner).await;
          }
        }

        game
          .give_hand_cards(owner, |_| true, vec![Modifier::ModifyCost(-1)], my_id)
          .await;
      })
    },
  }
});
