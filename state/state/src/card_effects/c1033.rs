use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_glory!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    let hand_cards = game.hand_cards(owner);
    // TODO make this reveal less information :/
    // shouldn't have to reveal is_spell for each card
    let hand_fire_cards: Vec<_> = game
      .filter_cards(hand_cards, |c| c.element == Element::Fire && c.cost > 0)
      .await;

    if hand_fire_cards.is_empty() {
      return;
    }
    let mut random = game.context().random().await;
    let picked_fire_card = hand_fire_cards.iter().choose(&mut random);

    if let Some(picked_fire_card) = picked_fire_card {
      game
        .modify_card_single(picked_fire_card, Modifier::ModifyCost(-1))
        .await;
    }
  }))
  .into()],
  on_play: None
});
