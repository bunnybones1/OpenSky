use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::MaybeTargeted {
      does_target: targets::ally_unit,
      mutate: |game, _, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            game.give_spell(target, enchant::SHIELD).await;
            if target
              .instance(game, None)
              .unwrap()
              .traits
              .contains(&Trait::Guard)
            {
              game
                .modify_card(
                  target,
                  vec![
                    Modifier::ModifyHealth(1, None),
                    Modifier::ModifyPower(1, None),
                  ],
                )
                .await;
            }
          }
        })
      },
    }
  }))
});
