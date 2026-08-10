use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::MaybeTargeted {
      does_target: targets::ally,
      mutate: |game, _, target, owner| {
        Box::pin(async move {
          if let Some(target) = target {
            game
              .modify_card_single(target, Modifier::ModifyHealth(2, None))
              .await;
          }
          game.change_max_mana(owner, 1).await;
        })
      },
    }
  }))
});
