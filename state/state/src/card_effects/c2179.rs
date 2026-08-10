use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::Untargeted {
      mutate: |game, _my_id, _owner| Box::pin(async move {
        let all_units = game.all_units::<InstanceID>();
        for unit in all_units {
          let (power, health) = game
            .reveal_from_card(unit, |c| (c.instance().power, c.instance().health))
            .await;
          game
            .modify_card(
              unit,
              vec![Modifier::SetPower(health), Modifier::SetHealth(power)],
            )
            .await;
        }
      })
    }
  ))
});
