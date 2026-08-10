use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, player| {
      Box::pin(async move {
        let enemy_player = enemy(player);
        if !game.player_cards(enemy_player).hand().is_empty() {
          let right_most_hand_card = game.hand_cards(enemy_player).into_iter().last();
          if let Some(right_most_hand_card) = right_most_hand_card {
            game.move_to_zone(right_most_hand_card, Zone::Deck).await;
          }
        }
        game.draw_any_card(player).await;
      })
    },
  }
});
