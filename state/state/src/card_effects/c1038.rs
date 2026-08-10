use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let damage = 2;
        let enemy_player = enemy(owner);
        let targets_to_damage: Vec<_> = game.characters(enemy_player);
        game.damage_many(&targets_to_damage, damage, my_id).await;

        let hand_cards = game.hand_cards(enemy_player);
        let left_and_right_units_in_hand = game
          .filter_cards(hand_cards, |card| card.is_unit())
          .await
          .into_iter()
          .first_last();
        let modifiers: Vec<_> = left_and_right_units_in_hand
          .clone()
          .map(|card| PhaseModifyCard {
            card,
            modifier: Modifier::ModifyCost(1),
            source: my_id,
          })
          .collect();
        game.run_parallel(modifiers).await;
        game
          .reveal_card_many(&left_and_right_units_in_hand.collect_vec())
          .await;
      })
    },
  }
});
