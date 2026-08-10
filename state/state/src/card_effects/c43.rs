use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, _my_id, owner| Box::pin(async move {
        let enemy = enemy(owner);
        let hand_cards = game.hand_cards(enemy);
        let highest_cost_in_hand = game.highest_cost_in_hand(enemy, |_| true).await;

        if let Some(highest_cost_in_hand) = highest_cost_in_hand {
          let highest_cost_card_in_hand = game
            .filter_cards(hand_cards, move |c| c.cost == highest_cost_in_hand)
            .await;
          if highest_cost_card_in_hand.len() == 0 {
            return;
          }

          let picked_spell = if highest_cost_card_in_hand.len() == 1 {
            highest_cost_card_in_hand[0]
          } else {
            let mut rng = game.context().random().await;
            *highest_cost_card_in_hand.choose(&mut rng).unwrap()
          };

          game
            .modify_card(picked_spell, vec![Modifier::ModifyCost(2)])
            .await;
          game.reveal_card(picked_spell).await;
        }
      })
    }
  ))
});
