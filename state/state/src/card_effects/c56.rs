use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_target,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game.damage(target, 2, my_id).await;
        game.cleanup_dead_units().await;
        game.instantiate_and_summon(owner, BaseCard::C20003).await;
      })
    },
  }
});
