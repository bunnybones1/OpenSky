use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::MaybeTargeted {
      does_target: targets::enemy_unit,
      mutate: |game, _my_id, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            game.give_spell(target, BaseCard::C20048).await;
          }
        })
      },
    }
  }))
});
