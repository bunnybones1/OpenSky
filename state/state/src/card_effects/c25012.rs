use super::effect_helpers::*;

intrinsic_effect!(Effect::HeroAbility {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, _, target, _| {
      Box::pin(async move {
        let owner = game.owner(target);
        game.kill(target).await;
        game.draw(owner, |c, _| c.is_spell()).await;
      })
    },
  }
});
