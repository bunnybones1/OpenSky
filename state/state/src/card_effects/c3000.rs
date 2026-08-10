use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let modifiers: Vec<_> = game
      .units(owner)
      .into_iter()
      .flat_map(|card| {
        many![
          PhaseModifyCard {
            card,
            modifier: Modifier::ModifyPower(1, None),
            source: my_id
          },
          PhaseModifyCard {
            card,
            modifier: Modifier::ModifyHealth(1, None),
            source: my_id
          }
        ]
      })
      .collect();
    game.run_parallel(modifiers).await;

    let doom = game.create_card(owner, BaseCard::C3010).await;
    game.move_to_zone(doom, Zone::Deck).await;
  }))
  .into()],
  on_play: None
});
