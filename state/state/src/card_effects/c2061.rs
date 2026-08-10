use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        game.set_mana(owner, 0).await;
        for _ in 0..2u8 {
          game.draw(owner, |c, _| c.element == Element::Water).await;
        }
      })
    },
  }
});
