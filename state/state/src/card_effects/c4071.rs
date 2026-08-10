use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::BeforeText, {
    OnPlayEffect::MaybeTargeted {
      does_target: targets::ally_unit,
      mutate: |game, my_id, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            let (attack, health) = {
              let c = my_id.instance(game, None).unwrap();

              (c.power, c.health)
            };
            game
              .modify_card(
                target,
                vec![
                  Modifier::GrantTrait(Trait::Guard),
                  Modifier::SetPower(attack),
                  Modifier::SetHealth(health),
                ],
              )
              .await;
          }
        })
      },
    }
  }))
});
