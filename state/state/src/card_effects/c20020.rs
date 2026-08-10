use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let element = target.instance(game, None).unwrap().element;

        game.kill(target).await;

        for _ in 0..2 {
          game.draw(owner, move |c, _| c.element == element).await;
        }
      })
    },
  }
});
