use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _my_id, owner| {
      Box::pin(async move {
        game.add_to_hand(owner, BaseCard::C4157).await;
        game.add_to_hand(owner, BaseCard::C4157).await;
      })
    },
  }
});
