use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::MaybeTargeted {
      does_target: targets::enemy_unit,
      mutate: |game, _, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            game.move_to_zone(target, Zone::Deck).await;
            game.give_spell(target, enchant::SILENCE).await;
          }
        })
      },
    }
  }))
});
