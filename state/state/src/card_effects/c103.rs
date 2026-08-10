use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        game.draw(owner, |c, _| c.is_unit()).await;
        let my_rarity = game.reveal_from_card(my_id, |c| c.rarity).await;
        game
          .new_secret_cards_with_fakes(owner, |mut secret| {
            let deck_cards = secret.deck().clone();
            let secret_hand_cards = secret.hand().iter().flatten().copied().collect_vec();
            // iterate thru *every* card in deck
            // the only thing the opponent sees is that we've created X new cards
            // where X is the number of times we called create_card + new_fake_card
            // so if we call one or the other for every card we iterate thru,
            // they don't know how many cards do or don't match the filter.

            for deck_card_id in deck_cards {
              let card = secret.instance(deck_card_id).unwrap(); // safe to unwrap because all secret deck cards are in secret

              if card.is_unit() && card.attachment().is_none() {
                let spell = secret.create_card(enchant::ANIMA, Some(my_rarity));
                secret.attach_card(deck_card_id, spell).unwrap();
              } else {
                secret.new_fake_card();
              }
            }

            for hand_card_id in secret_hand_cards {
              let card = secret.instance(hand_card_id).unwrap(); // safe to unwrap because all secret hand cards are in secret

              if card.is_unit() && card.attachment().is_none() {
                let spell = secret.create_card(enchant::ANIMA, Some(my_rarity));
                secret.attach_card(hand_card_id, spell).unwrap();
              } else {
                secret.new_fake_card();
              }
            }
          })
          .await;

        let public_hand_units = game
          .player_cards(owner)
          .hand()
          .iter()
          .flatten()
          .filter(|card| {
            card.instance(game, None).unwrap().is_unit()
              && card.instance(game, None).unwrap().attachment().is_none()
          })
          .map_into()
          .collect_vec();
        game
          .give_spell_many(&public_hand_units, enchant::ANIMA)
          .await;
      })
    },
  }
});
