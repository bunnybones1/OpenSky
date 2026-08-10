use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::MaybeTargeted {
      does_target: targets::any_hero,
      mutate: |game, _my_id, target, owner| {
        Box::pin(async move {
          if let Some(target) = target {
            let unit_count = game
              .units::<&CardInstance<SkyWeaver>>(game.owner(target))
              .len();
            for _ in 0..unit_count {
              game.instantiate_and_summon(owner, BaseCard::C20068).await;
            }
          }
        })
      },
    }
  ))
});
