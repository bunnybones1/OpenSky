use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::MaybeTargeted {
      does_target: targets::enemy_unit,
      mutate: |game, _, target, owner| {
        Box::pin(async move {
          if let Some(target) = target {
            let my_hero = game.hero_id(owner);
            game.fight(my_hero, target).await;
          }
        })
      },
    }
  }))
});
