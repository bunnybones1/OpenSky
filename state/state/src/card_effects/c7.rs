use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let hand_cards = game.hand_cards(owner);
    let discard_phases: Vec<_> = game
      .filter_cards(hand_cards, |c| c.element != Element::Fire)
      .await
      .into_iter()
      .map(|card| PhaseMoveToZone {
        zone: Zone::Dust { public: true },
        player: owner,
        card,
      })
      .collect();
    let draw_size = discard_phases.len();
    game.run_parallel(discard_phases).await;

    for _ in 0..draw_size {
      game.draw(owner, |c, _| c.element == Element::Fire).await;
    }
  }))
  .into()],
  on_play: None
});
