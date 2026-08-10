use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_target,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game.damage(target, 1, my_id).await;
        game.add_to_hand(owner, BaseCard::C4157).await;
      })
    },
  }
});
