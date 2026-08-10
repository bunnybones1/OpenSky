use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let owner_hand = game.hand_cards(owner);
        let enemy_hand = game.hand_cards(enemy(owner));
        game.dust_many(owner_hand).await;
        game.dust_many(enemy_hand).await;
      })
    },
  }
});
