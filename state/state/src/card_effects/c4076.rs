use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let hand_cards = game.hand_cards(owner);
    // TODO make this reveal less information :/
    // shouldn't have to reveal is_spell for each card
    let mut hand_spells: Vec<_> = game
      .filter_cards(hand_cards, |c| c.is_spell() && c.cost > 0)
      .await;

    if hand_spells.is_empty() {
      return;
    }
    let mut random = game.context().random().await;
    let mut picked_spells = vec![];
    for _ in 0..2 {
      if !hand_spells.is_empty() {
        let (i, picked_spell) = hand_spells
          .iter()
          .enumerate()
          .choose(&mut random)
          .expect("Got None from choosing from a non-empty list...");

        picked_spells.push(*picked_spell);
        hand_spells.remove(i);
      }
    }
    let modifiers: Vec<_> = picked_spells
      .iter()
      .map(|card| PhaseModifyCard {
        card: *card,
        modifier: Modifier::ModifyCost(-1),
        source: my_id,
      })
      .collect();
    game.run_parallel(modifiers).await;
  }))
  .into()],
  on_play: None
});
