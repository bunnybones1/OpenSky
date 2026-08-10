use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, _, target, _| {
      Box::pin(async move {
        game.kill(target).await;
        game.cleanup_dead_units().await;
        let owner = game.owner(target);
        for _ in 0..2 {
          game.instantiate_and_summon(owner, BaseCard::C20003).await;
        }
      })
    },
  }
});
