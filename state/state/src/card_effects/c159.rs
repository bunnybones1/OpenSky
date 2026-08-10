use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _my_id, owner| {
      Box::pin(async move {
        game.draw(owner, |c, _| c.element == Element::Earth).await;
        game.draw(owner, |c, _| c.element == Element::Metal).await;
      })
    },
  }
});
