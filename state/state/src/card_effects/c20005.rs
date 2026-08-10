use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let hand_cards = game.hand_cards(owner);
        for card in hand_cards {
          game.modify_card(card, vec![Modifier::ModifyCost(-1)]).await;
        }

        game.mulligan_hand(owner).await;
      })
    },
  }
});
