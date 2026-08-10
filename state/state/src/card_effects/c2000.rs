use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let owner = game.owner(my_id);
    let hand_cards = game.hand_cards(owner);

    let highest_cost_hand_spell_cost = game.highest_cost_in_hand(owner, |c| c.is_spell()).await;

    if let Some(highest_cost) = highest_cost_hand_spell_cost {
      let filtered_highest_cost_spells = game
        .filter_cards(hand_cards, move |c| c.cost == highest_cost && c.is_spell())
        .await;

      let picked_spell = if filtered_highest_cost_spells.len() == 1 {
        filtered_highest_cost_spells[0]
      } else {
        let mut rng = game.context().random().await;
        *filtered_highest_cost_spells.choose(&mut rng).unwrap()
      };

      game
        .modify_card_single(picked_spell, Modifier::ModifyCost(-1))
        .await;
    }
  }))
  .into()],
  on_play: None
});
