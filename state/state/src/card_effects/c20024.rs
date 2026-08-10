use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let hand_cards = game.hand_cards(owner);
        game.dust_many(hand_cards).await;

        let enemy_hand_size = game.player_cards(enemy(owner)).hand().len();
        for _ in 0..enemy_hand_size {
          game.draw_any_card(owner).await;
        }
      })
    },
  }
});
