use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let enemy_field_units = game.enemy_units::<InstanceID>(owner);
        for unit_id in enemy_field_units {
          game.change_power(unit_id, -1).await;
        }

        let enemy_hand_cards = game.hand_cards(enemy(owner));
        let enemy_hand_units = game
          .filter_cards(enemy_hand_cards, |card| card.is_unit())
          .await;
        game.reveal_card_many(&enemy_hand_units).await;
        for unit_id in &enemy_hand_units {
          game.change_power(*unit_id, -1).await;
        }
      })
    },
  }
});
