use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_target,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game.damage(target, 2, my_id).await;
        let indexes_of_lowest_cost = game
          .lowest_stat_cards_in_hand_indexes(owner, |_, _| true, |c, _| c.cost)
          .await;
        let hand_cards = game.hand_cards(owner);
        let picked_index = if indexes_of_lowest_cost.len() > 1 {
          let mut rng = game.context().random().await;
          indexes_of_lowest_cost.choose(&mut rng)
        } else {
          indexes_of_lowest_cost.first()
        }
        .copied();
        if let Some(i) = picked_index {
          let picked_lowest_cost_unit_in_hand = hand_cards.get(i).unwrap();
          game.dust(picked_lowest_cost_unit_in_hand).await;
        }

        game.draw_any_card(owner).await;
      })
    },
  }
});
