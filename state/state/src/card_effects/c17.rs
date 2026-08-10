use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::MaybeTargeted {
      does_target: |g, s, o, i, c| targets::enemy(g, s, o, i, c) && {
        let traits = &c.instance(g, None).unwrap().traits;
        traits.contains(&Trait::Guard) || traits.contains(&Trait::Armor)
      },
      mutate: |game, _, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            game
              .modify_card(
                target,
                vec![
                  Modifier::RemoveTrait(Trait::Armor),
                  Modifier::RemoveTrait(Trait::Guard),
                ],
              )
              .await;
          }
        })
      },
    }
  ))
});
