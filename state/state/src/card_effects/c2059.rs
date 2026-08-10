use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let enemy_player = enemy(owner);
        let player_hand_cards = game.hand_cards(owner);
        let enemy_hand_cards = game.hand_cards(enemy_player);
        for card_id in player_hand_cards {
          game.move_to_zone(card_id, Zone::Deck).await;
        }

        for _ in 0..5 {
          game.draw_any_card(owner).await;
        }

        for card_id in enemy_hand_cards {
          game.move_to_zone(card_id, Zone::Deck).await;
        }

        for _ in 0..5 {
          game.draw_any_card(enemy_player).await;
        }

        if game.player(owner).mana == 0 {
          game.change_mana(owner, 3).await;
        }
      })
    },
  }
});
