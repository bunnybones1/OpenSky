use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: Vec::new(),
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let hero_power = game.hero(owner).power;
        game
          .draw_into_play(owner, move |c, _| c.cost == hero_power)
          .await;
      })
    },
  }
});
