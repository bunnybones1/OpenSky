use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        game.kill(target).await;
        game.change_mana(owner, 3).await;
      })
    },
  }
});
