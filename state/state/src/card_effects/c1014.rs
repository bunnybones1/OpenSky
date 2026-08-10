use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        for _ in 0..2 {
          game.draw(owner, |c, _| c.element == Element::Air).await;
        }
        let owner = game.owner(my_id);
        let hand_cards = game.hand_cards(owner);
        // TODO make this reveal less information :/
        // shouldn't have to reveal is_spell for each card
        let mut hand_air_cards: Vec<_> = game
          .filter_cards(hand_cards, |c| c.element == Element::Air && c.cost > 0)
          .await;

        if hand_air_cards.is_empty() {
          return;
        }
        let mut random = game.context().random().await;
        let mut picked_air_cards = vec![];
        for _ in 0..2 {
          if !hand_air_cards.is_empty() {
            let (i, picked_spell) = hand_air_cards
              .iter()
              .enumerate()
              .choose(&mut random)
              .expect("Got None from choosing from a non-empty list...");

            picked_air_cards.push(*picked_spell);
            hand_air_cards.remove(i);
          }
        }
        let modifiers: Vec<_> = picked_air_cards
          .iter()
          .map(|card| PhaseModifyCard {
            card: *card,
            modifier: Modifier::ModifyCost(-1),
            source: my_id,
          })
          .collect();
        game.run_parallel(modifiers).await;
      })
    },
  }
});
