use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let lowest_hp_in_hand = game
      .lowest_stat_cards_in_hand_indexes(owner, |c, _| c.is_unit(), |c, _| c.health)
      .await;
    let picked = if lowest_hp_in_hand.is_empty() {
      None
    } else if lowest_hp_in_hand.len() == 1 {
      Some(lowest_hp_in_hand[0])
    } else {
      let mut rng = game.context().random().await;
      lowest_hp_in_hand.choose(&mut rng).copied()
    };
    if let Some(picked) = picked {
      let card = game.hand_card(owner, picked);
      game.berf(card, 2, 1).await;
    }
  }))
  .into()],
  on_play: None
});
