use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let hero = game.hero_id(owner);
        game.heal(hero, 10).await;
        for _ in 0..5 {
          game.conjure(owner, |_, _| true).await;
        }
      })
    },
  }
});
