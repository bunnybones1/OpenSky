use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::MaybeTargeted {
      does_target: targets::enemy_unit,
      mutate: |game, my_id, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            game.give_spell(target, enchant::SILENCE).await;
            game.damage(target, 1, my_id).await;
          }
        })
      },
    }
  }))
});
