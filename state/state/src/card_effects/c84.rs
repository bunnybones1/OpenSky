use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::MaybeTargeted {
      does_target: targets::any_unit,
      mutate: |game, _my_id, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            game
              .modify_card_single(target, Modifier::GrantTrait(Trait::Guard))
              .await;
          }
        })
      },
    }
  ))
});
