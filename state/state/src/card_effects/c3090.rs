use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let hand_cards = game.hand_cards(owner);
    let left_and_right_units_in_hand = game
      .filter_cards(hand_cards, |card| card.is_unit())
      .await
      .into_iter()
      .first_last();
    let modifiers: Vec<_> = left_and_right_units_in_hand
      .clone()
      .flat_map(|card| {
        vec![
          PhaseModifyCard {
            card,
            modifier: Modifier::ModifyCost(-1),
            source: my_id,
          },
          PhaseModifyCard {
            card,
            modifier: Modifier::GrantTrait(Trait::Guard),
            source: my_id,
          },
        ]
      })
      .collect();
    game.run_parallel(modifiers).await;
  }))
  .into()],
  on_play: None
});
