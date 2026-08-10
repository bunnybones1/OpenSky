use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, _| {
      Box::pin(async move {
        let units_with_2power_or_less: Vec<_> = game
          .all_units::<&CardInstance<SkyWeaver>>()
          .into_iter()
          .filter(|c| c.power <= 2)
          .map(|token| token.id())
          .collect();

        game.kill_many(units_with_2power_or_less).await;
      })
    },
  }
});
