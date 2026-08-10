use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, _, owner| {
      Box::pin(async move {
        let top_dead_unit = game
          .graveyard::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .find(|c| c.is_unit())
          .map(|c| c.id());
        if let Some(target) = top_dead_unit {
          game.bounce(target).await;
        }
      })
    },
  }
});
