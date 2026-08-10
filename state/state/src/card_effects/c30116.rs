use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _my_id, owner| {
      Box::pin(async move {
        for _ in 0..2 {
          game.instantiate_and_summon(owner, BaseCard::C30112).await;
        }
      })
    },
  }
});
