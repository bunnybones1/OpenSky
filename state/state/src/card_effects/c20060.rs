use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally_unit,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let glizzy_count = game
          .graveyard::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .filter(|c| c.base() == &BaseCard::C20060)
          .count();

        for _ in 0..=glizzy_count {
          game.berf(target, 1, 1).await;
        }
      })
    },
  }
});
