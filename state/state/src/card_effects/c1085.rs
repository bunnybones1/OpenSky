use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        game.instantiate_and_summon(owner, BaseCard::C20003).await;
        game.instantiate_and_summon(owner, BaseCard::C20000).await;
        game.instantiate_and_summon(owner, BaseCard::C20013).await;
      })
    },
  }
});
