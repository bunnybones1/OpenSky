use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::MaybeTargeted {
      does_target: targets::ally_unit,
      mutate: |game, _, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            game
              .modify_card(target, vec![Modifier::GrantTrait(Trait::Lifesteal)])
              .await;
            game.give_spell(target, enchant::SHIELD).await;
          }
        })
      },
    }
  }))
});
