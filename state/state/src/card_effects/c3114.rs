use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_target,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game.damage(target, 2, my_id).await;
        // TODO make this reveal less information :/
        // shouldn't have to reveal is_spell for each card
        let hand_cards = game.hand_cards(owner);
        let left_and_right_units_in_hand = game
          .filter_cards(hand_cards, |card| card.is_unit())
          .await
          .into_iter()
          .first_last();

        let modifiers: Vec<_> = left_and_right_units_in_hand
          .clone()
          .flat_map(|card| {
            many![
              PhaseModifyCard {
                card,
                modifier: Modifier::ModifyPower(1, None),
                source: my_id
              },
              PhaseModifyCard {
                card,
                modifier: Modifier::ModifyHealth(1, None),
                source: my_id
              }
            ]
          })
          .collect();
        game.run_parallel(modifiers).await;
      })
    },
  }
});
