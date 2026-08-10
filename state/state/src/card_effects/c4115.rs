use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, _| {
      Box::pin(async move {
        let units = game.all_units();
        game.kill_many(units).await;
      })
    },
  }
});
