use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let unit = game
      .draw_low_cost(owner, (owner, Zone::Hand { public: false }), |c, _| {
        c.is_unit()
      })
      .await;
    if let Some(unit) = unit {
      let (health_gain, power_gain) = game.reveal_from_card(unit, |c| (c.health, c.power)).await;
      game
        .modify_card(
          my_id,
          vec![
            Modifier::ModifyHealth(health_gain.into(), None),
            Modifier::ModifyPower(power_gain.into(), None),
          ],
        )
        .await;
    }
  }))
  .into()],
  on_play: None
});
