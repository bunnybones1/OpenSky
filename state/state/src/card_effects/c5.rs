use super::effect_helpers::*;
intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        game.kill(target).await;
        game.cleanup_dead_units().await;
        game.instantiate_and_summon(owner, BaseCard::C35).await;
      })
    }
  }
});
