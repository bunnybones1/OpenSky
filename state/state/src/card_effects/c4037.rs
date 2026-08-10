use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        for _ in 0..2 {
          game.draw(owner, |c, _| c.cost == 1 && c.is_spell()).await;
        }
      })
    },
  }
});
